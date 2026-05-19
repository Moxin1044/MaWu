<template>
  <div class="editor-view">
    <TitleBar />
    <div class="editor-body">
      <!-- Left Sidebar -->
      <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-tabs">
          <div
            class="sidebar-tab"
            :class="{ active: activeSideTab === 'files' }"
            @click="activeSideTab = 'files'"
            title="文件"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
          </div>
          <div
            class="sidebar-tab"
            :class="{ active: activeSideTab === 'git' }"
            @click="activeSideTab = 'git'"
            title="Git"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><path d="M6 9v12"/>
            </svg>
          </div>
        </div>

        <div class="sidebar-content" v-show="!sidebarCollapsed">
          <FileTree v-if="activeSideTab === 'files'" />
          <GitPanel v-if="activeSideTab === 'git'" />
        </div>

        <div class="sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            :style="{ transform: sidebarCollapsed ? 'rotate(180deg)' : '' }">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </div>
      </div>

      <!-- Main Content -->
      <div class="main-area">
        <!-- Editor Tabs -->
        <div class="editor-tabs" v-if="editorStore.openedFiles.length > 0">
          <div class="tabs-scroll">
            <div
              v-for="file in editorStore.openedFiles"
              :key="file.path"
              class="editor-tab"
              :class="{ active: file.path === editorStore.activeFilePath }"
              @click="editorStore.openFile(file.path)"
            >
              <span class="tab-name">{{ file.name }}</span>
              <span class="tab-modified" v-if="file.modified">●</span>
              <span class="tab-close" @click.stop="editorStore.closeFile(file.path)">×</span>
            </div>
          </div>
        </div>

        <!-- Code Editor -->
        <div class="editor-area">
          <CodeEditor v-if="editorStore.activeFile" />
          <div class="empty-editor" v-else>
            <div class="empty-content">
              <svg width="64" height="64" viewBox="0 0 48 48" fill="none" opacity="0.15">
                <rect x="4" y="4" width="40" height="40" rx="8" stroke="currentColor" stroke-width="2"/>
                <path d="M16 24L22 30L32 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p>选择文件开始编辑</p>
              <p class="hint">Ctrl+S 保存 | Ctrl+P 快速打开</p>
            </div>
          </div>
        </div>
      </div>

      <!-- AI Panel -->
      <div class="ai-panel" :class="{ open: aiStore.isChatOpen }">
        <div class="ai-panel-toggle" @click="aiStore.toggleChat">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <AiDialog v-if="aiStore.isChatOpen" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useAiStore } from '@/stores/ai'
import TitleBar from '@/components/TitleBar.vue'
import FileTree from '@/components/FileTree.vue'
import GitPanel from '@/components/GitPanel.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import AiDialog from '@/components/AiDialog.vue'

const editorStore = useEditorStore()
const aiStore = useAiStore()

const sidebarCollapsed = ref(false)
const activeSideTab = ref<'files' | 'git'>('files')
</script>

<style scoped>
.editor-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--mawu-bg-deep);
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  display: flex;
  background: var(--mawu-bg-primary);
  border-right: 1px solid var(--mawu-border);
  transition: width 0.2s;
  width: var(--mawu-sidebar-width);
  position: relative;
}

.sidebar.collapsed {
  width: 44px;
}

.sidebar-tabs {
  width: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
  gap: 4px;
  border-right: 1px solid var(--mawu-border);
  flex-shrink: 0;
}

.sidebar-tab {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  color: var(--mawu-text-muted);
  transition: all 0.2s;
}

.sidebar-tab:hover {
  color: var(--mawu-text-secondary);
  background: var(--mawu-bg-hover);
}

.sidebar-tab.active {
  color: var(--mawu-accent);
  background: rgba(0, 212, 255, 0.08);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-toggle {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--mawu-bg-tertiary);
  border: 1px solid var(--mawu-border);
  border-radius: 4px;
  cursor: pointer;
  z-index: 10;
  color: var(--mawu-text-muted);
  transition: color 0.2s;
}

.sidebar-toggle:hover {
  color: var(--mawu-accent);
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-tabs {
  height: 38px;
  background: var(--mawu-bg-primary);
  border-bottom: 1px solid var(--mawu-border);
  display: flex;
  overflow-x: auto;
}

.tabs-scroll {
  display: flex;
  height: 100%;
}

.editor-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 12px;
  color: var(--mawu-text-secondary);
  border-right: 1px solid var(--mawu-border);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  min-width: 0;
}

.editor-tab:hover {
  background: var(--mawu-bg-hover);
}

.editor-tab.active {
  background: var(--mawu-bg-deep);
  color: var(--mawu-text-primary);
  border-bottom: 2px solid var(--mawu-accent);
}

.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-modified {
  color: var(--mawu-accent);
  font-size: 10px;
}

.tab-close {
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.15s;
  font-size: 16px;
  line-height: 1;
}

.editor-tab:hover .tab-close {
  opacity: 0.6;
}

.tab-close:hover {
  opacity: 1 !important;
  color: var(--mawu-error);
}

.editor-area {
  flex: 1;
  position: relative;
}

.empty-editor {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  color: var(--mawu-text-muted);
}

.empty-content p {
  margin-top: 16px;
  font-size: 14px;
}

.empty-content .hint {
  font-size: 12px;
  color: var(--mawu-text-muted);
  opacity: 0.6;
  margin-top: 8px;
}

.ai-panel {
  display: flex;
  background: var(--mawu-bg-primary);
  border-left: 1px solid var(--mawu-border);
  transition: width 0.25s;
  width: 0;
  overflow: hidden;
}

.ai-panel.open {
  width: 340px;
}

.ai-panel-toggle {
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--mawu-text-muted);
  transition: color 0.2s;
  flex-shrink: 0;
}

.ai-panel-toggle:hover {
  color: var(--mawu-accent);
}
</style>
