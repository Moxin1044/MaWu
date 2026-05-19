<template>
  <div class="code-editor" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useAiStore } from '@/stores/ai'

const editorStore = useEditorStore()
const aiStore = useAiStore()

const editorContainer = ref<HTMLElement | null>(null)
let editor: any = null
let monacoInstance: any = null
let aiInlineDecoration: string[] = []

onMounted(async () => {
  if (!editorContainer.value) return

  const monaco = await import('monaco-editor')
  monacoInstance = monaco

  // Self-contained workers for Vite
  self.MonacoEnvironment = {
    getWorker(_: any, label: string) {
      const getWorkerModule = (moduleUrl: string, label: string) => {
        return new Worker(
          (self as any).MonacoEnvironment.getWorkerUrl(moduleUrl),
          { type: 'module', name: label }
        )
      }
      switch (label) {
        case 'json':
          return getWorkerModule('/monaco-editor/esm/vs/language/json/json.worker?worker', label)
        case 'css':
        case 'scss':
        case 'less':
          return getWorkerModule('/monaco-editor/esm/vs/language/css/css.worker?worker', label)
        case 'html':
        case 'handlebars':
        case 'razor':
          return getWorkerModule('/monaco-editor/esm/vs/language/html/html.worker?worker', label)
        case 'typescript':
        case 'javascript':
          return getWorkerModule('/monaco-editor/esm/vs/language/typescript/ts.worker?worker', label)
        default:
          return getWorkerModule('/monaco-editor/esm/vs/editor/editor.worker?worker', label)
      }
    }
  }

  // Define custom dark theme
  monaco.editor.defineTheme('mawu-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5a5a7a', fontStyle: 'italic' },
      { token: 'keyword', foreground: '00d4ff' },
      { token: 'string', foreground: '00cc88' },
      { token: 'number', foreground: 'ffaa00' },
      { token: 'type', foreground: '3399ff' },
      { token: 'function', foreground: 'e0e0f0' },
      { token: 'variable', foreground: 'c0c0e0' },
    ],
    colors: {
      'editor.background': '#0d0d1a',
      'editor.foreground': '#e0e0f0',
      'editor.lineHighlightBackground': '#1a1a2e',
      'editor.selectionBackground': '#00d4ff33',
      'editorLineNumber.foreground': '#3a3a5a',
      'editorLineNumber.activeForeground': '#00d4ff',
      'editor.inactiveSelectionBackground': '#1a1a2e',
      'editorCursor.foreground': '#00d4ff',
      'editorIndentGuide.background': '#1a1a2e',
      'editorIndentGuide.activeBackground': '#2a2a4a',
      'editor.selectionHighlightBackground': '#00d4ff15',
      'editorWidget.background': '#1a1a2e',
      'editorWidget.border': '#2a2a4a',
    }
  })

  editor = monaco.editor.create(editorContainer.value, {
    value: editorStore.activeFile?.content || '',
    language: editorStore.activeFile?.language || 'typescript',
    theme: 'mawu-dark',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
    fontLigatures: true,
    minimap: { enabled: true, maxColumn: 80, scale: 1 },
    lineNumbers: 'on',
    glyphMargin: true,
    folding: true,
    foldingStrategy: 'auto',
    renderWhitespace: 'selection',
    bracketPairColorization: { enabled: true },
    autoIndent: 'advanced',
    formatOnPaste: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    scrollBeyondLastLine: false,
    padding: { top: 8, bottom: 8 },
    wordWrap: 'on',
    tabSize: 2,
    suggest: {
      showIcons: true,
      showStatusBar: true,
    },
    fixedOverflowWidgets: true,
    contextmenu: true,
  })

  // ====== Chinese context menu ======
  registerChineseContextMenu(monaco)

  // Content change handler
  editor.onDidChangeModelContent(() => {
    if (editor && editorStore.activeFilePath) {
      editorStore.updateFileContent(editorStore.activeFilePath, editor.getValue())
    }
  })

  // AI hint on glyph margin click
  editor.onMouseDown((e: any) => {
    if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
      const lineNumber = e.target.position?.lineNumber
      if (lineNumber && editor) {
        triggerAiHint(lineNumber)
      }
    }
  })

  // Save shortcut
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    if (editorStore.activeFilePath) {
      editorStore.saveFile(editorStore.activeFilePath)
    }
  })

  // Register AI glyph margin decoration
  updateGlyphMarginDecorations()
})

function registerChineseContextMenu(monaco: any) {
  // Remove default context menu items and add Chinese ones
  editor.addAction({
    id: 'mawu-cut',
    label: '剪切',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 1,
    run: () => {
      document.execCommand('cut')
    }
  })

  editor.addAction({
    id: 'mawu-copy',
    label: '复制',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 2,
    run: () => {
      document.execCommand('copy')
    }
  })

  editor.addAction({
    id: 'mawu-paste',
    label: '粘贴',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 3,
    run: () => {
      document.execCommand('paste')
    }
  })

  editor.addAction({
    id: 'mawu-selectAll',
    label: '全选',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
    contextMenuGroupId: '9_cutcopypaste',
    contextMenuOrder: 4,
    run: () => {
      editor.setSelection(editor.getModel().getFullModelRange())
    }
  })

  editor.addAction({
    id: 'mawu-undo',
    label: '撤销',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
    contextMenuGroupId: '9_undo',
    contextMenuOrder: 1,
    run: () => {
      editor.trigger('keyboard', 'undo', null)
    }
  })

  editor.addAction({
    id: 'mawu-redo',
    label: '重做',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ],
    contextMenuGroupId: '9_undo',
    contextMenuOrder: 2,
    run: () => {
      editor.trigger('keyboard', 'redo', null)
    }
  })

  // AI actions
  editor.addAction({
    id: 'mawu-ai-annotate-full',
    label: '✨ AI 全文代码注释',
    contextMenuGroupId: '9_ai',
    contextMenuOrder: 1,
    run: () => {
      aiAnnotateFull()
    }
  })

  editor.addAction({
    id: 'mawu-ai-annotate-selection',
    label: '✨ AI 代码注释（注释选中的代码）',
    contextMenuGroupId: '9_ai',
    contextMenuOrder: 2,
    run: () => {
      aiAnnotateSelection()
    }
  })

  editor.addAction({
    id: 'mawu-ai-explain',
    label: '✨ AI 解释代码',
    contextMenuGroupId: '9_ai',
    contextMenuOrder: 3,
    run: () => {
      aiExplainCode()
    }
  })

  editor.addAction({
    id: 'mawu-ai-optimize',
    label: '✨ AI 优化代码',
    contextMenuGroupId: '9_ai',
    contextMenuOrder: 4,
    run: () => {
      aiOptimizeCode()
    }
  })

  // Format
  editor.addAction({
    id: 'mawu-format',
    label: '格式化文档',
    keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
    contextMenuGroupId: '9_format',
    contextMenuOrder: 1,
    run: () => {
      editor.getAction('editor.action.formatDocument')?.run()
    }
  })

  // Find & replace
  editor.addAction({
    id: 'mawu-find',
    label: '查找',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
    contextMenuGroupId: '9_find',
    contextMenuOrder: 1,
    run: () => {
      editor.getAction('actions.find')?.run()
    }
  })

  editor.addAction({
    id: 'mawu-replace',
    label: '查找和替换',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH],
    contextMenuGroupId: '9_find',
    contextMenuOrder: 2,
    run: () => {
      editor.getAction('editor.action.startFindReplaceAction')?.run()
    }
  })

  // Comment toggle
  editor.addAction({
    id: 'mawu-toggle-comment',
    label: '切换行注释',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash],
    contextMenuGroupId: '9_comment',
    contextMenuOrder: 1,
    run: () => {
      editor.getAction('editor.action.commentLine')?.run()
    }
  })
}

// ====== AI Actions ======

async function aiAnnotateFull() {
  if (!editor || !monacoInstance) return
  const model = editor.getModel()
  if (!model) return

  const fullCode = model.getValue()
  if (!fullCode.trim()) return

  editor.setSelection(model.getFullModelRange())
  const decos = addProcessingDecoration(model.getFullModelRange())

  const response = await aiStore.sendToAi(
    `请为以下代码添加详细的中文注释，保留原始代码不变，只在需要注释的地方添加注释：\n\`\`\`\n${fullCode}\n\`\`\``,
    '你是一个专业的编程助手。请为代码添加清晰的中文注释，直接返回添加了注释的完整代码，不要添加任何解释说明。保持原有代码逻辑不变。'
  )

  editor.deltaDecorations(decos, [])

  if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
    // Extract code from markdown code blocks if present
    let code = response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/)
    if (codeMatch) {
      code = codeMatch[1]
    }
    model.setValue(code)
  }
}

async function aiAnnotateSelection() {
  if (!editor || !monacoInstance) return
  const model = editor.getModel()
  if (!model) return

  const selection = editor.getSelection()
  if (!selection || selection.isEmpty()) return

  const selectedCode = model.getValueInRange(selection)
  if (!selectedCode.trim()) return

  // Detect the minimum indentation of the selected code
  const selectedLines = selectedCode.split('\n')
  const minIndent = selectedLines.reduce((min, line) => {
    if (line.trim().length === 0) return min
    const indent = line.match(/^(\s*)/)?.[1] || ''
    return min === null ? indent.length : Math.min(min, indent.length)
  }, null as number | null)
  const baseIndent = minIndent !== null ? ' '.repeat(minIndent) : ''
  const targetIndent = minIndent !== null ? minIndent : 0

  const decos = addProcessingDecoration(selection)

  const response = await aiStore.sendToAi(
    `请为以下选中的代码添加详细的中文注释，保留原始代码不变，只在需要注释的地方添加注释，严格保持原有的缩进格式：\n\`\`\`\n${selectedCode}\n\`\`\``,
    '你是一个专业的编程助手。请为代码添加清晰的中文注释，直接返回添加了注释的完整代码，不要添加任何解释说明。保持原有代码逻辑和缩进不变。'
  )

  editor.deltaDecorations(decos, [])

  if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
    let code = response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/)
    if (codeMatch) {
      code = codeMatch[1]
    }
    // Fix indentation: detect AI code's base indent and re-align to original
    const codeLines = code.split('\n')
    // Remove leading/trailing empty lines from AI response
    while (codeLines.length > 0 && codeLines[0].trim().length === 0) codeLines.shift()
    while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim().length === 0) codeLines.pop()

    if (codeLines.length > 0 && targetIndent > 0) {
      // Detect the minimum indentation of AI response
      const aiMinIndent = codeLines.reduce((min, line) => {
        if (line.trim().length === 0) return min
        const indent = line.match(/^(\s*)/)?.[1] || ''
        return min === null ? indent.length : Math.min(min, indent.length)
      }, null as number | null)

      if (aiMinIndent !== null && aiMinIndent !== targetIndent) {
        const indentDiff = targetIndent - aiMinIndent
        const adjustedLines = codeLines.map(line => {
          if (line.trim().length === 0) return line
          if (indentDiff > 0) {
            return ' '.repeat(indentDiff) + line
          } else {
            // Remove extra indent
            const removeCount = -indentDiff
            const currentIndent = line.match(/^(\s*)/)?.[1] || ''
            if (currentIndent.length >= removeCount) {
              return line.substring(removeCount)
            }
            return line
          }
        })
        code = adjustedLines.join('\n')
      }
    } else {
      code = codeLines.join('\n')
    }

    editor.executeEdits('ai-annotate', [{
      range: selection,
      text: code,
      forceMoveMarkers: true
    }])
  }
}

async function aiExplainCode() {
  if (!editor || !monacoInstance) return
  const model = editor.getModel()
  if (!model) return

  const selection = editor.getSelection()
  const code = selection && !selection.isEmpty()
    ? model.getValueInRange(selection)
    : model.getValue()

  if (!code.trim()) return

  // Send to AI dialog
  aiStore.addChatMessage('user', `请解释以下代码：\n\`\`\`\n${code.substring(0, 2000)}\n\`\`\``)
  if (!aiStore.isChatOpen) aiStore.toggleChat()

  const response = await aiStore.sendToAi(
    `请解释以下代码的功能和逻辑：\n\`\`\`\n${code.substring(0, 2000)}\n\`\`\``,
    '你是一个专业的编程助手，请用中文清晰地解释代码。'
  )
  aiStore.addChatMessage('assistant', response)
}

async function aiOptimizeCode() {
  if (!editor || !monacoInstance) return
  const model = editor.getModel()
  if (!model) return

  const selection = editor.getSelection()
  if (!selection || selection.isEmpty()) return

  const selectedCode = model.getValueInRange(selection)
  if (!selectedCode.trim()) return

  const decos = addProcessingDecoration(selection)

  const response = await aiStore.sendToAi(
    `请优化以下代码，使其更高效、更易读：\n\`\`\`\n${selectedCode}\n\`\`\``,
    '你是一个专业的编程助手。请优化代码，直接返回优化后的完整代码，不要添加解释说明。'
  )

  editor.deltaDecorations(decos, [])

  if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
    let code = response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/)
    if (codeMatch) {
      code = codeMatch[1]
    }
    editor.executeEdits('ai-optimize', [{
      range: selection,
      text: code,
      forceMoveMarkers: true
    }])
  }
}

function addProcessingDecoration(range: any): string[] {
  return editor.deltaDecorations([], [{
    range,
    options: {
      isWholeLine: true,
      className: 'ai-processing-highlight',
      glyphMarginClassName: 'ai-glyph-active',
      overviewRuler: {
        color: '#00d4ff44',
        position: monacoInstance.editor.OverviewRulerLane.Full
      }
    }
  }])
}

watch(
  () => editorStore.activeFile,
  (newFile) => {
    if (!editor || !newFile || !monacoInstance) return
    const model = editor.getModel()
    if (model) {
      monacoInstance.editor.setModelLanguage(model, newFile.language)
      model.setValue(newFile.content)
    }
  }
)

function updateGlyphMarginDecorations() {
  if (!editor || !monacoInstance) return
  const model = editor.getModel()
  if (!model) return

  const lineCount = model.getLineCount()
  const decorations: any[] = []
  for (let i = 1; i <= lineCount; i++) {
    decorations.push({
      range: new monacoInstance.Range(i, 1, i, 1),
      options: {
        glyphMarginClassName: 'ai-glyph',
        glyphMarginHoverMessage: { value: '点击触发 AI 提示' },
        stickiness: monacoInstance.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    })
  }
  aiInlineDecoration = editor.deltaDecorations(aiInlineDecoration, decorations)
}

async function triggerAiHint(lineNumber: number) {
  if (!editor || !aiStore.activeModel || !monacoInstance) return

  const model = editor.getModel()
  if (!model) return

  const lineContent = model.getLineContent(lineNumber)
  const fullContent = model.getValue()
  const lines = fullContent.split('\n')
  const contextLines = lines.slice(Math.max(0, lineNumber - 10), lineNumber + 5).join('\n')

  const decorations = editor.deltaDecorations([], [
    {
      range: new monacoInstance.Range(lineNumber, 1, lineNumber, 1),
      options: {
        isWholeLine: true,
        className: 'ai-line-highlight',
        glyphMarginClassName: 'ai-glyph-active',
      }
    }
  ])

  const response = await aiStore.sendToAi(
    `请对以下代码的第${lineNumber}行进行提示或补全：\n\`\`\`\n${contextLines}\n\`\`\`\n当前行内容: ${lineContent}`,
    '你是一个专业的编程助手，请给出简洁的代码建议。只返回代码，不要解释。'
  )

  editor.deltaDecorations(decorations, [])

  if (response && response !== '请先配置AI模型') {
    const suggestDecorations = editor.deltaDecorations([], [
      {
        range: new monacoInstance.Range(lineNumber, lineContent.length + 1, lineNumber, lineContent.length + 1),
        options: {
          after: {
            content: '  ' + response.trim(),
            inlineClassName: 'ai-suggestion',
          },
          hoverMessage: { value: '**AI 建议** - 按 Tab 接受' }
        }
      }
    ])

    setTimeout(() => {
      if (editor) {
        editor.deltaDecorations(suggestDecorations, [])
      }
    }, 8000)
  }
}

onBeforeUnmount(() => {
  editor?.dispose()
})
</script>

<style>
/* AI glyph margin icon */
.ai-glyph {
  cursor: pointer;
  margin-left: 4px;
}

.ai-glyph::after {
  content: '';
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 212, 255, 0.15);
  margin-top: 8px;
  transition: all 0.2s;
}

.monaco-editor .margin-view-overlays:hover .ai-glyph::after {
  background: rgba(0, 212, 255, 0.5);
  box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
}

.ai-glyph-active::after {
  background: var(--mawu-accent) !important;
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.5) !important;
}

.ai-line-highlight {
  background: rgba(0, 212, 255, 0.04) !important;
}

.ai-processing-highlight {
  background: rgba(0, 212, 255, 0.06) !important;
}

.ai-suggestion {
  color: rgba(0, 212, 255, 0.5) !important;
  font-style: italic;
}
</style>

<style scoped>
.code-editor {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
