<template>
  <WinFrame title="风格预设">
    <div class="preset-body">
      <section v-if="builtinPresets.length" class="preset-group">
        <div class="group-label">内置</div>
        <div class="grid">
          <button
            v-for="p in builtinPresets"
            :key="p.id"
            class="retro-btn"
            :class="{ active: activeId === p.id }"
            :title="p.id"
            @click="apply(p)"
          >{{ p.name }}</button>
        </div>
      </section>

      <section v-if="userPresets.length" class="preset-group">
        <div class="group-label">我的</div>
        <div class="grid">
          <div
            v-for="p in userPresets"
            :key="p.id"
            class="user-preset"
            :class="{ active: activeId === p.id }"
          >
            <button class="retro-btn user-name" :title="p.id" @click="apply(p)">{{ p.name }}</button>
            <button class="del-btn" :title="'删除预设'" @click="onDelete(p.id)">×</button>
          </div>
        </div>
      </section>

      <div class="save-row">
        <input
          v-model="newName"
          class="name-input"
          placeholder="预设名称"
          maxlength="24"
          @keydown.enter="onSave"
        />
        <button class="retro-btn save-btn" :disabled="!newName.trim()" @click="onSave">💾 保存当前</button>
      </div>
    </div>
  </WinFrame>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import WinFrame from './WinFrame.vue'
import type { PipelinePreset } from '@/pipeline/types'

const props = defineProps<{
  presets: PipelinePreset[]              // built-in presets
  userPresets: PipelinePreset[]          // user-saved presets
  activeId?: string                      // currently-applied preset id (best-effort)
  applyPreset: (preset: PipelinePreset) => void
  savePreset: (name: string) => void
  deleteUserPreset: (id: string) => void
}>()

const newName = ref('')

const builtinPresets = computed(() => props.presets)

function apply(p: PipelinePreset) {
  props.applyPreset(p)
}

function onSave() {
  const name = newName.value.trim()
  if (!name) return
  props.savePreset(name)
  newName.value = ''
}

function onDelete(id: string) {
  props.deleteUserPreset(id)
}
</script>

<style scoped>
.preset-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preset-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.group-label {
  font-size: 9px;
  color: #404040;
  letter-spacing: 1px;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.user-preset {
  position: relative;
  flex: 1 1 calc(50% - 2px);
  min-width: calc(50% - 2px);
  display: flex;
}
.user-preset .user-name {
  flex: 1;
  min-width: 0;
  padding-right: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.del-btn {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  font-size: 12px;
  line-height: 1;
  background: #c0c0c0;
  border: none;
  cursor: pointer;
  color: #800000;
  font-family: var(--font);
  padding: 0;
  box-shadow: var(--shadow-border);
}
.del-btn:active { box-shadow: var(--shadow-in); }
.save-row {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  border-top: 1px solid #808080;
  padding-top: 6px;
}
.name-input {
  flex: 1;
  min-width: 0;
  font-family: var(--font);
  font-size: 11px;
  padding: 4px 6px;
  background: #fff;
  border: none;
  box-shadow: var(--shadow-in);
  color: #000;
}
.save-btn {
  flex: 0 0 auto;
  min-width: 90px;
  white-space: nowrap;
}
.retro-btn {
  background: var(--win-bg);
  border: none;
  padding: 5px 0;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  text-align: center;
  box-shadow: var(--shadow-border);
  color: #000;
  flex: 1 1 calc(50% - 2px);
  min-width: calc(50% - 2px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.retro-btn.active {
  background: #000080;
  color: #fff;
  box-shadow: var(--shadow-in);
}
.retro-btn:active { box-shadow: var(--shadow-in); }
.retro-btn:disabled { color: #808080; cursor: default; }
</style>
