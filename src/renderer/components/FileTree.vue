<template>
  <div class="file-tree">
    <div class="tree-header">
      <span class="tree-title">资源管理器</span>
      <div class="tree-actions">
        <t-popup trigger="click" :overlay-style="{ background: 'var(--mawu-bg-tertiary)', border: '1px solid var(--mawu-border)' }">
          <template #content>
            <div class="context-menu">
              <div class="context-item" @click="newFile(null)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                <span>新建文件</span>
              </div>
              <div class="context-item" @click="newFolder(null)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                <span>新建文件夹</span>
              </div>
            </div>
          </template>
          <div class="action-btn" title="新建">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
        </t-popup>
        <div class="action-btn" @click="refreshTree" title="刷新">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="tree-content">
      <div
        v-for="item in treeData"
        :key="item.path"
        class="tree-node"
      >
        <TreeNode
          :item="item"
          :depth="0"
          :active-path="editorStore.activeFilePath"
          :clipboard="editorStore.clipboard"
          @select="handleSelect"
          @contextmenu.prevent="showContextMenu($event, item)"
        />
      </div>
    </div>

    <!-- Context Menu -->
    <div
      v-if="contextMenu.visible"
      class="custom-context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <div class="ctx-item" @click="newFile(contextMenu.item)">新建文件</div>
      <div class="ctx-item" @click="newFolder(contextMenu.item)">新建文件夹</div>
      <div class="ctx-sep" v-if="contextMenu.item"></div>
      <div class="ctx-item" v-if="contextMenu.item" @click="copyItem">复制</div>
      <div class="ctx-item" v-if="contextMenu.item" @click="cutItem">剪切</div>
      <div class="ctx-item" v-if="editorStore.clipboard" @click="pasteItem">粘贴</div>
      <div class="ctx-sep" v-if="contextMenu.item"></div>
      <div class="ctx-item" v-if="contextMenu.item" @click="renameItem">重命名</div>
      <div class="ctx-item danger" v-if="contextMenu.item" @click="deleteItem">删除</div>
      <div class="ctx-sep" v-if="contextMenu.item"></div>
      <div class="ctx-item" v-if="contextMenu.item" @click="openInExplorer">在资源管理器中打开</div>
      <div class="ctx-item" v-if="contextMenu.item" @click="openTerminalHere">在此处打开命令行</div>
      <div class="ctx-sep" v-if="contextMenu.item"></div>
      <div class="ctx-item" v-if="contextMenu.item && contextMenu.item.isFile" @click="translateFile('zh')">🌐 翻译当前文件为中文</div>
      <div class="ctx-item" v-if="contextMenu.item && contextMenu.item.isFile" @click="translateFile('en')">🌐 翻译当前文件为英文</div>
      <div class="ctx-sep" v-if="contextMenu.item"></div>
      <div class="ctx-item" v-if="contextMenu.item && contextMenu.item.isFile" @click="auditFile">🛡️ 检查当前文件缺陷与漏洞</div>
      <div class="ctx-item" v-if="contextMenu.item && contextMenu.item.isDirectory" @click="auditDirectory">🛡️ 检查当前目录缺陷与漏洞</div>
      <div class="ctx-sep" v-if="contextMenu.item"></div>
      <div class="ctx-item" v-if="contextMenu.item" @click="generateReadme">✨ 撰写项目说明</div>
      <div class="ctx-item" v-if="contextMenu.item" @click="translateProject('zh')">🌐 翻译项目语言为中文</div>
      <div class="ctx-item" v-if="contextMenu.item" @click="translateProject('en')">🌐 翻译项目语言为英文</div>
    </div>

    <!-- Rename Dialog -->
    <t-dialog
      v-model:visible="showRename"
      header="重命名"
      :confirm-btn="{ content: '确定', theme: 'primary' }"
      @confirm="doRename"
      :theme="'dark'"
    >
      <t-input v-model="renameValue" placeholder="输入新名称" />
    </t-dialog>

    <!-- New File/Folder Dialog -->
    <t-dialog
      v-model:visible="showNewItem"
      :header="newItemType === 'file' ? '新建文件' : '新建文件夹'"
      :confirm-btn="{ content: '创建', theme: 'primary' }"
      @confirm="doCreateNew"
      :theme="'dark'"
    >
      <t-input v-model="newItemName" :placeholder="newItemType === 'file' ? 'filename.ts' : 'folder-name'" />
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useEditorStore } from '@/stores/editor'
import { useAiStore } from '@/stores/ai'
import { MessagePlugin } from 'tdesign-vue-next'
import TreeNode from './TreeNode.vue'

const projectStore = useProjectStore()
const editorStore = useEditorStore()
const aiStore = useAiStore()

interface TreeItem {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
  children?: TreeItem[]
  expanded?: boolean
  loading?: boolean
}

const treeData = ref<TreeItem[]>([])

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  item: null as TreeItem | null
})

const showRename = ref(false)
const renameValue = ref('')
const renameTarget = ref<TreeItem | null>(null)

const showNewItem = ref(false)
const newItemName = ref('')
const newItemType = ref<'file' | 'folder'>('file')
const newItemParent = ref<TreeItem | null>(null)

onMounted(() => {
  loadTree()
  document.addEventListener('click', () => { contextMenu.visible = false })
})

async function loadTree() {
  const project = projectStore.currentProject
  if (!project) return
  const entries = await window.api.fs.readdir(project.path)
  treeData.value = entries.map((e: any) => ({
    ...e,
    expanded: false,
    loading: false,
    children: e.isDirectory ? [] : undefined
  }))
}

async function loadChildren(item: TreeItem) {
  if (!item.isDirectory || item.loading) return
  item.loading = true
  const entries = await window.api.fs.readdir(item.path)
  item.children = entries.map((e: any) => ({
    ...e,
    expanded: false,
    loading: false,
    children: e.isDirectory ? [] : undefined
  }))
  item.expanded = true
  item.loading = false
}

function handleSelect(item: TreeItem) {
  if (item.isDirectory) {
    if (item.expanded) {
      item.expanded = false
    } else {
      loadChildren(item)
    }
  } else {
    editorStore.openFile(item.path)
  }
}

function showContextMenu(event: MouseEvent, item: TreeItem) {
  contextMenu.visible = true
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
  contextMenu.item = item
}

function newFile(parent: TreeItem | null) {
  newItemType.value = 'file'
  newItemParent.value = parent
  newItemName.value = ''
  showNewItem.value = true
  contextMenu.visible = false
}

function newFolder(parent: TreeItem | null) {
  newItemType.value = 'folder'
  newItemParent.value = parent
  newItemName.value = ''
  showNewItem.value = true
  contextMenu.visible = false
}

async function doCreateNew() {
  if (!newItemName.value.trim()) return
  const parent = newItemParent.value
  const basePath = parent?.isDirectory ? parent.path : projectStore.currentProject?.path
  if (!basePath) return
  const fullPath = basePath + '/' + newItemName.value.trim()

  let success = false
  if (newItemType.value === 'file') {
    success = await window.api.fs.createFile(fullPath)
  } else {
    success = await window.api.fs.mkdir(fullPath)
  }

  if (success) {
    refreshTree()
  } else {
    MessagePlugin.error('创建失败')
  }
  showNewItem.value = false
}

function copyItem() {
  if (contextMenu.item) {
    editorStore.setClipboard(contextMenu.item.path, 'copy')
  }
  contextMenu.visible = false
}

function cutItem() {
  if (contextMenu.item) {
    editorStore.setClipboard(contextMenu.item.path, 'cut')
  }
  contextMenu.visible = false
}

async function pasteItem() {
  const clip = editorStore.clipboard
  if (!clip || !projectStore.currentProject) return

  const targetDir = contextMenu.item?.isDirectory
    ? contextMenu.item.path
    : projectStore.currentProject.path

  const fileName = clip.path.replace(/\\/g, '/').split('/').pop()!
  const dest = targetDir + '/' + fileName

  if (clip.operation === 'copy') {
    await window.api.fs.copy(clip.path, dest)
  } else {
    await window.api.fs.rename(clip.path, dest)
    editorStore.clipboard = null
  }
  refreshTree()
  contextMenu.visible = false
}

function renameItem() {
  if (contextMenu.item) {
    renameTarget.value = contextMenu.item
    renameValue.value = contextMenu.item.name
    showRename.value = true
  }
  contextMenu.visible = false
}

async function doRename() {
  if (!renameTarget.value || !renameValue.value.trim()) return
  const dir = renameTarget.value.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
  const newPath = dir + '/' + renameValue.value.trim()
  const success = await window.api.fs.rename(renameTarget.value.path, newPath)
  if (success) {
    refreshTree()
  } else {
    MessagePlugin.error('重命名失败')
  }
  showRename.value = false
}

async function deleteItem() {
  if (!contextMenu.item) return
  const success = await window.api.fs.remove(contextMenu.item.path)
  if (success) {
    refreshTree()
  } else {
    MessagePlugin.error('删除失败')
  }
  contextMenu.visible = false
}

async function refreshTree() {
  await loadTree()
}

function openInExplorer() {
  if (!contextMenu.item) return
  const targetPath = contextMenu.item.isDirectory
    ? contextMenu.item.path
    : contextMenu.item.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
  window.api.openInExplorer(targetPath)
  contextMenu.visible = false
}

function openTerminalHere() {
  if (!contextMenu.item) return
  const targetPath = contextMenu.item.isDirectory
    ? contextMenu.item.path
    : contextMenu.item.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
  window.api.openTerminal(targetPath)
  contextMenu.visible = false
}

async function translateFile(targetLang: 'zh' | 'en') {
  contextMenu.visible = false
  if (!contextMenu.item || !contextMenu.item.isFile) return

  const langLabel = targetLang === 'zh' ? '中文' : '英文'
  MessagePlugin.info(`正在翻译文件为${langLabel}...`)

  const content = await window.api.fs.readFile(contextMenu.item.path)
  if (!content || !content.trim()) {
    MessagePlugin.error('文件内容为空')
    return
  }

  let prompt: string
  if (targetLang === 'zh') {
    prompt = `请完整识别以下代码文件内所有代码注释、界面文字、日志文案、配置文案、提示文本、变量注释、弹窗提示等全部非代码逻辑文字内容，统一精准翻译成标准简体中文，保留原有代码结构、语法、变量名、函数名不变，仅替换语言文本，翻译通顺贴合开发项目专业用语。直接返回翻译后的完整文件内容，不要添加任何解释说明。

文件内容：
${content}`
  } else {
    prompt = `请完整识别以下代码文件内所有中文注释、界面中文、中文提示、中文文案、配置中文、弹窗中文等全部中文文本内容，统一翻译成标准正式商务技术英文，严格保留项目代码结构、语法、变量与函数名称不动，用词贴合行业开发专业术语，语句简洁规范。直接返回翻译后的完整文件内容，不要添加任何解释说明。

文件内容：
${content}`
  }

  const response = await aiStore.sendToAi(prompt)

  if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
    let translated = response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/)
    if (codeMatch) {
      translated = codeMatch[1]
    }
    const success = await window.api.fs.writeFile(contextMenu.item.path, translated)
    if (success) {
      // Refresh file in editor if it's currently open
      if (editorStore.activeFilePath === contextMenu.item.path) {
        editorStore.openFile(contextMenu.item.path)
      }
      MessagePlugin.success('翻译完成')
    } else {
      MessagePlugin.error('写入文件失败')
    }
  } else {
    MessagePlugin.error(response || '翻译失败')
  }
}

function isProjectRoot(item: TreeItem) {
  const project = projectStore.currentProject
  if (!project) return false
  return item.path.replace(/\\/g, '/') === project.path.replace(/\\/g, '/')
}

async function collectProjectInfo(): Promise<string> {
  const project = projectStore.currentProject
  if (!project) return ''

  const files = await window.api.fs.readdir(project.path)
  const fileList = files.map((f: any) => f.isDirectory ? `📁 ${f.name}/` : `📄 ${f.name}`).join('\n')

  // Try to read package.json
  let packageInfo = ''
  try {
    const pkgContent = await window.api.fs.readFile(project.path + '/package.json')
    if (pkgContent) packageInfo = pkgContent
  } catch {}

  return `项目路径: ${project.path}\n项目名称: ${project.name}\n\n项目根目录文件列表:\n${fileList}${packageInfo ? `\n\npackage.json 内容:\n${packageInfo}` : ''}`
}

async function generateReadme() {
  contextMenu.visible = false
  const project = projectStore.currentProject
  if (!project) return

  MessagePlugin.info('正在分析项目并生成 README...')

  const projectInfo = await collectProjectInfo()

  const prompt = `请帮我撰写一份项目README文档，要求结构清晰、语言简洁，无需冗余内容，核心包含以下模块，每个模块内容贴合项目实际，通俗易懂，适配开发类/工具类/毕设类项目：
1.  项目介绍：简要说明项目名称、核心用途、开发初衷（1-2段即可，不用过长）；
2.  环境要求：明确项目运行所需的环境、依赖包/工具（简洁罗列，无需复杂说明）；
3.  安装与启动：步骤清晰，写出具体的安装命令、启动步骤，新手能直接跟着操作；
4.  核心功能：罗列3-5个核心功能，简要说明每个功能的作用（不用展开细节）；
5.  注意事项：写出1-3条关键注意点（如环境配置、启动异常处理）；
6.  免责说明（可选）：简单说明项目用途，非商业用途等。
整体风格简洁干练，符合开发者阅读习惯，避免口语化，内容贴合我的项目（可根据项目类型调整模块详略）。

以下是项目信息：
${projectInfo}`

  const response = await aiStore.sendToAi(prompt)

  if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
    let content = response
    const codeMatch = response.match(/```(?:markdown|md)?\n([\s\S]*?)```/)
    if (codeMatch) {
      content = codeMatch[1]
    }
    const readmePath = project.path + '/README.md'
    const success = await window.api.fs.writeFile(readmePath, content)
    if (success) {
      refreshTree()
      editorStore.openFile(readmePath)
      MessagePlugin.success('README.md 已生成')
    } else {
      MessagePlugin.error('写入 README.md 失败')
    }
  } else {
    MessagePlugin.error(response || '生成失败')
  }
}

async function translateProject(targetLang: 'zh' | 'en') {
  contextMenu.visible = false
  const project = projectStore.currentProject
  if (!project) return

  const langLabel = targetLang === 'zh' ? '中文' : '英文'
  MessagePlugin.info(`正在扫描项目文件，准备翻译为${langLabel}...`)

  const allFiles = await window.api.fs.readdirRecursive(project.path)
  if (!allFiles || allFiles.length === 0) {
    MessagePlugin.error('未找到可翻译的文件')
    return
  }

  // Read all file contents
  const fileEntries: Array<{ path: string; relPath: string; content: string }> = []
  for (const f of allFiles) {
    const content = await window.api.fs.readFile(f.path)
    if (content && content.trim()) {
      fileEntries.push({ path: f.path, relPath: f.relPath, content })
    }
  }

  if (fileEntries.length === 0) {
    MessagePlugin.error('所有文件均为空')
    return
  }

  // Process files in batches of 5
  const batchSize = 5
  let translatedCount = 0

  for (let i = 0; i < fileEntries.length; i += batchSize) {
    const batch = fileEntries.slice(i, i + batchSize)
    const batchLabel = `(${Math.min(i + batchSize, fileEntries.length)}/${fileEntries.length})`
    MessagePlugin.info(`正在翻译 ${batchLabel}...`)

    const fileInfos = batch.map(f => `--- 文件: ${f.relPath} ---\n${f.content}`).join('\n\n')

    let prompt: string
    if (targetLang === 'zh') {
      prompt = `请完整识别当前整个项目内所有代码注释、界面文字、日志文案、配置文案、提示文本、变量注释、弹窗提示等全部非代码逻辑文字内容，统一精准翻译成标准简体中文，保留原有代码结构、语法、变量名、函数名不变，仅替换语言文本，翻译通顺贴合开发项目专业用语。

请严格按以下格式返回每个文件的翻译结果，不要遗漏任何文件：
===FILE: 文件相对路径===
翻译后的完整文件内容
===ENDFILE===

以下是所有文件内容：
${fileInfos}`
    } else {
      prompt = `请完整识别当前整个项目内所有中文注释、界面中文、中文提示、中文文案、配置中文、弹窗中文等全部中文文本内容，统一翻译成标准正式商务技术英文，严格保留项目代码结构、语法、变量与函数名称不动，用词贴合行业开发专业术语，语句简洁规范。

请严格按以下格式返回每个文件的翻译结果，不要遗漏任何文件：
===FILE: 文件相对路径===
翻译后的完整文件内容
===ENDFILE===

以下是所有文件内容：
${fileInfos}`
    }

    const response = await aiStore.sendToAi(prompt)

    if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
      // Parse the response and extract file contents
      const fileRegex = /===FILE:\s*(.+?)===\n([\s\S]*?)===ENDFILE===/g
      let match
      while ((match = fileRegex.exec(response)) !== null) {
        const relPath = match[1].trim()
        let newContent = match[2]
        // Remove trailing newline if present
        if (newContent.endsWith('\n')) {
          newContent = newContent.slice(0, -1)
        }
        const fileEntry = batch.find(f => f.relPath === relPath)
        if (fileEntry && newContent.trim()) {
          // Extract from code block if wrapped
          let finalContent = newContent
          const codeMatch = newContent.match(/```[\w]*\n([\s\S]*?)```/)
          if (codeMatch) {
            finalContent = codeMatch[1]
          }
          const success = await window.api.fs.writeFile(fileEntry.path, finalContent)
          if (success) translatedCount++
        }
      }
    }
  }

  refreshTree()
  if (translatedCount > 0) {
    MessagePlugin.success(`翻译完成，共更新 ${translatedCount} 个文件`)
  } else {
    MessagePlugin.warning('未检测到需要翻译的内容')
  }
}

async function auditFile() {
  contextMenu.visible = false
  if (!contextMenu.item || !contextMenu.item.isFile) return

  MessagePlugin.info('正在分析文件安全漏洞...')

  const content = await window.api.fs.readFile(contextMenu.item.path)
  if (!content || !content.trim()) {
    MessagePlugin.error('文件内容为空')
    return
  }

  const prompt = `请对当前文件进行专业安全审计，严格按照以下格式输出所有安全缺陷与代码漏洞：

1. 漏洞位置：精确到行号/函数/代码片段
2. 漏洞原始代码：粘贴存在漏洞的完整代码
3. 漏洞类型：如SQL注入、XSS、命令注入、文件上传漏洞、越权访问、敏感信息泄露、弱加密、逻辑漏洞等
4. 漏洞危害：简要说明风险等级与影响
5. 漏洞修复建议：给出可直接使用的修复代码
6. 漏洞复现Payload/EXP：提供可触发漏洞的测试代码、参数或请求示例

要求：只输出真实可验证的高危/中危安全漏洞，不输出语法警告、格式建议。

文件 ${contextMenu.item.name} 的内容如下：
\`\`\`
${content}
\`\`\``

  const response = await aiStore.sendToAi(prompt)

  if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
    const reportName = `security-audit-${contextMenu.item.name}.md`
    const project = projectStore.currentProject
    const reportPath = project ? project.path + '/' + reportName : contextMenu.item.path.replace(/[^/\\]+$/, reportName)
    const success = await window.api.fs.writeFile(reportPath, response)
    if (success) {
      refreshTree()
      editorStore.openFile(reportPath)
      MessagePlugin.success('安全审计报告已生成')
    } else {
      MessagePlugin.error('写入报告失败')
    }
  } else {
    MessagePlugin.error(response || '审计失败')
  }
}

async function auditDirectory() {
  contextMenu.visible = false
  if (!contextMenu.item || !contextMenu.item.isDirectory) return

  MessagePlugin.info('正在扫描目录文件，准备安全审计...')

  const allFiles = await window.api.fs.readdirRecursive(contextMenu.item.path)
  if (!allFiles || allFiles.length === 0) {
    MessagePlugin.error('目录下未找到文件')
    return
  }

  // Read all file contents
  const fileEntries: Array<{ path: string; relPath: string; content: string }> = []
  for (const f of allFiles) {
    const content = await window.api.fs.readFile(f.path)
    if (content && content.trim()) {
      fileEntries.push({ path: f.path, relPath: f.relPath, content })
    }
  }

  if (fileEntries.length === 0) {
    MessagePlugin.error('所有文件均为空')
    return
  }

  const batchSize = 5
  let allReports: string[] = [`# 安全审计报告\n\n目录：${contextMenu.item.name}\n文件数：${fileEntries.length}\n\n---\n`]

  for (let i = 0; i < fileEntries.length; i += batchSize) {
    const batch = fileEntries.slice(i, i + batchSize)
    const batchLabel = `(${Math.min(i + batchSize, fileEntries.length)}/${fileEntries.length})`
    MessagePlugin.info(`正在审计 ${batchLabel}...`)

    const fileInfos = batch.map(f => `--- 文件: ${f.relPath} ---\n${f.content}`).join('\n\n')

    const prompt = `请对当前目录下所有代码文件进行全面安全审计，逐个文件输出安全漏洞，严格遵循以下格式：

1. 文件名与路径
2. 漏洞位置：行号/函数
3. 漏洞原始代码：粘贴漏洞代码片段
4. 漏洞类型：SQL注入 / XSS / 命令注入 / 文件包含 / 越权 / 未授权访问 / 敏感信息泄露 等
5. 漏洞危害：说明影响范围与风险等级
6. 修复建议：提供可直接替换的安全代码
7. 漏洞复现Payload/EXP：提供测试用Payload、请求参数或利用代码

要求：只输出真实安全漏洞，不输出代码风格建议、语法优化等非安全类问题。如果某个文件没有安全漏洞，跳过该文件即可。

以下是所有文件内容：
${fileInfos}`

    const response = await aiStore.sendToAi(prompt)

    if (response && response !== '请先配置AI模型' && !response.startsWith('请求失败')) {
      allReports.push(response)
    }
  }

  const fullReport = allReports.join('\n\n---\n\n')
  const project = projectStore.currentProject
  const reportName = `security-audit-${contextMenu.item.name}.md`
  const reportPath = project ? project.path + '/' + reportName : contextMenu.item.path + '/' + reportName
  const success = await window.api.fs.writeFile(reportPath, fullReport)

  if (success) {
    refreshTree()
    editorStore.openFile(reportPath)
    MessagePlugin.success('安全审计报告已生成')
  } else {
    MessagePlugin.error('写入报告失败')
  }
}
</script>

<style scoped>
.file-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--mawu-text-secondary);
}

.tree-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  color: var(--mawu-text-muted);
  transition: all 0.15s;
}

.action-btn:hover {
  color: var(--mawu-text-primary);
  background: var(--mawu-bg-hover);
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.custom-context-menu {
  position: fixed;
  z-index: 1000;
  background: var(--mawu-bg-tertiary);
  border: 1px solid var(--mawu-border);
  border-radius: 8px;
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.ctx-item {
  padding: 6px 12px;
  font-size: 12px;
  color: var(--mawu-text-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.ctx-item:hover {
  background: var(--mawu-bg-hover);
}

.ctx-item.danger:hover {
  background: rgba(255, 68, 102, 0.15);
  color: var(--mawu-error);
}

.ctx-sep {
  height: 1px;
  background: var(--mawu-border);
  margin: 4px 8px;
}

.context-menu {
  min-width: 140px;
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--mawu-text-primary);
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.context-item:hover {
  background: var(--mawu-bg-hover);
}
</style>
