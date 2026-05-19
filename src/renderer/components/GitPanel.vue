<template>
  <div class="git-panel">
    <div class="panel-header">
      <span class="panel-title">源代码管理</span>
      <div class="panel-actions">
        <div class="action-btn" @click="refreshStatus" title="刷新">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="panel-body">
      <!-- Branch info -->
      <div class="branch-info" v-if="gitStatus">
        <div class="branch-name">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mawu-accent)" stroke-width="1.5">
            <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="18" r="3"/><circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 01-9 9"/>
          </svg>
          <span>{{ gitStatus.current }}</span>
          <span class="sync-info" v-if="gitStatus.ahead || gitStatus.behind">
            <span v-if="gitStatus.ahead">↑{{ gitStatus.ahead }}</span>
            <span v-if="gitStatus.behind">↓{{ gitStatus.behind }}</span>
          </span>
        </div>
      </div>

      <!-- Not a repo -->
      <div class="empty-state" v-if="!isRepo">
        <p>不是 Git 仓库</p>
        <t-button size="small" variant="text" @click="initRepo" theme="primary">初始化仓库</t-button>
      </div>

      <!-- Changes -->
      <div v-if="gitStatus && gitStatus.files.length > 0">
        <div class="section-label">更改 ({{ gitStatus.files.length }})</div>
        <div
          v-for="file in gitStatus.files"
          :key="file.path"
          class="change-item"
        >
          <span class="change-path">{{ file.path }}</span>
          <span class="change-badge" :class="getChangeClass(file)">{{ getChangeLabel(file) }}</span>
          <t-button size="small" variant="text" @click="stageFile(file.path)" class="stage-btn">+</t-button>
        </div>
      </div>

      <!-- Commit -->
      <div class="commit-area" v-if="gitStatus">
        <t-input
          v-model="commitMessage"
          placeholder="提交信息"
          size="small"
          @keydown.enter="doCommit"
        />
        <t-button size="small" class="btn-gradient commit-btn" @click="doCommit" :disabled="!commitMessage.trim()">
          提交
        </t-button>
      </div>

      <!-- Log -->
      <div v-if="gitLog.length > 0">
        <div class="section-label">提交记录</div>
        <div v-for="entry in gitLog" :key="entry.hash" class="log-entry">
          <span class="log-msg">{{ entry.message }}</span>
          <span class="log-author">{{ entry.author_name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import { MessagePlugin } from 'tdesign-vue-next'

const projectStore = useProjectStore()

const gitStatus = ref<any>(null)
const gitLog = ref<any[]>([])
const isRepo = ref(false)
const commitMessage = ref('')

onMounted(() => {
  refreshStatus()
})

async function refreshStatus() {
  if (!projectStore.currentProject) return
  isRepo.value = await window.api.git.isRepo(projectStore.currentProject.path)
  if (isRepo.value) {
    gitStatus.value = await window.api.git.status(projectStore.currentProject.path)
    gitLog.value = await window.api.git.log(projectStore.currentProject.path, 20)
  }
}

async function initRepo() {
  if (!projectStore.currentProject) return
  await window.api.git.init(projectStore.currentProject.path)
  refreshStatus()
}

async function stageFile(filePath?: string) {
  if (!projectStore.currentProject) return
  await window.api.git.add(projectStore.currentProject.path, filePath)
  refreshStatus()
}

async function doCommit() {
  if (!projectStore.currentProject || !commitMessage.value.trim()) return
  const success = await window.api.git.commit(projectStore.currentProject.path, commitMessage.value)
  if (success) {
    commitMessage.value = ''
    refreshStatus()
    MessagePlugin.success('提交成功')
  } else {
    MessagePlugin.error('提交失败')
  }
}

function getChangeLabel(file: any): string {
  if (file.index === '?' || file.working_dir === '?') return 'U'
  const labels: Record<string, string> = { M: 'M', A: 'A', D: 'D', R: 'R' }
  return labels[file.working_dir] || labels[file.index] || file.working_dir || file.index
}

function getChangeClass(file: any): string {
  const label = getChangeLabel(file)
  if (label === 'M') return 'modified'
  if (label === 'A') return 'added'
  if (label === 'D') return 'deleted'
  if (label === 'U') return 'untracked'
  return ''
}
</script>

<style scoped>
.git-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
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

.panel-actions {
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

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}

.branch-info {
  padding: 8px;
  margin-bottom: 8px;
  background: var(--mawu-bg-tertiary);
  border-radius: 6px;
}

.branch-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--mawu-text-primary);
  font-weight: 500;
}

.sync-info {
  font-size: 11px;
  color: var(--mawu-text-muted);
  margin-left: auto;
}

.empty-state {
  text-align: center;
  padding: 24px 0;
  color: var(--mawu-text-muted);
  font-size: 13px;
}

.empty-state p {
  margin-bottom: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mawu-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 4px 4px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.change-item:hover {
  background: var(--mawu-bg-hover);
}

.change-path {
  flex: 1;
  color: var(--mawu-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.change-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  flex-shrink: 0;
}

.change-badge.modified {
  color: var(--mawu-warning);
  background: rgba(255, 170, 0, 0.1);
}

.change-badge.added {
  color: var(--mawu-success);
  background: rgba(0, 204, 136, 0.1);
}

.change-badge.deleted {
  color: var(--mawu-error);
  background: rgba(255, 68, 102, 0.1);
}

.change-badge.untracked {
  color: var(--mawu-text-muted);
  background: var(--mawu-bg-hover);
}

.stage-btn {
  font-size: 14px !important;
  color: var(--mawu-text-muted) !important;
  opacity: 0;
  transition: opacity 0.15s;
}

.change-item:hover .stage-btn {
  opacity: 1;
}

.commit-area {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.commit-area .t-input {
  flex: 1;
}

.commit-btn {
  flex-shrink: 0;
}

.log-entry {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-entry:hover {
  background: var(--mawu-bg-hover);
}

.log-msg {
  color: var(--mawu-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.log-author {
  color: var(--mawu-text-muted);
  font-size: 11px;
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
