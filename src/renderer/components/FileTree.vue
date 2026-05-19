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
import { MessagePlugin } from 'tdesign-vue-next'
import TreeNode from './TreeNode.vue'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

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
