<template>
  <div class="title-bar">
    <div class="title-left">
      <div class="app-icon">
        <img src="/icon.png" width="16" height="16" alt="码悟" />
      </div>

      <!-- 文件菜单 -->
      <t-popup trigger="click" :overlay-style="{ background: 'var(--mawu-bg-tertiary)', border: '1px solid var(--mawu-border)', borderRadius: '8px', minWidth: '160px', padding: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }">
        <div class="menu-trigger">文件</div>
        <template #content>
          <div class="dropdown-menu">
            <div class="menu-item" @click="openFile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
              <span>打开文件</span>
            </div>
            <div class="menu-sep"></div>
            <div class="menu-item danger" @click="exitProject" v-if="projectStore.currentProject">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>退出项目</span>
            </div>
          </div>
        </template>
      </t-popup>

      <!-- 关于菜单 -->
      <t-popup trigger="click" :overlay-style="{ background: 'var(--mawu-bg-tertiary)', border: '1px solid var(--mawu-border)', borderRadius: '8px', minWidth: '240px', padding: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }">
        <div class="menu-trigger">关于</div>
        <template #content>
          <div class="dropdown-menu about-menu">
            <div class="about-header">
              <div class="about-logo">
                <img src="/icon.png" width="24" height="24" alt="码悟" />
              </div>
              <div class="about-info">
                <div class="about-name">码悟 MaWu</div>
                <div class="about-desc">末心开发的AI编程助手</div>
                <div class="about-tag">简洁 · 轻便</div>
              </div>
            </div>
            <div class="menu-sep"></div>
            <div class="menu-item" @click="openExternal('https://github.com/Moxin1044/MaWu')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>GitHub 仓库</span>
            </div>
            <div class="menu-item" @click="openExternal('https://github.com/Moxin1044')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>开发者主页</span>
            </div>
          </div>
        </template>
      </t-popup>
    </div>

    <div class="title-center">
      <span class="title-text" v-if="projectStore.currentProject">{{ projectStore.projectName }}</span>
      <span class="title-text" v-else>码悟</span>
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
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'

const projectStore = useProjectStore()
const editorStore = useEditorStore()
const router = useRouter()
const windowApi = window.api

const isMaximized = ref(false)

async function toggleMaximize() {
  windowApi.windowMaximize()
  isMaximized.value = await windowApi.windowIsMaximized()
}

async function openFile() {
  const filePath = await window.api.openFile()
  if (filePath) {
    editorStore.openFile(filePath)
    if (projectStore.currentProject) {
      router.push('/editor')
    }
  }
}

function exitProject() {
  projectStore.closeProject()
  editorStore.openedFiles = []
  editorStore.activeFilePath = null
  router.push('/')
}

function openExternal(url: string) {
  window.open(url, '_blank')
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
  gap: 4px;
  padding-left: 12px;
  -webkit-app-region: no-drag;
}

.app-icon {
  color: var(--mawu-accent);
  margin-right: 4px;
}

.menu-trigger {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--mawu-text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.menu-trigger:hover {
  color: var(--mawu-text-primary);
  background: var(--mawu-bg-hover);
}

.title-center {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--mawu-text-secondary);
  letter-spacing: 1px;
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

.dropdown-menu {
  min-width: 160px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--mawu-text-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.menu-item:hover {
  background: var(--mawu-bg-hover);
}

.menu-item.danger {
  color: var(--mawu-error);
}

.menu-item.danger:hover {
  background: rgba(255, 68, 102, 0.15);
}

.menu-sep {
  height: 1px;
  background: var(--mawu-border);
  margin: 4px 8px;
}

.about-menu {
  min-width: 220px;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}

.about-logo {
  color: var(--mawu-accent);
  flex-shrink: 0;
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.about-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--mawu-text-primary);
}

.about-desc {
  font-size: 11px;
  color: var(--mawu-text-secondary);
}

.about-tag {
  font-size: 10px;
  color: var(--mawu-accent);
  letter-spacing: 2px;
}
</style>

<style>
/* TDesign popup dark theme override */
.t-popup__content {
  background: #1a1a2e !important;
  color: #e0e0f0 !important;
  border: 1px solid #2a2a4a !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
}

.t-popup__content .dropdown-menu {
  padding: 4px;
}

.t-popup__content .menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: #e0e0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.t-popup__content .menu-item:hover {
  background: #2a2a4a;
}

.t-popup__content .menu-item.danger {
  color: #ff4466;
}

.t-popup__content .menu-item.danger:hover {
  background: rgba(255, 68, 102, 0.15);
}

.t-popup__content .menu-sep {
  height: 1px;
  background: #2a2a4a;
  margin: 4px 8px;
}

.t-popup__content .about-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}

.t-popup__content .about-logo {
  color: #00d4ff;
  flex-shrink: 0;
}

.t-popup__content .about-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.t-popup__content .about-name {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0f0;
}

.t-popup__content .about-desc {
  font-size: 11px;
  color: #a0a0c0;
}

.t-popup__content .about-tag {
  font-size: 10px;
  color: #00d4ff;
  letter-spacing: 2px;
}
</style>
