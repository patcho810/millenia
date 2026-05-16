<template>
  <Teleport to="body">
    <div v-if="visible" class="backdrop" @click.self="$emit('close')">
      <div class="modal">
        <div class="win-titlebar">
          <span class="win-title">自定义调色板</span>
          <div class="win-btns">
            <button class="win-btn" @click="$emit('close')">×</button>
          </div>
        </div>
        <div class="modal-body">
          <!-- 名称 -->
          <p class="section-label">名称</p>
          <input v-model="localName" class="text-input" placeholder="我的调色板" maxlength="20">

          <!-- 色块 -->
          <p class="section-label">
            颜色
            <span :class="['count', localColors.length < 2 ? 'warn' : '']">
              {{ localColors.length }} 色
            </span>
          </p>
          <div class="swatches">
            <div
              v-for="(color, i) in localColors"
              :key="i"
              class="swatch-wrap"
            >
              <button
                class="swatch"
                :style="{ background: `rgb(${color[0]},${color[1]},${color[2]})` }"
                :title="toHex(color)"
                @click="editColor(i)"
              />
              <button class="swatch-del" @click="removeColor(i)">×</button>
            </div>
          </div>
          <div class="row" style="margin-bottom: 10px;">
            <button class="modal-btn" @click="addColor">＋ 添加颜色</button>
            <button class="modal-btn" @click="localColors = []">清空</button>
          </div>

          <!-- hex 导入 -->
          <p class="section-label">从 Hex 导入</p>
          <textarea
            v-model="hexInput"
            class="hex-area"
            placeholder="#1a1c2c, #5d2753 ...&#10;逗号、空格、换行分隔均可，# 可省略"
          />
          <p class="hint">可从 lospec.com 复制调色板 hex 列表直接粘贴，导入会追加到现有颜色。</p>
          <div class="row">
            <button class="modal-btn" @click="importHex">导入</button>
            <button class="modal-btn" @click="exportHex">导出 Hex</button>
          </div>

          <!-- 操作 -->
          <div class="row" style="margin-top: 12px; justify-content: flex-end;">
            <button class="modal-btn" @click="$emit('close')">取消</button>
            <button class="modal-btn primary" @click="apply">应用</button>
          </div>
        </div>
      </div>
    </div>
    <!-- 隐藏拾色器 -->
    <input ref="pickerRef" type="color" style="display:none" @change="onPickerChange">
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RGB } from '@/types'

const props = defineProps<{
  visible: boolean
  editKey?: string
  editName?: string
  editColors?: RGB[]
}>()

const emit = defineEmits<{
  close: []
  apply: [key: string, name: string, colors: RGB[]]
}>()

const localName = ref('')
const localColors = ref<RGB[]>([])
const hexInput = ref('')
const pickerRef = ref<HTMLInputElement | null>(null)
let editingIndex = -1

watch(() => props.visible, (v) => {
  if (v) {
    localName.value = props.editName ?? ''
    localColors.value = (props.editColors ?? []).map(c => [...c] as RGB)
    hexInput.value = ''
    editingIndex = -1
  }
})

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}

function hexToRgb(hex: string): RGB | null {
  hex = hex.trim().replace(/^#/, '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  if (hex.length !== 6) return null
  const n = parseInt(hex, 16)
  if (isNaN(n)) return null
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function addColor() {
  editingIndex = -1
  if (pickerRef.value) {
    pickerRef.value.value = '#ff0000'
    pickerRef.value.click()
  }
}

function editColor(i: number) {
  editingIndex = i
  if (pickerRef.value) {
    pickerRef.value.value = toHex(localColors.value[i]!)
    pickerRef.value.click()
  }
}

function onPickerChange(e: Event) {
  const hex = (e.target as HTMLInputElement).value
  const rgb = hexToRgb(hex)
  if (!rgb) return
  if (editingIndex >= 0 && editingIndex < localColors.value.length) {
    localColors.value[editingIndex] = rgb
  } else {
    localColors.value.push(rgb)
  }
}

function removeColor(i: number) {
  localColors.value.splice(i, 1)
}

function importHex() {
  const tokens = hexInput.value.split(/[\s,;\n]+/).filter(Boolean)
  let added = 0
  for (const t of tokens) {
    const rgb = hexToRgb(t)
    if (rgb) { localColors.value.push(rgb); added++ }
  }
  hexInput.value = ''
  if (added === 0) alert('未识别到有效的 hex 颜色，请检查格式。')
}

function exportHex() {
  if (localColors.value.length === 0) { alert('调色板是空的'); return }
  hexInput.value = localColors.value.map(toHex).join(', ')
}

function apply() {
  if (localColors.value.length < 2) return
  const key = props.editKey ?? ('custom_' + Date.now())
  emit('apply', key, localName.value.trim() || '自定义', localColors.value)
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: var(--win-bg);
  border: 2px solid var(--win-bg);
  box-shadow: var(--shadow-out), 4px 4px 0 rgba(0,0,0,0.4);
  width: 420px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
}

.win-titlebar {
  background: var(--titlebar-grad);
  padding: 2px 3px;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.win-title {
  flex: 1;
  font-size: 11px;
  color: #fff;
  letter-spacing: 1px;
  padding: 0 2px;
}

.win-btns { display: flex; gap: 1px; }

.win-btn {
  width: 16px; height: 14px;
  background: var(--win-bg);
  border: none;
  font-family: var(--font);
  font-size: 10px;
  cursor: pointer;
  box-shadow: var(--shadow-border);
}

.modal-body {
  padding: 10px;
  overflow-y: auto;
  max-height: 70vh;
}

.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 4px;
  margin-top: 8px;
}

.section-label:first-child { margin-top: 0; }

.count { font-size: 10px; color: #808080; margin-left: 4px; }
.count.warn { color: #c00; }

.text-input {
  width: 100%;
  font-family: var(--font);
  font-size: 12px;
  box-shadow: var(--shadow-in);
  border: none;
  padding: 3px 6px;
  background: #fff;
  color: #000;
  outline: none;
  margin-bottom: 8px;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
  min-height: 36px;
  padding: 4px;
  box-shadow: var(--shadow-in);
  background: #fff;
}

.swatch-wrap {
  position: relative;
  width: 28px;
  height: 28px;
}

.swatch {
  width: 100%; height: 100%;
  border: none;
  cursor: pointer;
  display: block;
  box-shadow: var(--shadow-border);
}

.swatch-del {
  display: none;
  position: absolute;
  top: -5px; right: -5px;
  width: 14px; height: 14px;
  background: var(--win-bg);
  border: none;
  font-size: 9px;
  cursor: pointer;
  box-shadow: var(--shadow-border);
  align-items: center;
  justify-content: center;
  line-height: 1;
  padding: 0;
}

.swatch-wrap:hover .swatch-del { display: flex; }

.hex-area {
  width: 100%;
  height: 60px;
  font-family: var(--font);
  font-size: 11px;
  resize: vertical;
  box-shadow: var(--shadow-in);
  border: none;
  padding: 4px 6px;
  background: #fff;
  color: #000;
  outline: none;
}

.hint {
  font-size: 10px;
  color: #808080;
  margin: 4px 0 8px;
  line-height: 1.6;
}

.row {
  display: flex;
  gap: 4px;
  margin-top: 6px;
}

.modal-btn {
  background: var(--win-bg);
  border: none;
  padding: 4px 12px;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  box-shadow: var(--shadow-out);
  color: #000;
}

.modal-btn:active { box-shadow: var(--shadow-in); }

.modal-btn.primary {
  background: #000080;
  color: #fff;
}
</style>
