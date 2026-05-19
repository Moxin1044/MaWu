<template>
  <div class="home-view">
    <div class="home-bg">
      <div class="grid-lines"></div>
    </div>

    <!-- Close button -->
    <div class="home-close-btn" @click="closeApp" title="关闭">
      <svg width="14" height="14" viewBox="0 0 14 14">
        <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.2"/>
        <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.2"/>
      </svg>
    </div>

    <div class="home-content fade-in">
      <!-- Logo & Title -->
      <div class="home-header">
        <div class="logo-wrapper">
          <div class="logo-icon">
            <img src="/icon.png" width="48" height="48" alt="码悟" />
          </div>
          <h1 class="app-title">码悟</h1>
        </div>
        <p class="app-subtitle">极简 AI 代码编辑器</p>
      </div>

      <!-- Actions -->
      <div class="home-actions">
        <div class="action-card" @click="openProject">
          <div class="action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </div>
          <div class="action-text">
            <span class="action-title">打开项目</span>
            <span class="action-desc">选择本地文件夹</span>
          </div>
        </div>

        <div class="action-card" @click="createProject">
          <div class="action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </div>
          <div class="action-text">
            <span class="action-title">新建项目</span>
            <span class="action-desc">创建新的项目目录</span>
          </div>
        </div>

        <div class="action-card" @click="showCloneDialog = true">
          <div class="action-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><path d="M6 9v12"/>
            </svg>
          </div>
          <div class="action-text">
            <span class="action-title">Git 克隆</span>
            <span class="action-desc">从远程仓库克隆</span>
          </div>
        </div>
      </div>

      <!-- Recent Projects -->
      <div class="recent-projects" v-if="projectStore.recentProjects.length > 0">
        <h3 class="section-title">最近打开</h3>
        <div class="project-list">
          <div
            v-for="proj in projectStore.recentProjects"
            :key="proj.path"
            class="project-item"
            @click="enterProject(proj.name, proj.path)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            <div class="project-info">
              <span class="project-name">{{ proj.name }}</span>
              <span class="project-path">{{ proj.path }}</span>
            </div>
            <div class="project-remove" @click.stop="removeRecent(proj.path)" title="移除记录">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/>
                <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="1.2"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Clone Dialog -->
    <t-dialog
      v-model:visible="showCloneDialog"
      header="Git 克隆"
      :confirm-btn="{ content: '克隆', theme: 'primary' }"
      @confirm="doClone"
      :theme="'dark'"
    >
      <t-form layout="vertical">
        <t-form-item label="仓库地址">
          <t-input v-model="cloneUrl" placeholder="https://github.com/user/repo.git" />
        </t-form-item>
        <t-form-item label="本地路径">
          <div style="display: flex; gap: 8px; width: 100%">
            <t-input v-model="clonePath" placeholder="克隆目标路径" style="flex: 1" />
            <t-button variant="outline" @click="browseClonePath">浏览</t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- New Project Dialog -->
    <t-dialog
      v-model:visible="showNewDialog"
      header="新建项目"
      :confirm-btn="{ content: '创建', theme: 'primary' }"
      @confirm="doCreate"
      :theme="'dark'"
    >
      <t-form layout="vertical">
        <t-form-item label="项目名称">
          <t-input v-model="newProjectName" placeholder="my-project" />
        </t-form-item>
        <t-form-item label="项目路径">
          <div style="display: flex; gap: 8px; width: 100%">
            <t-input v-model="newProjectPath" style="flex: 1" />
            <t-button variant="outline" @click="browseNewPath">浏览</t-button>
          </div>
        </t-form-item>
        <t-form-item label="初始化 Git">
          <t-switch v-model="initGit" />
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const projectStore = useProjectStore()

const showCloneDialog = ref(false)
const showNewDialog = ref(false)
const cloneUrl = ref('')
const clonePath = ref('')
const newProjectName = ref('')
const newProjectPath = ref('')
const initGit = ref(true)

onMounted(() => {
  newProjectPath.value = projectStore.homeDir + '/MaWu'
  clonePath.value = projectStore.homeDir + '/MaWu'
})

async function openProject() {
  const dir = await window.api.openDirectory()
  if (dir) {
    const name = dir.replace(/\\/g, '/').split('/').pop() || dir
    enterProject(name, dir)
  }
}

function enterProject(name: string, path: string) {
  projectStore.openProject(name, path)
  router.push('/editor')
}

function createProject() {
  showNewDialog.value = true
}

async function browseNewPath() {
  const dir = await window.api.openDirectory()
  if (dir) {
    newProjectPath.value = dir
  }
}

async function browseClonePath() {
  const dir = await window.api.openDirectory()
  if (dir) {
    clonePath.value = dir
  }
}

async function doCreate() {
  if (!newProjectName.value.trim()) {
    MessagePlugin.warning('请输入项目名称')
    return
  }
  const fullPath = newProjectPath.value + '/' + newProjectName.value.trim()
  const success = await window.api.fs.mkdir(fullPath)
  if (success) {
    if (initGit.value) {
      await window.api.git.init(fullPath)
    }
    enterProject(newProjectName.value.trim(), fullPath)
  } else {
    MessagePlugin.error('项目创建失败')
  }
  showNewDialog.value = false
}

async function doClone() {
  if (!cloneUrl.value.trim()) {
    MessagePlugin.warning('请输入仓库地址')
    return
  }
  const repoName = cloneUrl.value.split('/').pop()?.replace('.git', '') || 'repo'
  const localPath = clonePath.value + '/' + repoName
  const result = await window.api.git.clone(cloneUrl.value, localPath)
  if (result === true) {
    enterProject(repoName, localPath)
  } else {
    MessagePlugin.error('克隆失败: ' + result)
  }
  showCloneDialog.value = false
}

function closeApp() {
  window.api.windowClose()
}

function removeRecent(path: string) {
  projectStore.removeRecentProject(path)
}
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--mawu-bg-deep);
}

.home-close-btn {
  position: absolute;
  top: 12px;
  right: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: var(--mawu-text-muted);
  transition: all 0.15s;
  z-index: 10;
}

.home-close-btn:hover {
  background: var(--mawu-error);
  color: #fff;
}

.home-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0.3;
}

.grid-lines {
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(var(--mawu-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--mawu-border) 1px, transparent 1px);
  background-size: 60px 60px;
}

.home-content {
  position: relative;
  z-index: 1;
  max-width: 640px;
  width: 100%;
  padding: 48px;
}

.home-header {
  text-align: center;
  margin-bottom: 56px;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
}

.logo-icon {
  color: var(--mawu-accent);
}

.app-title {
  font-size: 42px;
  font-weight: 700;
  background: var(--mawu-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 4px;
}

.app-subtitle {
  color: var(--mawu-text-secondary);
  font-size: 15px;
  letter-spacing: 2px;
}

.home-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 28px 16px;
  border-radius: 12px;
  background: var(--mawu-bg-secondary);
  border: 1px solid var(--mawu-border);
  cursor: pointer;
  transition: all 0.25s;
}

.action-card:hover {
  background: var(--mawu-bg-tertiary);
  border-color: var(--mawu-accent);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.08);
  transform: translateY(-2px);
}

.action-icon {
  color: var(--mawu-accent);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0, 212, 255, 0.08);
}

.action-text {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--mawu-text-primary);
}

.action-desc {
  font-size: 12px;
  color: var(--mawu-text-muted);
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--mawu-text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--mawu-text-secondary);
  position: relative;
}

.project-item:hover {
  background: var(--mawu-bg-tertiary);
  color: var(--mawu-accent);
}

.project-remove {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s;
  color: var(--mawu-text-muted);
}

.project-item:hover .project-remove {
  opacity: 1;
}

.project-remove:hover {
  color: var(--mawu-error);
  background: rgba(255, 77, 79, 0.1);
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.project-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--mawu-text-primary);
}

.project-path {
  font-size: 11px;
  color: var(--mawu-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
