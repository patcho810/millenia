<template>
    <div class="win">
        <div class="win-titlebar">
            <span class="win-title">{{ title }}</span>
            <div class="win-btns">
                <button class="win-btn">_</button>
                <button class="win-btn">□</button>
                <button class="win-btn">×</button>
            </div>
        </div>
        <slot name="menubar" />
        <div class="win-body" :style="bodyStyle">
            <slot />
        </div>
        <slot name="footer" />
    </div>
</template>

<script setup lang="ts">
    defineProps<{
        title: string
        bodyStyle?: string | Record<string, string> 
    }>()
</script>

<style scoped>
.win {
    background: var(--win-bg);
    border: 2px solid var(--win-bg);
    box-shadow: var(--shadow-out);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
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

.win-btns {
    display: flex;
    gap: 1px;
}

.win-btn {
    width: 16px;
    height: 14px;
    background-color: var(--win-bg);
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-family: var(--font);
    color: #000;
    line-height: 1;
    box-shadow: var(--shadow-border);
    cursor: pointer;
}

.win-body {
    padding: 8px;
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}
</style>