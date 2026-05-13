<template>
  <div>
    <button class="toggle-btn" @click="open = !open">
      {{ open ? '▼' : '▶' }} ADJUST
    </button>
    <div v-show="open" class="adjust-body">
      <div v-for="s in sliders" :key="s.key" class="slider-row">
        <div class="slider-header">
          <span>{{ s.label }}</span>
          <span>{{ formatVal(s.key) }}</span>
        </div>
        <input
          type="range"
          :min="s.min"
          :max="s.max"
          :step="s.step"
          :value="modelValue[s.key]"
          @input="onInput(s.key, ($event.target as HTMLInputElement).valueAsNumber)"
        >
      </div>
      <p v-if="paletteSize != null && paletteSize > 16 && paletteSize <= 32" class="dither-hint">当前调色板已自动降低抖动强度</p>
      <p v-else-if="paletteSize != null && paletteSize >= 33" class="dither-hint">当前调色板已禁用抖动</p>

      <p class="section-label">块大小</p>
      <div class="btn-group">
        <button
          v-for="bs in blockSizes"
          :key="bs.value"
          class="retro-btn"
          :class="{ active: modelValue.blockSize === bs.value }"
          @click="onInput('blockSize', bs.value)"
        >{{ bs.label }}</button>
      </div>

      <div v-if="modelValue.blockSize > 0" class="slider-row">
        <div class="slider-header">
          <span>块内最大色数</span>
          <span>{{ modelValue.blockMaxColors }}</span>
        </div>
        <input
          type="range"
          min="2"
          max="8"
          step="1"
          :value="modelValue.blockMaxColors"
          @input="onInput('blockMaxColors', ($event.target as HTMLInputElement).valueAsNumber)"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { AdjustState } from '@/types'

const props = defineProps<{ modelValue: AdjustState; paletteSize?: number }>()
const emit = defineEmits<{ 'update:modelValue': [v: AdjustState] }>()

const open = ref(false)

const blockSizes = [
  { label: '关', value: 0 },
  { label: '4', value: 4 },
  { label: '8', value: 8 },
  { label: '16', value: 16 },
]

const sliders: {
  key: keyof AdjustState
  label: string
  min: number
  max: number
  step: number
  decimals?: number
}[] = [
  { key: 'dither',     label: '抖动',  min: 0,   max: 1,  step: 0.1, decimals: 1 },
  { key: 'erode',      label: '侵蚀',  min: 0,   max: 3,  step: 1 },
  { key: 'brightness', label: '亮度',  min: -60, max: 60, step: 5 },
  { key: 'contrast',   label: '对比度', min: -60, max: 60, step: 5 },
  { key: 'saturation', label: '饱和度', min: 0,   max: 2,  step: 0.1, decimals: 1 },
]

function formatVal(key: keyof AdjustState): string {
  const s = sliders.find(s => s.key === key)!
  const v = props.modelValue[key]
  return s.decimals ? Number(v).toFixed(s.decimals) : String(v)
}

function onInput(key: keyof AdjustState, value: number) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped>
.toggle-btn {
  background: none;
  border: none;
  font-family: var(--font);
  font-size: 10px;
  cursor: pointer;
  color: #000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin-bottom: 4px;
}

.adjust-body {
  margin-top: 4px;
}

.slider-row {
  margin-bottom: 6px;
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

.dither-hint {
  font-size: 9px;
  color: #888;
  margin: 2px 0 6px;
}

.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
  margin-top: 8px;
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
</style>
