<template>
  <div>
    <p class="section-label">SIZE</p>
    <div class="btn-group">
      <button
        v-for="s in sizes"
        :key="s"
        class="retro-btn"
        :class="{ active: displayPixelSize === s }"
        @click="$emit('update:displayPixelSize', s)"
      >{{ s }}px</button>
    </div>

    <p class="section-label">PIPELINE</p>

    <!-- ===== Preprocess: multi-select checkboxes ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Preprocess</span>
      </div>
      <div class="stage-params">
        <label v-for="a in preprocessAlgos" :key="a.id" class="pre-check">
          <input
            type="checkbox"
            :checked="preprocessActive.has(a.id)"
            @change="onPreAlgoToggle(a.id, ($event.target as HTMLInputElement).checked)"
          />
          <span>{{ a.label }}</span>
        </label>
        <div v-for="a in preprocessAlgos" :key="'p-'+a.id">
          <template v-if="preprocessActive.has(a.id) && getAlgoParams('preprocess', a.id).length > 0">
            <p class="pre-algo-title">{{ a.label }}</p>
            <div v-for="p in getAlgoParams('preprocess', a.id)" :key="p.key" class="param-row">
              <div class="slider-header">
                <span>{{ p.label }}</span>
                <span>{{ formatVal(preprocessAlgoParam(a.id, p.key), p.step) }}</span>
              </div>
              <input
                type="range"
                :min="p.min" :max="p.max" :step="p.step"
                :value="preprocessAlgoParam(a.id, p.key) ?? p.default"
                @input="onPreAlgoParam(a.id, p.key, ($event.target as HTMLInputElement).valueAsNumber)"
              />
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ===== Scale ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Scale</span>
        <select
          :value="scaleAlgo"
          @change="onAlgoChange('scale', ($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS['scale']" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>
      <div v-if="scaleAlgo !== 'none' && getStageParams('scale').length > 0" class="stage-params">
        <div v-for="p in getStageParams('scale')" :key="p.key" class="param-row">
          <div class="slider-header">
            <span>{{ p.label }}</span>
            <span>{{ formatVal(stageParam('scale', p.key), p.step) }}</span>
          </div>
          <input
            type="range" :min="p.min" :max="p.max" :step="p.step"
            :value="stageParam('scale', p.key) ?? p.default"
            @input="emitRange('scale', p.key, ($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>
      </div>
    </div>

    <!-- ===== Palette: conditional display ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Palette</span>
        <select
          :value="paletteAlgo"
          @change="onPaletteAlgoChange(($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS['palette']" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>
      <div v-if="paletteAlgo === 'fixed'" class="stage-params">
        <select
          :value="paletteKey"
          @change="$emit('update:paletteKey', ($event.target as HTMLSelectElement).value)"
          class="retro-select"
          style="max-width:100%"
        >
          <option v-for="k in paletteKeys" :key="k" :value="k">{{ palettes[k]?.name ?? k }}</option>
        </select>
      </div>
      <div v-else-if="isAdaptivePalette" class="stage-params">
        <div v-for="p in getStageParams('palette')" :key="p.key" class="param-row">
          <div class="slider-header">
            <span>{{ p.label }}</span>
            <span>{{ formatVal(stageParam('palette', p.key), p.step) }}</span>
          </div>
          <input
            type="range" :min="p.min" :max="p.max" :step="p.step"
            :value="stageParam('palette', p.key) ?? p.default"
            @input="emitRange('palette', p.key, ($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>
      </div>
    </div>

    <!-- ===== Palette Post ===== -->
    <div v-if="!isFixedPalette" class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Palette Post</span>
        <select
          :value="stageByKey('palette-post').algorithm"
          @change="onAlgoChange('palette-post', ($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS['palette-post']" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>
      <div v-if="ppAlgo !== 'none'" class="stage-params">
        <div v-for="p in getStageParams('palette-post')" :key="p.key" class="param-row">
          <template v-if="p.type === 'color'">
            <div class="slider-header"><span>{{ p.label }}</span></div>
            <input type="color"
              :value="String(stageParam('palette-post',p.key) ?? p.default)"
              @input="emitColor('palette-post',p.key,($event.target as HTMLInputElement).value)"
            />
          </template>
          <template v-else>
            <div class="slider-header">
              <span>{{ p.label }}</span>
              <span>{{ formatVal(stageParam('palette-post',p.key), p.step) }}</span>
            </div>
            <input type="range" :min="p.min" :max="p.max" :step="p.step"
              :value="stageParam('palette-post',p.key) ?? p.default"
              @input="emitRange('palette-post',p.key,($event.target as HTMLInputElement).valueAsNumber)"
            />
          </template>
        </div>
      </div>
    </div>

    <!-- ===== Quantize ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Quantize</span>
        <select
          :value="stageByKey('quantize').algorithm"
          @change="onAlgoChange('quantize', ($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS['quantize']" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>
    </div>

    <!-- ===== Block ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Block</span>
        <select
          :value="stageByKey('block').algorithm"
          @change="onAlgoChange('block', ($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS['block']" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>
      <div v-if="blockAlgo !== 'none'" class="stage-params">
        <div v-for="p in getStageParams('block')" :key="p.key" class="param-row">
          <div class="slider-header">
            <span>{{ p.label }}</span>
            <span>{{ formatVal(stageParam('block',p.key), p.step) }}</span>
          </div>
          <input type="range" :min="p.min" :max="p.max" :step="p.step"
            :value="stageParam('block',p.key) ?? p.default"
            @input="emitRange('block',p.key,($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>
      </div>
    </div>

    <!-- ===== Dither ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Dither</span>
        <select
          :value="stageByKey('dither').algorithm"
          @change="onAlgoChange('dither', ($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS['dither']" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>
      <div v-if="ditherAlgo !== 'none'" class="stage-params">
        <div v-for="p in getStageParams('dither')" :key="p.key" class="param-row">
          <div class="slider-header">
            <span>{{ p.label }}</span>
            <span>{{ formatVal(stageParam('dither',p.key), p.step) }}</span>
          </div>
          <input type="range" :min="p.min" :max="p.max" :step="p.step"
            :value="stageParam('dither',p.key) ?? p.default"
            @input="emitRange('dither',p.key,($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>
      </div>
    </div>

    <!-- ===== Post FX ===== -->
    <div class="stage-row">
      <div class="stage-header">
        <span class="stage-name">Post FX</span>
      </div>
      <div class="postfx-checks">
        <label v-for="fx in POSTFX_ITEMS" :key="fx.key" class="fx-check">
          <input type="checkbox"
            :checked="!!stageByKey('postfx').params[fx.key]"
            @change="onPostFxToggle(fx.key, stageByKey('postfx').params)"
          />
          <span>{{ fx.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import type { StageNode, StageId } from '@/pipeline/types'
import type { PaletteMap } from '@/types'

const props = defineProps<{
  stages: StageNode[]
  displayPixelSize: number
  paletteKey: string
  palettes: PaletteMap
}>()

const emit = defineEmits<{
  'update:displayPixelSize': [value: number]
  'update:stage': [stageId: StageId, patch: Partial<StageNode>]
  'update:paletteKey': [key: string]
}>()

const sizes = [2, 3, 4, 5]

const STAGE_LABELS: Record<StageId, string> = {
  preprocess: 'Preprocess',
  scale: 'Scale',
  palette: 'Palette',
  'palette-post': 'Palette Post',
  quantize: 'Quantize',
  block: 'Block',
  dither: 'Dither',
  postfx: 'Post FX',
}

const ALGOS: Record<Exclude<StageId, 'postfx'>, { id: string; label: string }[]> = {
  preprocess: [
    { id: 'none', label: 'None' },
    { id: 'gaussian-blur', label: 'Gaussian Blur' },
    { id: 'box-blur', label: 'Box Blur' },
    { id: 'sharpen', label: 'Sharpen' },
    { id: 'bcs', label: 'BCS' },
    { id: 'erode', label: 'Erode' },
    { id: 'bilateral', label: 'Bilateral Filter' },
  ],
  scale: [
    { id: 'nearest', label: 'Nearest' },
    { id: 'bilinear', label: 'Bilinear' },
    { id: 'bicubic', label: 'Bicubic' },
    { id: 'lanczos', label: 'Lanczos' },
  ],
  palette: [
    { id: 'fixed', label: 'Fixed' },
    { id: 'median-cut', label: 'Median Cut' },
    { id: 'wu', label: "Wu's Quantization" },
  ],
  'palette-post': [
    { id: 'none', label: 'None' },
    { id: 'split-toning', label: 'Split Toning' },
  ],
  quantize: [
    { id: 'nearest-lab', label: 'Nearest Lab' },
    { id: 'nearest-rgb', label: 'Nearest RGB' },
  ],
  block: [
    { id: 'none', label: 'None' },
    { id: 'tile-palette', label: 'Tile Palette' },
  ],
  dither: [
    { id: 'none', label: 'None' },
    { id: 'floyd-steinberg', label: 'Floyd-Steinberg' },
    { id: 'atkinson', label: 'Atkinson' },
    { id: 'bayer-2x2', label: 'Bayer 2\u00d72' },
    { id: 'bayer-4x4', label: 'Bayer 4\u00d74' },
    { id: 'bayer-8x8', label: 'Bayer 8\u00d78' },
  ],
}

const POSTFX_ITEMS: { key: string; label: string }[] = [
  { key: 'crt', label: 'CRT' },
  { key: 'glitch', label: 'Glitch' },
  { key: 'ghost', label: 'Ghost' },
  { key: 'paletteCycle', label: 'Palette Cycle' },
  { key: 'ditherFade', label: 'Dither Fade' },
]

interface ParamInfo {
  key: string
  label: string
  type?: 'range' | 'color'
  min: number
  max: number
  step: number
  default: number | string
}

const ALGO_PARAMS: Record<string, ParamInfo[]> = {
  'preprocess:gaussian-blur': [
    { key: 'radius', label: 'Radius', min: 0.5, max: 3, step: 0.5, default: 1 },
  ],
  'preprocess:box-blur': [
    { key: 'radius', label: 'Radius', min: 0.5, max: 3, step: 0.5, default: 1 },
  ],
  'preprocess:bcs': [
    { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 5, default: 0 },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 5, default: 0 },
    { key: 'saturation', label: 'Saturation', min: 0, max: 2, step: 0.1, default: 1 },
  ],
  'palette:median-cut': [
    { key: 'colors', label: 'Colors', min: 2, max: 64, step: 1, default: 16 },
  ],
  'palette-post:split-toning': [
    { key: 'shadowColor', label: 'Shadow', type: 'color', min: 0, max: 0, step: 0, default: '#6644aa' },
    { key: 'shadowStrength', label: 'Shadow Strength', min: 0, max: 1, step: 0.01, default: 0 },
    { key: 'highlightColor', label: 'Highlight', type: 'color', min: 0, max: 0, step: 0, default: '#ffdd88' },
    { key: 'highlightStrength', label: 'Highlight Strength', min: 0, max: 1, step: 0.01, default: 0 },
    { key: 'midpoint', label: 'Midpoint', min: 0, max: 100, step: 1, default: 50 },
  ],
  'block:tile-palette': [
    { key: 'blockSize', label: 'Block Size', min: 4, max: 32, step: 4, default: 4 },
    { key: 'maxColors', label: 'Max Colors', min: 2, max: 16, step: 1, default: 4 },
  ],
  'dither:floyd-steinberg': [
    { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.3 },
  ],
  'dither:atkinson': [
    { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.8 },
  ],
  'preprocess:erode': [
    { key: 'times', label: 'Times', min: 1, max: 3, step: 1, default: 1 },
  ],
  'preprocess:bilateral': [
    { key: 'radius', label: 'Radius', min: 1, max: 5, step: 1, default: 2 },
    { key: 'sigmaSpace', label: 'Sigma Space', min: 1, max: 30, step: 1, default: 10 },
    { key: 'sigmaColor', label: 'Sigma Color', min: 5, max: 80, step: 5, default: 30 },
  ],
  'palette:wu': [
    { key: 'colors', label: 'Colors', min: 2, max: 64, step: 1, default: 16 },
  ],
  'dither:bayer-2x2': [
    { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.8 },
    { key: 'threshold', label: 'Threshold', min: 0.1, max: 1, step: 0.05, default: 0.5 },
  ],
  'dither:bayer-4x4': [
    { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.8 },
    { key: 'threshold', label: 'Threshold', min: 0.1, max: 1, step: 0.05, default: 0.5 },
  ],
  'dither:bayer-8x8': [
    { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.8 },
    { key: 'threshold', label: 'Threshold', min: 0.1, max: 1, step: 0.05, default: 0.5 },
  ],
}

function algoKey(stageId: StageId, algoId: string): string {
  return `${stageId}:${algoId}`
}

function getAlgoParams(stageId: StageId, algoId: string): ParamInfo[] {
  return ALGO_PARAMS[algoKey(stageId, algoId)] ?? []
}

function getDefaultParams(stageId: StageId, algoId: string): Record<string, number | string> {
  const p: Record<string, number | string> = {}
  for (const d of getAlgoParams(stageId, algoId)) p[d.key] = d.default
  return p
}

function formatVal(value: string | number | boolean | undefined, step?: number): string {
  if (typeof value === 'string') return value
  const n = Number(value)
  if (Number.isNaN(n)) return String(value ?? '')
  return (step ?? 1) >= 1 ? String(n) : n.toFixed((step ?? 0.1) < 0.1 ? 2 : 1)
}

// --- helpers ---

const stageByKey = (id: StageId) => props.stages.find(s => s.stageId === id)!

const stageParam = (id: StageId, key: string) => stageByKey(id).params[key]

function getStageParams(id: StageId): ParamInfo[] {
  return getAlgoParams(id, stageByKey(id).algorithm)
}

function emitRange(stageId: StageId, key: string, value: number) {
  emit('update:stage', stageId, { params: { [key]: value } })
}

function emitColor(stageId: StageId, key: string, value: string) {
  emit('update:stage', stageId, { params: { [key]: value } })
}

function onAlgoChange(stageId: StageId, algoId: string) {
  const enabled = algoId !== 'none'
  emit('update:stage', stageId, {
    enabled,
    algorithm: algoId,
    params: enabled ? getDefaultParams(stageId, algoId) : { ...getDefaultParams(stageId, algoId) },
  })
}

// --- preprocess multi ---

const preprocessAlgos = ALGOS['preprocess'].filter(a => a.id !== 'none')

const preprocessActive = computed(() => {
  const s = props.stages.find(s => s.stageId === 'preprocess')
  const list = (s?.params['algorithms'] as string | undefined)?.split(',').filter(Boolean) ?? []
  return new Set(list)
})

function preprocessAlgoParam(algoId: string, key: string) {
  return stageByKey('preprocess').params[`algo_${algoId}_${key}`]
}

function onPreAlgoToggle(algoId: string, enabled: boolean) {
  const s = stageByKey('preprocess')
  const list = (s.params['algorithms'] as string | undefined)?.split(',').filter(Boolean) ?? []
  let next: string[]
  if (enabled) {
    next = list.includes(algoId) ? list : [...list, algoId]
  } else {
    next = list.filter(a => a !== algoId)
  }
  const nextParams: Record<string, number | string | boolean> = { ...s.params, algorithms: next.join(',') }
  if (enabled) {
    for (const [k, v] of Object.entries(getDefaultParams('preprocess', algoId))) {
      nextParams[`algo_${algoId}_${k}`] = v
    }
  }
  emit('update:stage', 'preprocess', {
    enabled: next.length > 0,
    params: nextParams,
  })
}

function onPreAlgoParam(algoId: string, key: string, value: number) {
  emit('update:stage', 'preprocess', {
    params: { [`algo_${algoId}_${key}`]: value },
  })
}

// --- palette ---

const paletteAlgo = computed(() => stageByKey('palette').algorithm)
const isFixedPalette = computed(() => paletteAlgo.value === 'fixed')
const isAdaptivePalette = computed(() => paletteAlgo.value === 'median-cut' || paletteAlgo.value === 'wu')

const paletteKeys = computed(() => Object.keys(props.palettes))

function onPaletteAlgoChange(algoId: string) {
  emit('update:stage', 'palette', {
    enabled: algoId !== 'none',
    algorithm: algoId,
    params: algoId !== 'none' ? getDefaultParams('palette', algoId) : stageByKey('palette').params,
  })
}

const ppAlgo = computed(() => stageByKey('palette-post').algorithm)
const blockAlgo = computed(() => stageByKey('block').algorithm)
const ditherAlgo = computed(() => stageByKey('dither').algorithm)
const scaleAlgo = computed(() => stageByKey('scale').algorithm)

// --- postfx ---

function onPostFxToggle(key: string, currentParams: StageNode['params']) {
  const nextParams = { ...currentParams, [key]: !currentParams[key] }
  const anyEnabled = Object.values(nextParams).some(v => v === true)
  emit('update:stage', 'postfx', {
    algorithm: 'combined',
    enabled: anyEnabled,
    params: { [key]: !currentParams[key] },
  })
}
</script>

<style scoped>
.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.btn-group {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.retro-btn {
  flex: 1;
  background: var(--win-bg);
  border: none;
  padding: 5px 0;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  text-align: center;
  box-shadow: var(--shadow-border);
  color: #000;
}
.retro-btn.active {
  background: #000080;
  color: #fff;
  box-shadow: var(--shadow-in);
}
.retro-btn:active { box-shadow: var(--shadow-in); }

.stage-row { margin-bottom: 6px; }
.stage-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}
.stage-header input[type='checkbox'] {
  cursor: pointer;
  accent-color: #000080;
}
.stage-name {
  font-size: 10px;
  white-space: nowrap;
  min-width: 64px;
}
.retro-select {
  flex: 1;
  font-family: var(--font);
  font-size: 10px;
  padding: 2px 4px;
  background: var(--win-bg);
  border: none;
  box-shadow: var(--shadow-border);
  color: #000;
  cursor: pointer;
  max-width: 120px;
}
.stage-params {
  margin-top: 2px;
  padding-left: 20px;
}
.param-row { margin-bottom: 4px; }
.slider-header {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  margin-bottom: 2px;
}
input[type='range'] {
  width: 100%;
  cursor: pointer;
  accent-color: #000080;
  height: 14px;
}

.pre-check {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  cursor: pointer;
  margin-bottom: 2px;
}
.pre-check input[type='checkbox'] {
  cursor: pointer;
  accent-color: #000080;
}
.pre-algo-title {
  font-size: 9px;
  font-weight: bold;
  color: #000080;
  margin: 2px 0 1px;
}

.postfx-checks {
  padding-left: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}
.fx-check {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  cursor: pointer;
  min-width: calc(50% - 2px);
}
.fx-check input[type='checkbox'] {
  cursor: pointer;
  accent-color: #000080;
}

</style>
