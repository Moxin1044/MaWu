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

  // Dynamic import Monaco Editor
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
  })

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
