import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ShellOption {
  id: string
  label: string
  path: string
  args: string[]
}

export interface TerminalTab {
  id: string
  name: string
  shellId: string
  shellLabel: string
  lines: Array<{ type: 'input' | 'output' | 'error'; text: string }>
  commandHistory: string[]
  historyIndex: number
  cwd: string
  alive: boolean
}

export const useTerminalStore = defineStore('terminal', () => {
  const tabs = ref<TerminalTab[]>([])
  const activeTabId = ref<string | null>(null)
  const availableShells = ref<ShellOption[]>([])
  const defaultShellId = ref<string>('')

  const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value) || null)

  let tabCounter = 0

  function generateId(): string {
    return `term-${Date.now()}-${++tabCounter}`
  }

  async function loadShells() {
    try {
      availableShells.value = await window.api.terminal.getShells()
      if (availableShells.value.length > 0 && !defaultShellId.value) {
        defaultShellId.value = availableShells.value[0].id
      }
      // Load saved default shell
      const saved = localStorage.getItem('mawu-default-shell')
      if (saved && availableShells.value.find(s => s.id === saved)) {
        defaultShellId.value = saved
      }
    } catch {
      availableShells.value = []
    }
  }

  function setDefaultShell(shellId: string) {
    defaultShellId.value = shellId
    localStorage.setItem('mawu-default-shell', shellId)
  }

  function createTab(shellId?: string, cwd?: string): TerminalTab {
    const sid = shellId || defaultShellId.value || (availableShells.value[0]?.id ?? 'cmd')
    const shellOption = availableShells.value.find(s => s.id === sid)
    const tab: TerminalTab = {
      id: generateId(),
      name: shellOption?.label || sid,
      shellId: sid,
      shellLabel: shellOption?.label || sid,
      lines: [],
      commandHistory: [],
      historyIndex: -1,
      cwd: cwd || '',
      alive: false
    }
    tabs.value.push(tab)
    activeTabId.value = tab.id
    return tab
  }

  function closeTab(tabId: string) {
    const idx = tabs.value.findIndex(t => t.id === tabId)
    if (idx < 0) return

    // Kill session if alive
    const tab = tabs.value[idx]
    if (tab.alive) {
      window.api.terminal.killSession(tab.id)
    }

    tabs.value.splice(idx, 1)

    if (activeTabId.value === tabId) {
      if (tabs.value.length > 0) {
        const nextIdx = Math.min(idx, tabs.value.length - 1)
        activeTabId.value = tabs.value[nextIdx].id
      } else {
        activeTabId.value = null
      }
    }
  }

  function switchTab(tabId: string) {
    activeTabId.value = tabId
  }

  function addLine(tabId: string, line: { type: 'input' | 'output' | 'error'; text: string }) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.lines.push(line)
    }
  }

  function clearTab(tabId: string) {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) {
      tab.lines = []
    }
  }

  return {
    tabs,
    activeTabId,
    activeTab,
    availableShells,
    defaultShellId,
    loadShells,
    setDefaultShell,
    createTab,
    closeTab,
    switchTab,
    addLine,
    clearTab
  }
})
