import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface OpenedFile {
  path: string
  name: string
  content: string
  modified: boolean
  language: string
}

export const useEditorStore = defineStore('editor', () => {
  const openedFiles = ref<OpenedFile[]>([])
  const activeFilePath = ref<string | null>(null)
  const clipboard = ref<{ path: string; operation: 'copy' | 'cut' } | null>(null)

  const activeFile = ref<OpenedFile | null>(null)

  function getLanguageByExt(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const map: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      vue: 'html',
      html: 'html',
      css: 'css',
      scss: 'scss',
      less: 'less',
      json: 'json',
      md: 'markdown',
      py: 'python',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
      toml: 'ini',
      env: 'ini'
    }
    return map[ext] || 'plaintext'
  }

  async function openFile(filePath: string) {
    const existing = openedFiles.value.find((f) => f.path === filePath)
    if (existing) {
      activeFilePath.value = filePath
      activeFile.value = existing
      return
    }

    const content = await window.api.fs.readFile(filePath)
    if (content === null) return

    const name = filePath.replace(/\\/g, '/').split('/').pop() || filePath
    const file: OpenedFile = {
      path: filePath,
      name,
      content,
      modified: false,
      language: getLanguageByExt(name)
    }
    openedFiles.value.push(file)
    activeFilePath.value = filePath
    activeFile.value = file
  }

  function closeFile(filePath: string) {
    const idx = openedFiles.value.findIndex((f) => f.path === filePath)
    if (idx < 0) return
    openedFiles.value.splice(idx, 1)

    if (activeFilePath.value === filePath) {
      if (openedFiles.value.length > 0) {
        const nextIdx = Math.min(idx, openedFiles.value.length - 1)
        activeFilePath.value = openedFiles.value[nextIdx].path
        activeFile.value = openedFiles.value[nextIdx]
      } else {
        activeFilePath.value = null
        activeFile.value = null
      }
    }
  }

  function updateFileContent(filePath: string, content: string) {
    const file = openedFiles.value.find((f) => f.path === filePath)
    if (file) {
      file.content = content
      file.modified = true
      if (activeFilePath.value === filePath) {
        activeFile.value = file
      }
    }
  }

  async function saveFile(filePath: string) {
    const file = openedFiles.value.find((f) => f.path === filePath)
    if (!file) return
    await window.api.fs.writeFile(filePath, file.content)
    file.modified = false
  }

  function setClipboard(path: string, operation: 'copy' | 'cut') {
    clipboard.value = { path, operation }
  }

  return {
    openedFiles,
    activeFilePath,
    activeFile,
    clipboard,
    openFile,
    closeFile,
    updateFileContent,
    saveFile,
    setClipboard,
    getLanguageByExt
  }
})
