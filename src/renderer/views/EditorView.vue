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
              <img src="/icon.png" width="64" height="64" alt="码悟" style="opacity: 0.15" />
              <p>选择文件开始编辑</p>
              <p class="hint">Ctrl+S 保存 | Ctrl+P 快速打开 | Ctrl+` 命令行</p>
            </div>
          </div>
        </div>

        <!-- Bottom Terminal -->
        <div class="terminal-panel" :class="{ open: terminalOpen }">
          <div class="terminal-header">
            <span class="terminal-title">命令行</span>
            <div class="terminal-actions">
              <span class="terminal-action" @click="clearTerminal" title="清除">清除</span>
              <span class="terminal-action" @click="terminalOpen = false" title="关闭">✕</span>
            </div>
          </div>
          <div class="terminal-body" ref="terminalBody">
            <div v-for="(line, i) in terminalLines" :key="i" class="terminal-line" :class="line.type">
              <span class="terminal-prompt" v-if="line.type === 'input'">❯&nbsp;</span>
              <span class="terminal-text">{{ line.text }}</span>
            </div>
          </div>
          <div class="terminal-input-row">
            <span class="terminal-prompt-symbol">❯</span>
            <input
              class="terminal-input"
              v-model="terminalInput"
              @keydown.enter="executeTerminalCommand"
              @keydown.up.prevent="historyUp"
              @keydown.down.prevent="historyDown"
              placeholder="输入命令..."
              ref="terminalInputEl"
            />
          </div>
        </div>
      </div>

      <!-- AI Panel - always visible on the right -->
      <div class="ai-panel">
        <AiDialog />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
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

// Terminal
const terminalOpen = ref(false)
const terminalInput = ref('')
const terminalInputEl = ref<HTMLInputElement | null>(null)
const terminalBody = ref<HTMLElement | null>(null)
const terminalLines = ref<Array<{ type: 'input' | 'output' | 'error'; text: string }>>([])
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

function handleGlobalKeydown(e: KeyboardEvent) {
  // Ctrl+` toggle terminal
  if (e.ctrlKey && e.code === 'Backquote') {
    e.preventDefault()
    terminalOpen.value = !terminalOpen.value
    if (terminalOpen.value) {
      nextTick(() => {
        terminalInputEl.value?.focus()
      })
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

watch(terminalOpen, (val) => {
  if (val) {
    nextTick(() => {
      terminalInputEl.value?.focus()
      scrollTerminal()
    })
  }
})

async function executeTerminalCommand() {
  const cmd = terminalInput.value.trim()
  if (!cmd) return

  terminalLines.value.push({ type: 'input', text: cmd })
  commandHistory.value.push(cmd)
  historyIndex.value = commandHistory.value.length
  terminalInput.value = ''

  // Process command
  try {
    if (cmd === 'clear') {
      terminalLines.value = []
      return
    }
    if (cmd === 'help') {
      terminalLines.value.push({ type: 'output', text: '可用命令: clear, help, ai <问题>, cd <路径>, ls, pwd' })
      return
    }
    if (cmd.startsWith('ai ')) {
      const question = cmd.substring(3)
      terminalLines.value.push({ type: 'output', text: '正在向 AI 提问...' })
      scrollTerminal()
      const response = await aiStore.sendToAi(question)
      terminalLines.value.push({ type: 'output', text: response })
      scrollTerminal()
      return
    }

    // Execute shell command via IPC
    const result = await window.api.executeCommand?.(cmd)
    if (result) {
      terminalLines.value.push({ type: 'output', text: typeof result === 'string' ? result : JSON.stringify(result) })
    } else {
      terminalLines.value.push({ type: 'output', text: `命令已执行: ${cmd}` })
    }
  } catch (e: any) {
    terminalLines.value.push({ type: 'error', text: e.message || '执行失败' })
  }

  scrollTerminal()
}

function historyUp() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    terminalInput.value = commandHistory.value[historyIndex.value]
  }
}

function historyDown() {
  if (historyIndex.value < commandHistory.value.length - 1) {
    historyIndex.value++
    terminalInput.value = commandHistory.value[historyIndex.value]
  } else {
    historyIndex.value = commandHistory.value.length
    terminalInput.value = ''
  }
}

function clearTerminal() {
  terminalLines.value = []
}

function scrollTerminal() {
  nextTick(() => {
    if (terminalBody.value) {
      terminalBody.value.scrollTop = terminalBody.value.scrollHeight
    }
  })
}
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

/* ====== AI Panel - always visible on the right ====== */
.ai-panel {
  width: 320px;
  background: var(--mawu-bg-primary);
  border-left: 1px solid var(--mawu-border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ====== Bottom Terminal ====== */
.terminal-panel {
  height: 0;
  background: var(--mawu-bg-deep);
  border-top: 1px solid var(--mawu-border);
  transition: height 0.2s;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-panel.open {
  height: 220px;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: var(--mawu-bg-primary);
  border-bottom: 1px solid var(--mawu-border);
  flex-shrink: 0;
}

.terminal-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--mawu-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.terminal-actions {
  display: flex;
  gap: 8px;
}

.terminal-action {
  font-size: 11px;
  color: var(--mawu-text-muted);
  cursor: pointer;
  transition: color 0.15s;
}

.terminal-action:hover {
  color: var(--mawu-accent);
}

.terminal-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.terminal-line {
  display: flex;
}

.terminal-line.input {
  color: var(--mawu-text-primary);
}

.terminal-line.output {
  color: var(--mawu-text-secondary);
}

.terminal-line.error {
  color: var(--mawu-error);
}

.terminal-prompt {
  color: var(--mawu-accent);
  flex-shrink: 0;
}

.terminal-text {
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-input-row {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  border-top: 1px solid var(--mawu-border);
  flex-shrink: 0;
}

.terminal-prompt-symbol {
  color: var(--mawu-accent);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  margin-right: 8px;
}

.terminal-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--mawu-text-primary);
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
  caret-color: var(--mawu-accent);
}

.terminal-input::placeholder {
  color: var(--mawu-text-muted);
  opacity: 0.5;
}
</style>
