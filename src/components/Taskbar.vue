<template>
    <div class="taskbar">
    <button class="task-btn">🪟 Start</button>
    <button class="task-btn pressed">📄 Pixel Converter</button>
    <div class="spacer" />
    <div class="clock">{{ time }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const time = ref('')
let timer: ReturnType<typeof setInterval>

function update() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  time.value = `${h}:${m}`
}

onMounted(() => { update(); timer = setInterval(update, 10000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.taskbar {
  height: 36px;
  background: var(--win-bg);
  border-top: 2px solid #fff;
  box-shadow: inset 0 1px 0 #dfdfdf;
  display: flex;
  align-items: center;
  padding: 2px 4px;
  gap: 4px;
  flex-shrink: 0;
}

.task-btn {
  background: var(--win-bg);
  border: none;
  padding: 3px 10px;
  font-family: var(--font);
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #000;
  min-width: 100px;
  box-shadow: var(--shadow-out);
}

.task-btn.pressed {
  box-shadow: var(--shadow-in);
  background-image: repeating-conic-gradient(#c0c0c0 0% 25%, #b0b0b0 0% 50%) 50% / 2px 2px;
}

.spacer { flex: 1; }

.clock {
  box-shadow: var(--shadow-in);
  padding: 2px 10px;
  font-size: 11px;
  min-width: 50px;
  text-align: center;
}
</style>