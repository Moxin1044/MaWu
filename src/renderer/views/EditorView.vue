<template>
  <div class="editor-view">
    <TitleBar />
    <div class="editor-body">
      <!-- Left Sidebar -->
      <div class="sidebar" :class="{ collapsed: sidebarCollapsed }" :style="sidebarCollapsed ? {} : { width: sidebarWidth + 'px' }">
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

        <!-- Resize handle -->
        <div
          v-if="!sidebarCollapsed"
          class="sidebar-resize-handle"
          @mousedown="startResizeSidebar"
        ></div>
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
            <div class="terminal-tabs-area">
              <div class="terminal-tab" v-for="tab in termStore.tabs" :key="tab.id"
                :class="{ active: tab.id === termStore.activeTabId }"
                @click="switchTerminalTab(tab.id)">
                <span class="term-tab-name">{{ tab.name }}</span>
                <span class="term-tab-close" @click.stop="closeTerminalTab(tab.id)">×</span>
              </div>
              <span class="terminal-action term-add-btn" @click="addTerminalTab" title="新建终端">+</span>
            </div>
            <div class="terminal-actions">
              <select class="shell-select" v-model="selectedShellId" @change="onShellChange" title="选择 Shell">
                <option v-for="sh in termStore.availableShells" :key="sh.id" :value="sh.id">{{ sh.label }}</option>
              </select>
              <span class="terminal-action" @click="clearActiveTerminal" title="清除">清除</span>
              <span class="terminal-action" @click="terminalOpen = false" title="关闭">✕</span>
            </div>
          </div>
          <div class="terminal-body" ref="terminalBody" v-if="termStore.activeTab">
            <div v-for="(line, i) in termStore.activeTab.lines" :key="i" class="terminal-line" :class="line.type">
              <span class="terminal-prompt" v-if="line.type === 'input'">❯&nbsp;</span>
              <span class="terminal-text">{{ line.text }}</span>
            </div>
          </div>
          <div class="terminal-body terminal-empty" v-else>
            <span class="terminal-empty-text">点击 + 新建终端会话</span>
          </div>
          <div class="terminal-input-row" v-if="termStore.activeTab">
            <span class="terminal-prompt-symbol">❯</span>
            <input
              class="terminal-input"
              v-model="terminalInput"
              @keydown.enter="executeTerminalCommand"
              @keydown.up.prevent="historyUp"
              @keydown.down.prevent="historyDown"
              :placeholder="`输入命令 (${termStore.activeTab.shellLabel})...`"
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
import { useTerminalStore } from '@/stores/terminal'
import { useProjectStore } from '@/stores/project'
import TitleBar from '@/components/TitleBar.vue'
import FileTree from '@/components/FileTree.vue'
import GitPanel from '@/components/GitPanel.vue'
import CodeEditor from '@/components/CodeEditor.vue'
import AiDialog from '@/components/AiDialog.vue'

const editorStore = useEditorStore()
const aiStore = useAiStore()
const termStore = useTerminalStore()
const projectStore = useProjectStore()

const sidebarCollapsed = ref(false)
const activeSideTab = ref<'files' | 'git'>('files')
const sidebarWidth = ref(260)
const isResizingSidebar = ref(false)

function startResizeSidebar(e: MouseEvent) {
  e.preventDefault()
  isResizingSidebar.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMouseMove(ev: MouseEvent) {
    const delta = ev.clientX - startX
    const newWidth = Math.min(600, Math.max(180, startWidth + delta))
    sidebarWidth.value = newWidth
  }

  function onMouseUp() {
    isResizingSidebar.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

// Terminal
const terminalOpen = ref(false)
const terminalInput = ref('')
const terminalInputEl = ref<HTMLInputElement | null>(null)
const terminalBody = ref<HTMLElement | null>(null)
const selectedShellId = ref('')

function handleGlobalKeydown(e: KeyboardEvent) {
  // Ctrl+` toggle terminal
  if (e.ctrlKey && e.code === 'Backquote') {
    e.preventDefault()
    terminalOpen.value = !terminalOpen.value
    if (terminalOpen.value) {
      ensureActiveTab()
      nextTick(() => terminalInputEl.value?.focus())
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown)
  await termStore.loadShells()
  selectedShellId.value = termStore.defaultShellId

  // Listen for terminal data from main process
  window.api.terminal.onData((sessionId: string, data: string, stream: string) => {
    const tab = termStore.tabs.find(t => t.id === sessionId)
    if (tab) {
      const type = stream === 'stderr' ? 'error' : 'output'
      // Split multi-line output into separate lines
      const lines = data.split('\n')
      for (const line of lines) {
        if (line) {
          tab.lines.push({ type, text: line })
        }
      }
      if (termStore.activeTabId === sessionId) {
        scrollTerminal()
      }
    }
  })

  window.api.terminal.onExit((sessionId: string) => {
    const tab = termStore.tabs.find(t => t.id === sessionId)
    if (tab) {
      tab.alive = false
      tab.lines.push({ type: 'error', text: '[进程已退出]' })
    }
  })

  window.api.terminal.onError((sessionId: string, message: string) => {
    const tab = termStore.tabs.find(t => t.id === sessionId)
    if (tab) {
      tab.alive = false
      tab.lines.push({ type: 'error', text: `[错误] ${message}` })
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.api.terminal.removeDataListener()
  window.api.terminal.removeExitListener()
  window.api.terminal.removeErrorListener()
})

watch(terminalOpen, (val) => {
  if (val) {
    ensureActiveTab()
    nextTick(() => {
      terminalInputEl.value?.focus()
      scrollTerminal()
    })
  }
})

function ensureActiveTab() {
  if (!termStore.activeTab) {
    addTerminalTab()
  }
}

function addTerminalTab() {
  const shellId = selectedShellId.value || termStore.defaultShellId
  const cwd = projectStore.currentProject?.path || ''
  const tab = termStore.createTab(shellId, cwd)
  // Create persistent session
  window.api.terminal.createSession(tab.id, cwd || undefined, shellId)
  tab.alive = true
  nextTick(() => {
    terminalInputEl.value?.focus()
    scrollTerminal()
  })
}

function closeTerminalTab(tabId: string) {
  termStore.closeTab(tabId)
}

function switchTerminalTab(tabId: string) {
  termStore.switchTab(tabId)
  nextTick(() => {
    terminalInputEl.value?.focus()
    scrollTerminal()
  })
}

function onShellChange() {
  termStore.setDefaultShell(selectedShellId.value)
}

async function executeTerminalCommand() {
  const cmd = terminalInput.value.trim()
  if (!cmd || !termStore.activeTab) return

  const tab = termStore.activeTab
  tab.lines.push({ type: 'input', text: cmd })
  tab.commandHistory.push(cmd)
  tab.historyIndex = tab.commandHistory.length
  terminalInput.value = ''

  // Process built-in commands
  try {
    if (cmd === 'clear') {
      tab.lines = []
      return
    }
    if (cmd === 'help') {
      tab.lines.push({ type: 'output', text: '可用命令: clear, help, ai <问题>' })
      return
    }
    if (cmd.startsWith('ai ')) {
      const question = cmd.substring(3)
      tab.lines.push({ type: 'output', text: '正在向 AI 提问...' })
      scrollTerminal()
      const response = await aiStore.sendToAi(question)
      tab.lines.push({ type: 'output', text: response })
      scrollTerminal()
      return
    }

    // If session is alive, write to stdin; otherwise execute one-shot
    if (tab.alive) {
      window.api.terminal.write(tab.id, cmd + '\n')
    } else {
      // One-shot execution for dead sessions
      const cwd = tab.cwd || projectStore.currentProject?.path || undefined
      const result = await window.api.terminal.execute(cmd, cwd, tab.shellId)
      if (result) {
        tab.lines.push({ type: 'output', text: typeof result === 'string' ? result : JSON.stringify(result) })
      } else {
        tab.lines.push({ type: 'output', text: `命令已执行: ${cmd}` })
      }
      scrollTerminal()
    }
  } catch (e: any) {
    tab.lines.push({ type: 'error', text: e.message || '执行失败' })
    scrollTerminal()
  }
}

function historyUp() {
  const tab = termStore.activeTab
  if (!tab) return
  if (tab.historyIndex > 0) {
    tab.historyIndex--
    terminalInput.value = tab.commandHistory[tab.historyIndex]
  }
}

function historyDown() {
  const tab = termStore.activeTab
  if (!tab) return
  if (tab.historyIndex < tab.commandHistory.length - 1) {
    tab.historyIndex++
    terminalInput.value = tab.commandHistory[tab.historyIndex]
  } else {
    tab.historyIndex = tab.commandHistory.length
    terminalInput.value = ''
  }
}

function clearActiveTerminal() {
  if (termStore.activeTab) {
    termStore.activeTab.lines = []
  }
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
  width: var(--mawu-sidebar-width);
  position: relative;
  flex-shrink: 0;
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

.sidebar-resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 20;
}

.sidebar-resize-handle:hover {
  background: var(--mawu-accent);
  opacity: 0.3;
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
  height: 240px;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: var(--mawu-bg-primary);
  border-bottom: 1px solid var(--mawu-border);
  flex-shrink: 0;
  height: 32px;
}

.terminal-tabs-area {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  font-size: 11px;
  color: var(--mawu-text-muted);
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  border-bottom: 2px solid transparent;
}

.terminal-tab:hover {
  color: var(--mawu-text-secondary);
  background: var(--mawu-bg-hover);
}

.terminal-tab.active {
  color: var(--mawu-text-primary);
  background: var(--mawu-bg-deep);
  border-bottom-color: var(--mawu-accent);
}

.term-tab-name {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.term-tab-close {
  font-size: 14px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
  margin-left: 2px;
}

.terminal-tab:hover .term-tab-close {
  opacity: 0.6;
}

.term-tab-close:hover {
  opacity: 1 !important;
  color: var(--mawu-error);
}

.term-add-btn {
  font-size: 16px;
  font-weight: bold;
  padding: 0 6px;
  line-height: 1;
}

.terminal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.shell-select {
  background: var(--mawu-bg-deep);
  color: var(--mawu-text-secondary);
  border: 1px solid var(--mawu-border);
  border-radius: 4px;
  font-size: 11px;
  padding: 1px 4px;
  outline: none;
  cursor: pointer;
  font-family: inherit;
}

.shell-select:hover {
  border-color: var(--mawu-accent);
}

.shell-select:focus {
  border-color: var(--mawu-accent);
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

.terminal-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-empty-text {
  color: var(--mawu-text-muted);
  opacity: 0.5;
  font-size: 12px;
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
