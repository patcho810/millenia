<template>
  <div id="app">
    <div class="workspace">
      <!-- 左侧控制 -->
      <div class="left-panel">
        <WinFrame title="Pixel.exe">
          <PipelineControl
            :stages="converter.stages.value"
            :display-pixel-size="converter.displayPixelSize.value"
            :palette-key="converter.paletteKey.value"
            :palettes="converter.palettes"
            @update:display-pixel-size="onPixelSizeUpdate"
            @update:stage="onStageUpdate"
            @update:palette-key="onPaletteKeyUpdate"
          />
        </WinFrame>

        <StylePresets
          :presets="presets"
          :user-presets="converter.userPresets.value"
          :apply-preset="applyPreset"
          :save-preset="saveUserPreset"
          :delete-user-preset="deleteUserPreset"
        />

        <WinFrame title="调色板" :body-style="{ padding: '6px' }">
          <PalettePanel
            :palettes="converter.palettes"
            v-model="converter.paletteKey.value"
            :disabled="false"
            @update:model-value="onPaletteKeyUpdate"
            @open-custom="openCustomModal()"
          />
        </WinFrame>
      </div>

      <!-- 右侧预览 -->
      <PreviewPanel
        ref="previewRef"
        class="preview-panel"
        :has-image="converter.hasImage.value"
        :is-processing="converter.isProcessing.value"
        :pixel-size="converter.displayPixelSize.value"
        :palette-name="converter.currentPalette.value?.name ?? ''"
        :compare-mode="converter.compareMode.value"
        :source-image-data="converter.imageState.value.sourceImageData"
        :base-image-data="converter.imageState.value.baseImageData"
        @file-loaded="onFileLoaded"
        @toggle-compare="converter.compareMode.value = !converter.compareMode.value"
      />
    </div>

    <Taskbar />

    <CustomPaletteModal
      :visible="modalVisible"
      :edit-key="modalEditKey"
      :edit-name="modalEditName"
      :edit-colors="modalEditColors"
      @close="modalVisible = false"
      @apply="onCustomApply"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { usePipeline } from '@/composables/usePipeline'
import { useShortcuts, downloadCanvas } from '@/composables/useShortcuts'
import type { RGB } from '@/types'
import type { PipelinePreset } from '@/pipeline/types'
import { BUILTIN_PRESETS } from '@/data/presets'

import WinFrame from '@/components/WinFrame.vue'
import PipelineControl from '@/components/PipelineControl.vue'
import PalettePanel from '@/components/PalettePanel.vue'
import PreviewPanel from '@/components/PreviewPanel.vue'
import CustomPaletteModal from '@/components/CustomPaletteModal.vue'
import Taskbar from '@/components/Taskbar.vue'
import StylePresets from '@/components/StylePresets.vue'

const converter = usePipeline()
const previewRef = ref<InstanceType<typeof PreviewPanel> | null>(null)
const presets = BUILTIN_PRESETS

function getCanvas(): HTMLCanvasElement {
  return previewRef.value!.canvasRef!
}

function onPixelSizeUpdate(v: number) {
  converter.displayPixelSize.value = v
  converter.reconvert(getCanvas())
}
function onStageUpdate(stageId: string, patch: Record<string, unknown>) {
  converter.updateStage(stageId as never, patch as never)
  converter.reconvert(getCanvas())
}
function onPaletteKeyUpdate(key: string) {
  converter.paletteKey.value = key
  converter.reconvert(getCanvas())
}
function onFileLoaded(file: File, canvas: HTMLCanvasElement) {
  converter.loadImageFile(file, canvas)
}

function applyPreset(p: PipelinePreset) {
  converter.applyPreset(p, getCanvas())
}
function saveUserPreset(name: string) {
  converter.saveCurrentAsPreset(name)
}
function deleteUserPreset(id: string) {
  converter.deleteUserPreset(id)
}

// ---- C5: keyboard shortcuts ----
useShortcuts({
  onToggleCompare: () => {
    if (!converter.hasImage.value) return
    converter.compareMode.value = !converter.compareMode.value
  },
  onDownload: () => {
    downloadCanvas(previewRef.value?.canvasRef ?? null)
  },
  onUndo: () => converter.undo(),
  onRedo: () => converter.redo(),
  onApplyPresetAt: (i) => {
    const all: PipelinePreset[] = [...presets, ...converter.userPresets.value]
    const p = all[i - 1]
    if (p) applyPreset(p)
  },
  onPixelSizeDelta: (delta) => {
    converter.adjustPixelSize(delta)
  },
  onToggleDither: () => converter.toggleDither(),
})

// ---- Custom palette modal state ----
const modalVisible = ref(false)
const modalEditKey = ref<string | undefined>(undefined)
const modalEditName = ref<string | undefined>(undefined)
const modalEditColors = ref<RGB[] | undefined>(undefined)

function openCustomModal(key?: string) {
  modalEditKey.value = key
  if (key && converter.palettes[key]) {
    modalEditName.value = converter.palettes[key].name
    modalEditColors.value = converter.palettes[key].colors
  } else {
    modalEditName.value = undefined
    modalEditColors.value = undefined
  }
  modalVisible.value = true
}

function onCustomApply(key: string, name: string, colors: RGB[]) {
  converter.addCustomPalette(key, name, colors)
  converter.paletteKey.value = key
  converter.reconvert(getCanvas())
  modalVisible.value = false
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=DotGothic16&display=swap');

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --font: 'DotGothic16', 'Courier New', monospace;
  --win-bg: #c0c0c0;
  --shadow-out: inset -1px -1px 0 #000, inset 1px 1px 0 #dfdfdf, inset -2px -2px 0 #808080, inset 2px 2px 0 #ffffff;
  --shadow-in:  inset 1px 1px 0 #000, inset -1px -1px 0 #dfdfdf, inset 2px 2px 0 #808080, inset -2px -2px 0 #ffffff;
  --shadow-border: inset -1px -1px 0 #808080, inset 1px 1px 0 #fff;
  --titlebar-grad: linear-gradient(90deg, #000080, #1084d0);
}

html, body, #app {
  width: 100%;
  height: 100%;
  background: #008080;
  font-family: var(--font);
  font-size: 12px;
  color: #000;
  overflow: hidden;
  user-select: none;
}

#app {
  display: flex;
  flex-direction: column;
}

.workspace {
  flex: 1;
  display: flex;
  gap: 8px;
  padding: 12px 12px 0;
  overflow: hidden;
  min-height: 0;
}

.left-panel {
  width: 240px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  flex-shrink: 0;
}

.preview-panel {
  flex: 1;
  min-width: 0;
}

::-webkit-scrollbar { width: 14px; }
::-webkit-scrollbar-track { background: var(--win-bg); box-shadow: var(--shadow-in); }
::-webkit-scrollbar-thumb { background: var(--win-bg); box-shadow: var(--shadow-out); }
</style>
