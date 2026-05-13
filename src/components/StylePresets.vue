<template>
  <WinFrame title="风格预设">
    <div class="preset-body">
      <button
        v-for="p in presets"
        :key="p.name"
        class="retro-btn"
        :class="{ active: isActive(p) }"
        @click="$emit('apply', p)"
      >{{ p.name }}</button>
    </div>
  </WinFrame>
</template>

<script setup lang="ts">
import WinFrame from './WinFrame.vue'
import { matchesPreset } from '@/composables/usePixelConverter'
import type { StylePreset, AdjustState, FxState } from '@/types'

const props = defineProps<{
  presets: StylePreset[]
  pixelSize: number
  paletteKey: string
  adjust: AdjustState
  fx: FxState
}>()

defineEmits<{ apply: [preset: StylePreset] }>()

function isActive(preset: StylePreset): boolean {
  return matchesPreset(preset, props.pixelSize, props.paletteKey, props.adjust, props.fx)
}
</script>

<style scoped>
.preset-body {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
  min-width: calc(50% - 2px);
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
