<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import WinFrame from './WinFrame.vue'
import { downloadCanvas } from '@/composables/useShortcuts'

const props = defineProps<{
    hasImage: boolean
    isProcessing: boolean
    pixelSize: number
    paletteName: string
    compareMode: boolean
    sourceImageData: ImageData | null
    baseImageData: ImageData | null
}>()

const emit = defineEmits<{
    fileLoaded: [file: File, canvas: HTMLCanvasElement]
    toggleCompare: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const statusMsg = ref('拖放图片以开始')

watch(() => props.isProcessing, (v) => {
    statusMsg.value = v ? '处理中...' : '就绪'
})

// Compare-mode visual: draw the cached source image directly into the canvas.
// We only re-paint when the mode flips or the underlying source data changes,
// so this stays O(canvas-size) rather than re-running the pipeline.
watch(
  [() => props.compareMode, () => props.sourceImageData, () => props.baseImageData, () => canvasRef.value],
  () => {
    if (!canvasRef.value) return
    const c = canvasRef.value
    const data = props.compareMode ? props.sourceImageData : props.baseImageData
    if (!data) return
    if (c.width !== data.width || c.height !== data.height) {
      c.width = data.width
      c.height = data.height
    }
    const ctx = c.getContext('2d')
    if (ctx) ctx.putImageData(data, 0, 0)
  },
  { immediate: true },
)

const statusText = computed(() => {
  if (props.isProcessing) return '处理中...'
  if (props.compareMode) return '对比：显示原图（松开 Space 恢复）'
  return '就绪'
})

function onDrop(e: DragEvent) {
    dragging.value = false
    const file = e.dataTransfer?.files[0]
    if (file && canvasRef.value) emit('fileLoaded', file, canvasRef.value)
}

function onAreaClick() {
    fileRef.value?.click()
}

function onFileChange(e:Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file && canvasRef.value) emit('fileLoaded', file, canvasRef.value)
    ;(e.target as HTMLInputElement).value = ''
}

function download() {
    downloadCanvas(canvasRef.value)
}

onMounted(() => {
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile()
                if (file && canvasRef.value) emit('fileLoaded', file, canvasRef.value)
                break
            }
        }
    })
})

defineExpose({ canvasRef })
</script>

<template>
    <WinFrame title="预览" :body-style=" { padding: '0',display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0'}">
        <template #menubar>
            <div class="menubar">
                <span>文件(F)</span>
                <span>编辑(E)</span>
                <span>视图(V)</span>
                <span>帮助(H)</span>
            </div>
        </template>

        <!--画布区-->
        <div
          class="canvas-area"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
          @click="onAreaClick"
          :class="{ dragging, comparing: compareMode }"
        >
            <div v-if="!hasImage" class="drop-hint">
                拖放图片到此处<br>或点击选择文件
            </div>
            <canvas
              v-show="hasImage"
              ref="canvasRef"
              class="pixel-canvas"
            />
            <div v-if="isProcessing" class="processing">
                <span>PROCESSING...</span>
            </div>
            <div v-if="compareMode && hasImage" class="compare-badge">原图</div>
        </div>

        <template #footer>
            <div class="actions">
                <button class="action-btn" :disabled="!hasImage" @click="download">↓ 下载 PNG</button>
                <button class="action-btn" @click="onAreaClick">打开图片</button>
                <button
                  class="action-btn"
                  :class="{ active: compareMode }"
                  :disabled="!hasImage"
                  @click="$emit('toggleCompare')"
                >👁 对比</button>
            </div>
            <div class="statusvar">
                <span class="status-cell status-msg">{{ statusText }}</span>
                <span class="status-cell">{{ pixelSize }}px</span>
                <span class="status-cell">{{ paletteName }}</span>
            </div>
        </template>
    </WinFrame>

    <input ref="fileRef" type="file" accept="image/*" style="display:none" @change="onFileChange">
</template>

<style scoped>
.menubar {
  padding: 2px 8px;
  display: flex;
  gap: 14px;
  border-bottom: 1px solid #808080;
  font-size: 11px;
  cursor: default;
}

.canvas-area {
  flex: 1;
  background: #000;
  box-shadow: var(--shadow-in);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  min-height: 0;
  transition: outline 0.1s;
}

.canvas-area.dragging {
  outline: 2px dashed #fff;
}

.canvas-area.comparing {
  outline: 2px solid #ffaa00;
}

.drop-hint {
  color: #808080;
  text-align: center;
  line-height: 2;
  font-size: 12px;
}

.pixel-canvas {
  image-rendering: pixelated;
  max-width: 100%;
  max-height: 100%;
  display: block;
}

.processing {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  letter-spacing: 2px;
  z-index: 10;
}

.compare-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: #ffaa00;
  color: #000;
  font-size: 10px;
  padding: 2px 6px;
  letter-spacing: 1px;
  box-shadow: 1px 1px 0 #000;
  pointer-events: none;
  z-index: 5;
}

.actions {
  padding: 4px 6px;
  display: flex;
  gap: 4px;
  border-top: 1px solid #808080;
}

.action-btn {
  background: var(--win-bg);
  border: none;
  padding: 5px 14px;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  box-shadow: var(--shadow-out);
  color: #000;
  letter-spacing: 1px;
}

.action-btn.active {
  background: #000080;
  color: #fff;
  box-shadow: var(--shadow-in);
}

.action-btn:active { box-shadow: var(--shadow-in); }
.action-btn:disabled { color: #808080; cursor: default; box-shadow: var(--shadow-border); }

.statusbar {
  padding: 2px 6px;
  display: flex;
  gap: 4px;
  font-size: 10px;
  border-top: 1px solid #808080;
}

.status-cell {
  box-shadow: var(--shadow-in);
  padding: 1px 8px;
}

.status-msg { flex: 1; }
</style>
