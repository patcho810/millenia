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
            @update:display-pixel-size="converter.displayPixelSize.value = $event; converter.reconvert(getCanvas())"
            @update:stage="(stageId, patch) => { converter.updateStage(stageId, patch); converter.reconvert(getCanvas()) }"
            @update:palette-key="converter.paletteKey.value = $event; converter.reconvert(getCanvas())"
          />
          <!--
          <AdjustControl
            v-model="converter.adjust"
            :palette-size="converter.currentPalette.value?.colors.length ?? 0"
            @update:model-value="converter.reconvert(getCanvas())"
          />
          -->
          <!--
          <FxControl
            v-model="converter.fx"
            @toggle="(key) => converter.toggleFx(key, getCanvas())"
          />
          -->
        </WinFrame>

        <StylePresets
          :presets="presets"
          :apply-preset="(p) => converter.applyPreset(p, getCanvas())"
        />

        <WinFrame title="调色板" :body-style="{ padding: '6px' }">
          <PalettePanel
            :palettes="converter.palettes"
            v-model="converter.paletteKey.value"
            :disabled="false"
            @update:model-value="converter.reconvert(getCanvas())"
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
        @file-loaded="(file, canvas) => converter.loadImageFile(file, canvas)"
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

// 自定义调色板弹窗状态
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
