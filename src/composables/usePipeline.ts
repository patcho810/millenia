import { ref, shallowRef, reactive, computed, watch } from 'vue'
import { PALETTES } from '@/data/palettes'
import { executePipeline } from '@/pipeline/executor'
import { postFxAlgorithms } from '@/pipeline/stages/postfx'
import { rgbToLab } from '@/pipeline/stages/shared'
import { STORAGE_KEYS, loadJSON, saveDebounced, saveJSON, removeKey } from '@/utils/persistence'
import type { RGB, FxKey, Palette, PaletteMap } from '@/types'
import type { StageNode, StageId, PipelinePreset } from '@/pipeline/types'

interface PersistedState {
  paletteKey: string
  displayPixelSize: number
  stages: StageNode[]
  compareMode: boolean
}

const DEFAULT_PALETTE_KEY = 'sora'
const DEFAULT_PIXEL_SIZE = 2
const DEFAULT_COMPARE = false

// Algorithms removed from the codebase. We migrate any persisted state that
// references them so users with old localStorage data don't end up with a
// silently-broken pipeline after upgrade.
const REMOVED_ALGORITHMS: Record<string, string> = {
  'lanczos': 'bicubic',          // scale
  'bayer-2x2': 'bayer-4x4',      // dither
  'box-blur': 'gaussian-blur',   // preprocess (sub-algorithm)
}

function migrateStages(stages: StageNode[]): StageNode[] {
  return stages.map((s) => {
    let algorithm = s.algorithm
    let enabled = s.enabled
    const params = { ...s.params }

    // palette stage: 'fixed' was the no-op "use currentPalette" alias for
    // enabled:false. The new UI uses algorithm:'none' for that.
    if (s.stageId === 'palette' && algorithm === 'fixed') {
      algorithm = 'none'
      enabled = false
    }

    if (s.stageId === 'dither' && algorithm === 'bayer-2x2') {
      algorithm = 'bayer-4x4'
    }
    if (s.stageId === 'scale' && algorithm === 'lanczos') {
      algorithm = 'bicubic'
    }

    // preprocess stores its active sub-algorithms as a comma-separated list
    // in params['algorithms'].
    if (s.stageId === 'preprocess') {
      const raw = params['algorithms'] as string | undefined
      if (raw) {
        const list = raw.split(',').filter(Boolean)
        const migrated = list.map((a) => REMOVED_ALGORITHMS[a] ?? a)
        if (migrated.join(',') !== list.join(',')) {
          params['algorithms'] = migrated.join(',')
        }
      }
    }

    return { ...s, algorithm, enabled, params }
  })
}

function defaultStages(): StageNode[] {
  return [
    { stageId: 'preprocess',    enabled: false, algorithm: 'none', params: {} },
    { stageId: 'scale',         enabled: false, algorithm: 'none', params: {} },
    { stageId: 'palette',       enabled: false, algorithm: 'none', params: {} },
    { stageId: 'palette-post',  enabled: false, algorithm: 'none', params: {
      shadowColor: '#6644aa', shadowStrength: 0,
      highlightColor: '#ffdd88', highlightStrength: 0, midpoint: 50,
    }},
    { stageId: 'quantize',      enabled: false, algorithm: 'none', params: {} },
    { stageId: 'block',         enabled: false, algorithm: 'none', params: {} },
    { stageId: 'dither',        enabled: false, algorithm: 'none', params: {} },
    { stageId: 'postfx',        enabled: false, algorithm: 'none', params: {} },
  ]
}

export function usePipeline() {
  // ---- Custom palettes: merge persisted over built-in ----
  const persistedCustomPalettes = loadJSON<Record<string, Palette>>(
    STORAGE_KEYS.customPalettes,
    {},
  )
  const palettes = reactive<PaletteMap>({ ...PALETTES, ...persistedCustomPalettes })

  // ---- Pipeline state: load persisted, fall back to defaults ----
  const persistedState = loadJSON<Partial<PersistedState>>(
    STORAGE_KEYS.pipelineState,
    {},
  )
  const displayPixelSize = ref<number>(
    typeof persistedState.displayPixelSize === 'number' ? persistedState.displayPixelSize : DEFAULT_PIXEL_SIZE,
  )
  const paletteKey = ref<string>(persistedState.paletteKey ?? DEFAULT_PALETTE_KEY)
  const stages = ref<StageNode[]>(migrateStages(persistedState.stages ?? defaultStages()))
  const compareMode = ref<boolean>(persistedState.compareMode ?? DEFAULT_COMPARE)

  // ---- User presets ----
  const userPresets = ref<PipelinePreset[]>(
    loadJSON<PipelinePreset[]>(STORAGE_KEYS.userPresets, []).map((p) => ({
      ...p,
      stages: migrateStages(p.stages),
    })),
  )

  const currentPalette = computed(() => palettes[paletteKey.value])

  let paletteLabCache: [number, number, number][] = []

  function refreshPaletteLab() {
    const p = currentPalette.value
    paletteLabCache = p ? p.colors.map(c => rgbToLab(c[0], c[1], c[2])) : []
  }

  refreshPaletteLab()
  watch(paletteKey, refreshPaletteLab)

  // ---- Persist custom palettes whenever the map mutates ----
  // We persist only entries whose `custom` flag is true (set by addCustomPalette).
  function snapshotCustomPalettes(): Record<string, Palette> {
    const out: Record<string, Palette> = {}
    for (const [k, v] of Object.entries(palettes)) {
      if (v.custom) out[k] = v
    }
    return out
  }
  watch(
    () => snapshotCustomPalettes(),
    (next) => saveDebounced(STORAGE_KEYS.customPalettes, next),
    { deep: true },
  )

  // ---- Persist pipeline state (debounced) ----
  watch(
    [paletteKey, displayPixelSize, stages, compareMode],
    () => {
      const snap: PersistedState = {
        paletteKey: paletteKey.value,
        displayPixelSize: displayPixelSize.value,
        stages: JSON.parse(JSON.stringify(stages.value)) as StageNode[],
        compareMode: compareMode.value,
      }
      saveDebounced(STORAGE_KEYS.pipelineState, snap)
    },
    { deep: true },
  )

  // ---- Persist user presets whenever they change ----
  watch(
    userPresets,
    (next) => saveDebounced(STORAGE_KEYS.userPresets, JSON.parse(JSON.stringify(next))),
    { deep: true },
  )

  let sourceImg: HTMLImageElement | null = null
  // Scaled-down copy of the source at the same target size as the processed canvas,
  // used by C3 (compare mode) to render the original without re-running the pipeline.
  // shallowRef because ImageData is large and we replace it wholesale.
  const sourceImageData = shallowRef<ImageData | null>(null)
  const baseImageData = shallowRef<ImageData | null>(null)
  let fxTimer: ReturnType<typeof setInterval> | null = null
  let fxFrame = 0
  const isProcessing = ref(false)
  const hasImage = ref(false)

  let canvasCache: HTMLCanvasElement | null = null

  // ---- Lightweight undo/redo history (C5) ----
  // Snapshots the small set of values that constitute "a configuration":
  // paletteKey, displayPixelSize, and the full stages array.
  const HISTORY_LIMIT = 50
  interface HistoryEntry { paletteKey: string; displayPixelSize: number; stages: StageNode[] }
  const history = ref<HistoryEntry[]>([])
  const historyIndex = ref(-1)
  let suppressHistory = false

  function snapshot(): HistoryEntry {
    return {
      paletteKey: paletteKey.value,
      displayPixelSize: displayPixelSize.value,
      stages: JSON.parse(JSON.stringify(stages.value)) as StageNode[],
    }
  }
  function pushHistory() {
    if (suppressHistory) return
    // Drop any "future" entries past the cursor (standard editor behaviour).
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(snapshot())
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    historyIndex.value = history.value.length - 1
  }
  function restoreFromHistory(entry: HistoryEntry) {
    suppressHistory = true
    paletteKey.value = entry.paletteKey
    displayPixelSize.value = entry.displayPixelSize
    stages.value = JSON.parse(JSON.stringify(entry.stages)) as StageNode[]
    refreshPaletteLab()
    suppressHistory = false
  }
  function undo() {
    if (historyIndex.value <= 0) return
    historyIndex.value--
    restoreFromHistory(history.value[historyIndex.value]!)
  }
  function redo() {
    if (historyIndex.value >= history.value.length - 1) return
    historyIndex.value++
    restoreFromHistory(history.value[historyIndex.value]!)
  }
  // Record the initial state so the user can always go back to "nothing changed".
  pushHistory()
  // Record on stage / palette / pixel-size changes (but not on compareMode toggles).
  watch(
    [paletteKey, displayPixelSize, stages],
    () => {
      if (!suppressHistory) pushHistory()
    },
    { deep: true },
  )

  function updateStage(stageId: StageId, patch: Partial<StageNode>) {
    stages.value = stages.value.map(s => {
      if (s.stageId !== stageId) return s
      const merged = { ...s, ...patch }
      if (patch.params) {
        merged.params = 'algorithm' in patch
          ? { ...patch.params }
          : { ...s.params, ...patch.params }
      }
      return merged
    })
    if (canvasCache) reconvert(canvasCache)
  }

  function addCustomPalette(key: string, name: string, colors: RGB[]) {
    palettes[key] = { name, colors, custom: true }
    if (key === paletteKey.value) refreshPaletteLab()
  }

  function removeCustomPalette(key: string) {
    if (palettes[key]?.custom) {
      delete palettes[key]
      if (paletteKey.value === key) paletteKey.value = DEFAULT_PALETTE_KEY
    }
  }

  // ---- C6: user preset management ----
  function saveCurrentAsPreset(name: string): PipelinePreset {
    const id = `user-${Date.now().toString(36)}`
    const preset: PipelinePreset = {
      id,
      name: name.trim() || 'Untitled',
      paletteKey: paletteKey.value,
      pixelSize: displayPixelSize.value,
      stages: JSON.parse(JSON.stringify(stages.value)) as StageNode[],
    }
    userPresets.value = [...userPresets.value, preset]
    return preset
  }
  function deleteUserPreset(id: string) {
    userPresets.value = userPresets.value.filter(p => p.id !== id)
  }
  function clearAllPersisted() {
    removeKey(STORAGE_KEYS.customPalettes)
    removeKey(STORAGE_KEYS.pipelineState)
    removeKey(STORAGE_KEYS.userPresets)
  }

  function stopFx(ctx: CanvasRenderingContext2D | null) {
    if (fxTimer) { clearInterval(fxTimer); fxTimer = null }
    if (ctx && baseImageData.value) {
      ctx.putImageData(baseImageData.value, 0, 0)
    }
  }

  function startFx(ctx: CanvasRenderingContext2D, w: number, h: number) {
    fxFrame = 0
    fxTimer = setInterval(() => {
      if (!baseImageData.value) return
      ctx.putImageData(baseImageData.value, 0, 0)
      const postfx = stages.value.find(s => s.stageId === 'postfx')!
      postFxAlgorithms['combined']!(ctx, w, h, { ...postfx.params, pixelSize: displayPixelSize.value }, fxFrame, currentPalette.value?.colors)
      fxFrame++
    }, 120)
  }

  async function convert(canvas: HTMLCanvasElement) {
    if (!sourceImg) return
    canvasCache = canvas
    isProcessing.value = true

    const ctx = canvas.getContext('2d')!
    stopFx(ctx)

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(async () => {
        const palette = [...currentPalette.value!.colors]
        const paletteLab = [...paletteLabCache]

        const result = await executePipeline(
          sourceImg!,
          canvas,
          stages.value,
          palette,
          paletteLab,
          displayPixelSize.value,
        )
        baseImageData.value = result.processed

        // C3: upscale the small-canvas source snapshot to main canvas size so
        // PreviewPanel can swap between source/processed without resizing.
        const tmp = document.createElement('canvas')
        tmp.width = result.source.width
        tmp.height = result.source.height
        const tctx = tmp.getContext('2d')!
        tctx.putImageData(result.source, 0, 0)
        const upscaled = document.createElement('canvas')
        upscaled.width = canvas.width
        upscaled.height = canvas.height
        const uctx = upscaled.getContext('2d')!
        uctx.imageSmoothingEnabled = false
        uctx.drawImage(tmp, 0, 0, upscaled.width, upscaled.height)
        sourceImageData.value = uctx.getImageData(0, 0, upscaled.width, upscaled.height)

        isProcessing.value = false

        const postfxEnabled = stages.value.find(s => s.stageId === 'postfx')?.enabled ?? false
        if (postfxEnabled) startFx(ctx, canvas.width, canvas.height)
        resolve()
      }))
    })
  }

  async function loadImageFile(file: File, canvas: HTMLCanvasElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (file.type !== '' && !file.type.startsWith('image/')) { reject(new Error('not an image')); return }
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = async () => {
        sourceImg = img
        hasImage.value = true
        await convert(canvas)
        resolve()
      }
      img.onerror = reject
      img.src = url
    })
  }

  function toggleFx(key: FxKey, canvas: HTMLCanvasElement) {
    const postfx = stages.value.find(s => s.stageId === 'postfx')!
    const current = postfx.params
    const nextParams = { ...current, [key]: !current[key] }
    const anyEnabled = Object.values(nextParams).some(v => v === true)

    updateStage('postfx', {
      algorithm: 'combined',
      enabled: anyEnabled,
      params: { ...nextParams, pixelSize: displayPixelSize.value },
    })

    if (!hasImage.value) return
    const ctx = canvas.getContext('2d')!
    stopFx(ctx)
    if (anyEnabled) startFx(ctx, canvas.width, canvas.height)
  }

  // ---- C5 helpers ----
  function toggleDither() {
    const dither = stages.value.find(s => s.stageId === 'dither')!
    if (!dither) return
    if (dither.enabled) {
      updateStage('dither', { enabled: false, algorithm: 'none', params: { strength: 0, threshold: 0.5 } })
    } else {
      updateStage('dither', { enabled: true, algorithm: 'floyd-steinberg', params: { ...dither.params, strength: 0.8 } })
    }
  }
  function adjustPixelSize(delta: number) {
    const next = Math.max(1, Math.min(16, displayPixelSize.value + delta))
    displayPixelSize.value = next
  }

  let reconvertTimer: ReturnType<typeof setTimeout> | null = null

  function reconvert(canvas: HTMLCanvasElement) {
    if (reconvertTimer) clearTimeout(reconvertTimer)
    reconvertTimer = setTimeout(() => {
      if (hasImage.value) convert(canvas)
    }, 300)
  }

  function applyPreset(preset: PipelinePreset, canvas: HTMLCanvasElement) {
    paletteKey.value = preset.paletteKey
    displayPixelSize.value = preset.pixelSize
    stages.value = stages.value.map(s => {
      const match = preset.stages.find(ps => ps.stageId === s.stageId)
      if (match) {
        return {
          ...s,
          enabled: match.enabled,
          algorithm: match.algorithm,
          params: { ...match.params },
        }
      }
      return s
    })
    reconvert(canvas)
  }

  function getCanvas() {
    return { baseImageData, sourceImageData }
  }

  // Expose the underlying refs so consumers can read the current values reactively.
  // App.vue passes them into PreviewPanel; the PreviewPanel watcher fires when
  // either ref's value is replaced (which happens at the end of convert()).
  const imageState = computed(() => ({
    baseImageData: baseImageData.value,
    sourceImageData: sourceImageData.value,
  }))

  // Test/dev escape hatch: force-write current state to storage immediately.
  function _flushPersist() {
    saveJSON(STORAGE_KEYS.customPalettes, snapshotCustomPalettes())
    saveJSON(STORAGE_KEYS.pipelineState, {
      paletteKey: paletteKey.value,
      displayPixelSize: displayPixelSize.value,
      stages: JSON.parse(JSON.stringify(stages.value)) as StageNode[],
      compareMode: compareMode.value,
    } as PersistedState)
    saveJSON(STORAGE_KEYS.userPresets, JSON.parse(JSON.stringify(userPresets.value)))
  }

  return {
    stages,
    palettes,
    paletteKey,
    displayPixelSize,
    isProcessing,
    hasImage,
    currentPalette,
    compareMode,
    userPresets,
    imageState,
    updateStage,
    addCustomPalette,
    removeCustomPalette,
    loadImageFile,
    toggleFx,
    reconvert,
    applyPreset,
    getCanvas,
    saveCurrentAsPreset,
    deleteUserPreset,
    toggleDither,
    adjustPixelSize,
    undo,
    redo,
    canUndo: computed(() => historyIndex.value > 0),
    canRedo: computed(() => historyIndex.value < history.value.length - 1),
    clearAllPersisted,
    _flushPersist,
  }
}
