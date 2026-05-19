<template>
  <div class="title-bar">
    <div class="title-left">
      <div class="app-icon">
        <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
          <rect x="4" y="4" width="40" height="40" rx="8" stroke="url(#tgrad)" stroke-width="2.5" fill="none"/>
          <path d="M16 24L22 30L32 18" stroke="url(#tgrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          <defs>
            <linearGradient id="tgrad" x1="4" y1="4" x2="44" y2="44">
              <stop stop-color="#00d4ff"/><stop offset="1" stop-color="#0088ff"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="title-text" v-if="projectStore.currentProject">
        {{ projectStore.projectName }}
      </span>
      <span class="title-text" v-else>码悟</span>
    </div>

    <div class="title-center">
      <!-- Drag area -->
    </div>

    <div class="title-right">
      <div class="window-btn minimize" @click="windowApi.windowMinimize()">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" stroke-width="1"/>
        </svg>
      </div>
      <div class="window-btn maximize" @click="toggleMaximize">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none" rx="1"/>
        </svg>
      </div>
      <div class="window-btn close" @click="windowApi.windowClose()">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1"/>
          <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()
const windowApi = window.api

const isMaximized = ref(false)

async function toggleMaximize() {
  windowApi.windowMaximize()
  isMaximized.value = await windowApi.windowIsMaximized()
}
</script>

<style scoped>
.title-bar {
  height: var(--mawu-titlebar-height);
  display: flex;
  align-items: center;
  background: var(--mawu-bg-primary);
  border-bottom: 1px solid var(--mawu-border);
  -webkit-app-region: drag;
  user-select: none;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 16px;
  -webkit-app-region: no-drag;
}

.app-icon {
  color: var(--mawu-accent);
}

.title-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--mawu-text-secondary);
  letter-spacing: 1px;
}

.title-center {
  flex: 1;
  height: 100%;
}

.title-right {
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
}

.window-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mawu-text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.window-btn:hover {
  background: var(--mawu-bg-hover);
  color: var(--mawu-text-primary);
}

.window-btn.close:hover {
  background: var(--mawu-error);
  color: #fff;
}
</style>
