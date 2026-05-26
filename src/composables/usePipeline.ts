import { ref, reactive, computed, watch } from 'vue'
import { PALETTES } from '@/data/palettes'
import { executePipeline } from '@/pipeline/executor'
import { postFxAlgorithms } from '@/pipeline/stages/postfx'
import { rgbToLab } from '@/pipeline/stages/shared'
import type { RGB, FxKey, PaletteMap } from '@/types'
import type { StageNode, StageId, PipelinePreset } from '@/pipeline/types'

export function usePipeline() {
  const palettes = reactive<PaletteMap>({ ...PALETTES })

  const displayPixelSize = ref(2)
  const paletteKey = ref('sora')
  const stages = ref<StageNode[]>([
    { stageId: 'preprocess',    enabled: false, algorithm: 'none', params: {} },
    { stageId: 'scale',         enabled: false, algorithm: 'none', params: {} },
    { stageId: 'palette',       enabled: true,  algorithm: 'fixed', params: {} },
    { stageId: 'palette-post',  enabled: false, algorithm: 'none', params: {
      shadowColor: '#6644aa', shadowStrength: 0,
      highlightColor: '#ffdd88', highlightStrength: 0, midpoint: 50,
    }},
    { stageId: 'quantize',      enabled: false, algorithm: 'none', params: {} },
    { stageId: 'block',         enabled: false, algorithm: 'none', params: {} },
    { stageId: 'dither',        enabled: false, algorithm: 'none', params: {} },
    { stageId: 'postfx',        enabled: false, algorithm: 'none', params: {} },
  ])

  const currentPalette = computed(() => palettes[paletteKey.value])

  let paletteLabCache: [number, number, number][] = []

  function refreshPaletteLab() {
    const p = currentPalette.value
    paletteLabCache = p ? p.colors.map(c => rgbToLab(c[0], c[1], c[2])) : []
  }

  refreshPaletteLab()
  watch(paletteKey, refreshPaletteLab)

  let sourceImg: HTMLImageElement | null = null
  let baseImageData: ImageData | null = null
  let fxTimer: ReturnType<typeof setInterval> | null = null
  let fxFrame = 0
  const isProcessing = ref(false)
  const hasImage = ref(false)

  let canvasCache: HTMLCanvasElement | null = null

  function updateStage(stageId: StageId, patch: Partial<StageNode>) {
    stages.value = stages.value.map(s =>
      s.stageId === stageId ? { ...s, ...patch } : s
    )
    if (canvasCache) reconvert(canvasCache)
  }

  function addCustomPalette(key: string, name: string, colors: RGB[]) {
    palettes[key] = { name, colors, custom: true }
    if (key === paletteKey.value) refreshPaletteLab()
  }

  function removeCustomPalette(key: string) {
    if (palettes[key]?.custom) {
      delete palettes[key]
      if (paletteKey.value === key) paletteKey.value = 'sora'
    }
  }

  function stopFx(ctx: CanvasRenderingContext2D | null) {
    if (fxTimer) { clearInterval(fxTimer); fxTimer = null }
    if (ctx && baseImageData) {
      ctx.putImageData(baseImageData, 0, 0)
    }
  }

  function startFx(ctx: CanvasRenderingContext2D, w: number, h: number) {
    fxFrame = 0
    fxTimer = setInterval(() => {
      if (!baseImageData) return
      ctx.putImageData(baseImageData, 0, 0)
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

        baseImageData = await executePipeline(
          sourceImg!,
          canvas,
          stages.value,
          palette,
          paletteLab,
          displayPixelSize.value,
        )

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
    return { baseImageData }
  }

  return {
    stages,
    palettes,
    paletteKey,
    displayPixelSize,
    isProcessing,
    hasImage,
    currentPalette,
    updateStage,
    addCustomPalette,
    removeCustomPalette,
    loadImageFile,
    toggleFx,
    reconvert,
    applyPreset,
    getCanvas,
  }
}
