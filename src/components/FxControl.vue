<template>
  <div>
    <p class="section-label">FX</p>
    <div class="fx-btns">
      <button
        v-for="btn in fxList"
        :key="btn.key"
        class="fx-btn"
        :class="{ active: modelValue[btn.key] }"
        @click="toggle(btn.key)"
      >{{ btn.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FxKey, FxState } from '@/types'

const props = defineProps<{ modelValue: FxState }>()
const emit = defineEmits<{ 'update:modelValue': [v: FxState]; toggle: [key: FxKey] }>()

const fxList: { key: FxKey; label: string }[] = [
  { key: 'glitch',       label: '故障' },
  { key: 'crt',          label: 'CRT' },
  { key: 'paletteCycle', label: '色循环' },
  { key: 'ghost',        label: '残影' },
  { key: 'ditherFade',   label: '抖动' },
]

function toggle(key: FxKey) {
  emit('update:modelValue', { ...props.modelValue, [key]: !props.modelValue[key] })
  emit('toggle', key)
}
</script>

<style scoped>
.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
  margin-top: 8px;
}

.fx-btns {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.fx-btn {
  background: var(--win-bg);
  border: none;
  padding: 4px 8px;
  font-family: var(--font);
  font-size: 10px;
  cursor: pointer;
  box-shadow: var(--shadow-border);
  color: #000;
}

.fx-btn.active {
  background: #000080;
  color: #fff;
  box-shadow: var(--shadow-in);
}
</style>
