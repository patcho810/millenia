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
    <div v-for="s in stages" :key="s.stageId" class="stage-row">
      <div class="stage-header">
        <input type="checkbox" :checked="s.enabled" @change="onToggle(s.stageId, ($event.target as HTMLInputElement).checked)" />
        <span class="stage-name">{{ STAGE_LABELS[s.stageId] }}</span>
        <select
          v-if="s.stageId !== 'postfx'"
          :value="s.algorithm"
          @change="onAlgoChange(s.stageId, ($event.target as HTMLSelectElement).value)"
          class="retro-select"
        >
          <option v-for="a in ALGOS[s.stageId]" :key="a.id" :value="a.id">{{ a.label }}</option>
        </select>
      </div>

      <template v-if="s.stageId === 'postfx'">
        <div class="postfx-checks">
          <label v-for="fx in POSTFX_ITEMS" :key="fx.key" class="fx-check">
            <input
              type="checkbox"
              :checked="!!s.params[fx.key]"
              @change="onPostFxToggle(fx.key, s.params)"
            />
            <span>{{ fx.label }}</span>
          </label>
        </div>
      </template>

      <div v-else-if="s.enabled && s.stageId === 'palette-post' && s.algorithm === 'split-toning'" class="stage-params">
        <div class="param-row toning-row">
          <span class="toning-label">Shadow</span>
          <input
            type="color"
            class="toning-color"
            :value="String(s.params['shadowColor'] ?? '#6644aa')"
            @input="emitColor(s.stageId, 'shadowColor', ($event.target as HTMLInputElement).value)"
          />
          <input
            type="range"
            class="toning-slider"
            :min="0" :max="1" :step="0.01"
            :value="Number(s.params['shadowStrength'] ?? 0)"
            @input="emitRange(s.stageId, 'shadowStrength', ($event.target as HTMLInputElement).valueAsNumber)"
          />
          <span class="toning-val">{{ formatVal(s.params['shadowStrength'], 0.01) }}</span>
        </div>
        <div class="param-row toning-row">
          <span class="toning-label">Highlight</span>
          <input
            type="color"
            class="toning-color"
            :value="String(s.params['highlightColor'] ?? '#ffdd88')"
            @input="emitColor(s.stageId, 'highlightColor', ($event.target as HTMLInputElement).value)"
          />
          <input
            type="range"
            class="toning-slider"
            :min="0" :max="1" :step="0.01"
            :value="Number(s.params['highlightStrength'] ?? 0)"
            @input="emitRange(s.stageId, 'highlightStrength', ($event.target as HTMLInputElement).valueAsNumber)"
          />
          <span class="toning-val">{{ formatVal(s.params['highlightStrength'], 0.01) }}</span>
        </div>
        <div class="param-row">
          <div class="slider-header">
            <span>Midpoint</span>
            <span>{{ formatVal(s.params['midpoint'], 1) }}</span>
          </div>
          <input
            type="range"
            :min="0" :max="100" :step="1"
            :value="Number(s.params['midpoint'] ?? 50)"
            @input="emitRange(s.stageId, 'midpoint', ($event.target as HTMLInputElement).valueAsNumber)"
          />
        </div>
      </div>

      <div v-else-if="s.enabled" class="stage-params">
        <div v-for="p in getParams(s.stageId, s.algorithm)" :key="p.key" class="param-row">
          <template v-if="p.type === 'color'">
            <div class="slider-header">
              <span>{{ p.label }}</span>
            </div>
            <input
              type="color"
              :value="String(s.params[p.key] ?? p.default)"
              @input="emitColor(s.stageId, p.key, ($event.target as HTMLInputElement).value)"
            />
          </template>
          <template v-else>
            <div class="slider-header">
              <span>{{ p.label }}</span>
              <span>{{ formatVal(s.params[p.key], p.step) }}</span>
            </div>
            <input
              type="range"
              :min="p.min"
              :max="p.max"
              :step="p.step"
              :value="s.params[p.key] ?? p.default"
              @input="emitRange(s.stageId, p.key, ($event.target as HTMLInputElement).valueAsNumber)"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue'
import type { StageNode, StageId } from '@/pipeline/types'

const props = defineProps<{
  stages: StageNode[]
  displayPixelSize: number
}>()

const emit = defineEmits<{
  'update:displayPixelSize': [value: number]
  'update:stage': [stageId: StageId, patch: Partial<StageNode>]
  'palette-adaptive': [boolean]
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
    { id: 'blue-noise', label: 'Blue Noise' },
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
  'dither:blue-noise': [
    { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, default: 0.8 },
    { key: 'threshold', label: 'Threshold', min: 0.1, max: 1, step: 0.05, default: 0.5 },
  ],
}

function algoKey(stageId: StageId, algoId: string): string {
  return `${stageId}:${algoId}`
}

function getParams(stageId: StageId, algoId: string): ParamInfo[] {
  return ALGO_PARAMS[algoKey(stageId, algoId)] ?? []
}

function getDefaultParams(stageId: StageId, algoId: string): Record<string, number | string> {
  const params: Record<string, number | string> = {}
  for (const p of getParams(stageId, algoId)) {
    params[p.key] = p.default
  }
  return params
}

function formatVal(value: string | number | boolean | undefined, step?: number): string {
  if (typeof value === 'string') return value
  const n = Number(value)
  if (Number.isNaN(n)) return String(value ?? '')
  return (step ?? 1) >= 1 ? String(n) : n.toFixed((step ?? 0.1) < 0.1 ? 2 : 1)
}

function emitRange(stageId: StageId, key: string, value: number) {
  const stage = props.stages.find(s => s.stageId === stageId)!
  emit('update:stage', stageId, { params: { ...stage.params, [key]: value } })
}

function emitColor(stageId: StageId, key: string, value: string) {
  const stage = props.stages.find(s => s.stageId === stageId)!
  emit('update:stage', stageId, { params: { ...stage.params, [key]: value } })
}

function onToggle(stageId: StageId, checked: boolean) {
  if (stageId === 'postfx') {
    const stage = props.stages.find(s => s.stageId === 'postfx')!
    emit('update:stage', stageId, { enabled: checked, algorithm: checked ? 'combined' : 'none' })
  } else {
    emit('update:stage', stageId, { enabled: checked })
  }
}

function onAlgoChange(stageId: StageId, algoId: string) {
  emit('update:stage', stageId, {
    algorithm: algoId,
    params: getDefaultParams(stageId, algoId),
  })
}

function onPostFxToggle(key: string, currentParams: StageNode['params']) {
  const nextParams = { ...currentParams, [key]: !currentParams[key] }
  const anyEnabled = Object.values(nextParams).some(v => v === true)
  emit('update:stage', 'postfx', {
    algorithm: 'combined',
    enabled: anyEnabled,
    params: nextParams,
  })
}

const paletteStage = computed(() => props.stages.find(s => s.stageId === 'palette'))

function emitPaletteAdaptive() {
  const s = paletteStage.value
  emit('palette-adaptive', !!(s?.enabled && s?.algorithm === 'median-cut'))
}

watch(paletteStage, emitPaletteAdaptive, { deep: true })
onMounted(emitPaletteAdaptive)
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

.retro-btn:active {
  box-shadow: var(--shadow-in);
}

.stage-row {
  margin-bottom: 6px;
}

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

.param-row {
  margin-bottom: 4px;
}

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

.postfx-checks {
  padding-left: 20px;
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

.toning-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toning-label {
  font-size: 10px;
  min-width: 52px;
}

.toning-color {
  width: 28px;
  height: 18px;
  padding: 0;
  border: none;
  cursor: pointer;
  background: transparent;
}

.toning-slider {
  flex: 1;
  min-width: 0;
}

.toning-val {
  font-size: 9px;
  min-width: 28px;
  text-align: right;
}
</style>
