<template>
  <div>
    <p class="section-label">SIZE</p>
    <div class="btn-group">
      <button
        v-for="s in sizes"
        :key="s"
        class="retro-btn"
        :class="{ active: modelValue === s }"
        @click="$emit('update:modelValue', s)"
      >{{ s }}px</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: number }>()
defineEmits<{ 'update:modelValue': [v: number] }>()
const sizes = [2, 3, 4, 5]
</script>

<style scoped>
.section-label {
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
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
