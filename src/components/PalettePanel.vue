<template>
  <div>
    <div class="palette-grid">
      <button
        v-for="(pal, key) in palettes"
        :key="key"
        class="palette-btn"
        :class="{ active: modelValue === key }"
        @click="$emit('update:modelValue', key)"
      >
        <div class="palette-preview">
          <span
            v-for="(color, i) in pal.colors.slice(0, 8)"
            :key="i"
            class="swatch"
            :style="{ background: `rgb(${color[0]},${color[1]},${color[2]})` }"
          />
        </div>
        <span class="pal-name">{{ pal.name }}</span>
      </button>
    </div>
    <button class="add-btn" @click="$emit('openCustom')">＋ 自定义调色板...</button>
  </div>
</template>

<script setup lang="ts">
import type { PaletteMap } from '@/types'

defineProps<{
  palettes: PaletteMap
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [key: string]
  'openCustom': []
}>()
</script>

<style scoped>
.palette-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3px;
}

.palette-btn {
  background: var(--win-bg);
  border: none;
  padding: 4px;
  font-family: var(--font);
  font-size: 9px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  box-shadow: var(--shadow-border);
  color: #000;
}

.palette-btn.active {
  background: #000080;
  color: #fff;
  box-shadow: var(--shadow-in);
}

.palette-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  justify-content: center;
}

.swatch {
  width: 6px;
  height: 6px;
  display: inline-block;
}

.pal-name {
  font-size: 9px;
}

.add-btn {
  margin-top: 6px;
  width: 100%;
  background: var(--win-bg);
  border: none;
  padding: 5px;
  font-family: var(--font);
  font-size: 10px;
  cursor: pointer;
  box-shadow: var(--shadow-out);
  color: #000;
  letter-spacing: 1px;
}

.add-btn:active {
  box-shadow: var(--shadow-in);
}
</style>
