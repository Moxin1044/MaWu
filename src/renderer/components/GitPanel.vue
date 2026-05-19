<template>
  <div class="git-panel">
    <div class="panel-header">
      <span class="panel-title">源代码管理</span>
      <div class="panel-actions">
        <div class="action-btn" @click="doPull" title="拉取">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
        <div class="action-btn" @click="doPush" title="推送">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 19V5M19 12l-7-7-7 7"/>
          </svg>
        </div>
        <div class="action-btn" @click="refreshStatus" title="刷新">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </div>
      </div>
    </div>

    <div class="panel-body">
      <!-- Not a repo -->
      <div class="empty-state" v-if="!isRepo">
        <p>不是 Git 仓库</p>
        <t-button size="small" variant="text" @click="initRepo" theme="primary">初始化仓库</t-button>
      </div>

      <template v-if="isRepo">
        <!-- Branch info + actions -->
        <div class="branch-info" v-if="gitStatus">
          <div class="branch-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mawu-accent)" stroke-width="1.5">
              <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="18" r="3"/><circle cx="6" cy="18" r="3"/>
              <path d="M18 9a9 9 0 01-9 9"/>
            </svg>
            <span class="branch-current" @click="showBranchManager = !showBranchManager">{{ gitStatus.current }}</span>
            <span class="sync-info" v-if="gitStatus.ahead || gitStatus.behind">
              <span v-if="gitStatus.ahead" class="ahead">↑{{ gitStatus.ahead }}</span>
              <span v-if="gitStatus.behind" class="behind">↓{{ gitStatus.behind }}</span>
            </span>
            <span class="branch-toggle" @click="showBranchManager = !showBranchManager" :class="{ open: showBranchManager }">▾</span>
          </div>
        </div>

        <!-- Branch Manager (collapsible) -->
        <div class="branch-manager" v-if="showBranchManager">
          <div class="sub-section-header">
            <span>分支管理</span>
            <t-button size="small" variant="text" @click="startCreateBranch" theme="primary">新建</t-button>
          </div>
          <div class="branch-list">
            <div v-for="br in branchList" :key="br" class="branch-item" :class="{ current: br === gitStatus?.current }">
              <span class="branch-item-name" @click="checkoutBranch(br)">
                <span v-if="br === gitStatus?.current" class="branch-dot"></span>
                {{ br }}
              </span>
              <div class="branch-item-actions" v-if="br !== gitStatus?.current">
                <span class="mini-btn" @click="startRenameBranch(br)" title="重命名">✎</span>
                <span class="mini-btn danger" @click="deleteBranch(br)" title="删除">✕</span>
              </div>
            </div>
          </div>
          <div class="inline-input-row" v-if="creatingBranch">
            <t-input v-model="newBranchName" size="small" placeholder="分支名称" @keydown.enter="doCreateBranch" />
            <t-button size="small" @click="doCreateBranch" theme="primary">创建</t-button>
            <t-button size="small" variant="text" @click="creatingBranch = false">取消</t-button>
          </div>
          <div class="inline-input-row" v-if="renamingBranch">
            <t-input v-model="renameBranchNewName" size="small" :placeholder="`重命名 ${renamingBranch}`" @keydown.enter="doRenameBranch" />
            <t-button size="small" @click="doRenameBranch" theme="primary">确定</t-button>
            <t-button size="small" variant="text" @click="renamingBranch = ''">取消</t-button>
          </div>
        </div>

        <!-- Remote Manager (collapsible) -->
        <div class="remote-section">
          <div class="sub-section-header" @click="showRemoteManager = !showRemoteManager">
            <span>远程仓库 <span class="count-badge" v-if="remotes.length">{{ remotes.length }}</span></span>
            <span class="collapse-icon" :class="{ open: showRemoteManager }">▾</span>
          </div>
          <div class="remote-manager" v-if="showRemoteManager">
            <div v-for="remote in remotes" :key="remote.name" class="remote-item">
              <div class="remote-info">
                <span class="remote-name">{{ remote.name }}</span>
                <span class="remote-url">{{ remote.refs.fetch }}</span>
              </div>
              <span class="mini-btn danger" @click="removeRemote(remote.name)" title="移除">✕</span>
            </div>
            <div class="inline-input-row" v-if="addingRemote">
              <t-input v-model="newRemoteName" size="small" placeholder="名称 (origin)" />
              <t-input v-model="newRemoteUrl" size="small" placeholder="URL" />
              <t-button size="small" @click="doAddRemote" theme="primary">添加</t-button>
              <t-button size="small" variant="text" @click="addingRemote = false">取消</t-button>
            </div>
            <t-button v-else size="small" variant="text" @click="addingRemote = true" theme="primary">添加远程仓库</t-button>
          </div>
        </div>

        <!-- Commit area -->
        <div class="commit-area" v-if="gitStatus">
          <div class="commit-type-row">
            <select class="commit-type-select" v-model="commitType">
              <option v-for="ct in commitTypes" :key="ct.value" :value="ct.value">{{ ct.label }}</option>
            </select>
            <t-input v-model="commitScope" placeholder="范围(可选)" size="small" class="scope-input" />
          </div>
          <div class="commit-desc-row">
            <t-input
              v-model="commitDesc"
              :placeholder="commitPlaceholder"
              size="small"
              @keydown.enter="doCommit"
              class="commit-input"
            />
            <t-button
              size="small"
              variant="text"
              @click="aiGenerateCommit"
              :loading="aiGenerating"
              title="AI 生成提交信息"
              theme="primary"
              class="ai-gen-btn"
            >✨</t-button>
          </div>
          <div class="commit-preview" v-if="commitPreview">
            <span class="preview-label">预览:</span>
            <code>{{ commitPreview }}</code>
          </div>
          <t-button size="small" class="btn-gradient commit-btn" @click="doCommit" :disabled="!commitDesc.trim()">
            提交
          </t-button>
        </div>

        <!-- Changes + Diff (below commit area) -->
        <div v-if="gitStatus && gitStatus.files.length > 0">
          <div class="section-label">更改 ({{ gitStatus.files.length }})</div>
          <div v-for="file in gitStatus.files" :key="file.path" class="change-group">
            <div class="change-item" @click="toggleDiff(file.path)">
              <span class="change-expand" :class="{ open: expandedDiffs.has(file.path) }">▸</span>
              <span class="change-path">{{ file.path }}</span>
              <span class="change-badge" :class="getChangeClass(file)">{{ getChangeLabel(file) }}</span>
              <span class="stage-btn" @click.stop="stageFile(file.path)" title="暂存">+</span>
              <span class="stage-btn unstage" @click.stop="unstageFile(file.path)" title="取消暂存">−</span>
            </div>
            <div class="diff-view" v-if="expandedDiffs.has(file.path)">
              <div v-if="diffLoading.has(file.path)" class="diff-loading">加载中...</div>
              <pre v-else class="diff-content">{{ fileDiffs[file.path] || '无差异' }}</pre>
            </div>
          </div>
        </div>

        <!-- Timeline history -->
        <div class="timeline-section" v-if="gitLog.length > 0">
          <div class="section-label">提交历史</div>
          <div class="timeline">
            <div v-for="(entry, idx) in gitLog" :key="entry.hash" class="timeline-entry">
              <div class="timeline-line" v-if="idx < gitLog.length - 1"></div>
              <div class="timeline-dot" :class="getCommitTypeClass(entry.message)"></div>
              <div class="timeline-content">
                <div class="timeline-msg">
                  <span class="commit-type-tag" :class="getCommitTypeClass(entry.message)">{{ getCommitTypeTag(entry.message) }}</span>
                  {{ getCommitPureMsg(entry.message) }}
                </div>
                <div class="timeline-meta">
                  <span class="timeline-hash">{{ entry.hash.slice(0, 7) }}</span>
                  <span class="timeline-author">{{ entry.author_name }}</span>
                  <span class="timeline-date">{{ formatDate(entry.date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useAiStore } from '@/stores/ai'
import { MessagePlugin } from 'tdesign-vue-next'

const projectStore = useProjectStore()
const aiStore = useAiStore()

const gitStatus = ref<any>(null)
const gitLog = ref<any[]>([])
const isRepo = ref(false)
const remotes = ref<any[]>([])
const branchList = ref<string[]>([])

// UI state
const showBranchManager = ref(false)
const showRemoteManager = ref(false)
const creatingBranch = ref(false)
const newBranchName = ref('')
const renamingBranch = ref('')
const renameBranchNewName = ref('')
const addingRemote = ref(false)
const newRemoteName = ref('')
const newRemoteUrl = ref('')

// Diff
const expandedDiffs = reactive(new Set<string>())
const fileDiffs = reactive<Record<string, string>>({})
const diffLoading = reactive(new Set<string>())

// Commit
const commitType = ref('feat')
const commitScope = ref('')
const commitDesc = ref('')
const aiGenerating = ref(false)

const commitTypes = [
  { value: 'feat', label: 'feat: 新功能' },
  { value: 'fix', label: 'fix: 修复' },
  { value: 'docs', label: 'docs: 文档' },
  { value: 'style', label: 'style: 样式' },
  { value: 'refactor', label: 'refactor: 重构' },
  { value: 'perf', label: 'perf: 性能' },
  { value: 'test', label: 'test: 测试' },
  { value: 'chore', label: 'chore: 构建/工具' },
  { value: 'ci', label: 'ci: 持续集成' },
  { value: 'revert', label: 'revert: 回退' }
]

const commitPlaceholder = computed(() => {
  const scope = commitScope.value ? `(${commitScope.value})` : ''
  return `${commitType.value}${scope}: 描述内容...`
})

const commitPreview = computed(() => {
  if (!commitDesc.value.trim()) return ''
  const scope = commitScope.value ? `(${commitScope.value})` : ''
  return `${commitType.value}${scope}: ${commitDesc.value.trim()}`
})

onMounted(() => {
  refreshStatus()
})

watch(() => projectStore.currentProject, () => {
  refreshStatus()
})

async function refreshStatus() {
  if (!projectStore.currentProject) return
  const path = projectStore.currentProject.path
  isRepo.value = await window.api.git.isRepo(path)
  if (isRepo.value) {
    gitStatus.value = await window.api.git.status(path)
    gitLog.value = await window.api.git.log(path, 30)
    remotes.value = await window.api.git.getRemotes(path)
    const branches = await window.api.git.branches(path)
    branchList.value = branches?.all || []
    // Clear stale diffs
    for (const key of Object.keys(fileDiffs)) {
      if (!gitStatus.value.files.some((f: any) => f.path === key)) {
        delete fileDiffs[key]
        expandedDiffs.delete(key)
      }
    }
  }
}

async function toggleDiff(filePath: string) {
  if (expandedDiffs.has(filePath)) {
    expandedDiffs.delete(filePath)
    return
  }
  expandedDiffs.add(filePath)
  if (!fileDiffs[filePath]) {
    await loadDiff(filePath)
  }
}

async function loadDiff(filePath: string) {
  if (!projectStore.currentProject) return
  diffLoading.add(filePath)
  try {
    const diff = await window.api.git.diff(projectStore.currentProject.path, filePath)
    fileDiffs[filePath] = diff || '无差异'
  } catch {
    fileDiffs[filePath] = '无法获取差异'
  } finally {
    diffLoading.delete(filePath)
  }
}

async function initRepo() {
  if (!projectStore.currentProject) return
  await window.api.git.init(projectStore.currentProject.path)
  refreshStatus()
}

async function stageFile(filePath: string) {
  if (!projectStore.currentProject) return
  await window.api.git.add(projectStore.currentProject.path, filePath)
  refreshStatus()
}

async function unstageFile(filePath: string) {
  if (!projectStore.currentProject) return
  await window.api.git.reset(projectStore.currentProject.path, filePath)
  refreshStatus()
}

async function doCommit() {
  if (!projectStore.currentProject || !commitDesc.value.trim()) return
  const message = commitPreview.value
  const success = await window.api.git.commit(projectStore.currentProject.path, message)
  if (success) {
    commitDesc.value = ''
    commitScope.value = ''
    refreshStatus()
    MessagePlugin.success('提交成功')
  } else {
    MessagePlugin.error('提交失败')
  }
}

async function aiGenerateCommit() {
  if (!projectStore.currentProject || !aiStore.isConfigured) {
    MessagePlugin.warning('请先配置 AI 模型')
    return
  }
  if (!gitStatus.value?.files?.length) {
    MessagePlugin.warning('没有文件变动')
    return
  }

  aiGenerating.value = true
  try {
    // Collect all diffs
    const diffs: string[] = []
    for (const file of gitStatus.value.files) {
      const diff = await window.api.git.diff(projectStore.currentProject.path, file.path)
      if (diff) {
        diffs.push(`--- ${file.path} ---\n${diff.slice(0, 2000)}`)
      }
    }

    const prompt = `根据以下 Git diff 变动，生成一个符合 Conventional Commits 规范的提交信息。
只输出提交信息本身，不要解释，不要代码块包裹。格式如: feat(scope): 描述 或 fix: 描述

文件变动:
${diffs.join('\n\n')}`

    const result = await aiStore.sendToAi(prompt)
    // Parse the result: try to extract type, scope, desc
    const match = result.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/m)
    if (match) {
      const type = commitTypes.find(ct => ct.value === match[1])
      if (type) commitType.value = match[1]
      if (match[2]) commitScope.value = match[2]
      commitDesc.value = match[3].trim()
    } else {
      commitDesc.value = result.trim()
    }
  } catch (e: any) {
    MessagePlugin.error('AI 生成失败: ' + e.message)
  } finally {
    aiGenerating.value = false
  }
}

async function doPull() {
  if (!projectStore.currentProject) return
  const result = await window.api.git.pull(projectStore.currentProject.path)
  if (result === true) {
    MessagePlugin.success('拉取成功')
    refreshStatus()
  } else {
    MessagePlugin.warning(String(result))
  }
}

async function doPush() {
  if (!projectStore.currentProject) return
  const result = await window.api.git.push(projectStore.currentProject.path)
  if (result === true) {
    MessagePlugin.success('推送成功')
    refreshStatus()
  } else {
    MessagePlugin.warning(String(result))
  }
}

async function checkoutBranch(branch: string) {
  if (!projectStore.currentProject) return
  const success = await window.api.git.checkout(projectStore.currentProject.path, branch)
  if (success) {
    refreshStatus()
    MessagePlugin.success(`已切换到 ${branch}`)
  } else {
    MessagePlugin.error('切换分支失败')
  }
}

function startCreateBranch() {
  creatingBranch.value = true
  newBranchName.value = ''
}

async function doCreateBranch() {
  if (!projectStore.currentProject || !newBranchName.value.trim()) return
  const success = await window.api.git.createBranch(projectStore.currentProject.path, newBranchName.value.trim())
  if (success) {
    creatingBranch.value = false
    refreshStatus()
    MessagePlugin.success(`已创建并切换到 ${newBranchName.value}`)
  } else {
    MessagePlugin.error('创建分支失败')
  }
}

function startRenameBranch(branch: string) {
  renamingBranch.value = branch
  renameBranchNewName.value = ''
}

async function doRenameBranch() {
  if (!projectStore.currentProject || !renameBranchNewName.value.trim()) return
  const success = await window.api.git.renameBranch(projectStore.currentProject.path, renamingBranch.value, renameBranchNewName.value.trim())
  if (success) {
    renamingBranch.value = ''
    refreshStatus()
    MessagePlugin.success('分支已重命名')
  } else {
    MessagePlugin.error('重命名失败')
  }
}

async function deleteBranch(branch: string) {
  if (!projectStore.currentProject) return
  const success = await window.api.git.deleteBranch(projectStore.currentProject.path, branch)
  if (success) {
    refreshStatus()
    MessagePlugin.success(`已删除分支 ${branch}`)
  } else {
    MessagePlugin.error('删除分支失败')
  }
}

async function doAddRemote() {
  if (!projectStore.currentProject || !newRemoteName.value.trim() || !newRemoteUrl.value.trim()) return
  const result = await window.api.git.addRemote(projectStore.currentProject.path, newRemoteName.value.trim(), newRemoteUrl.value.trim())
  if (result === true) {
    addingRemote.value = false
    newRemoteName.value = ''
    newRemoteUrl.value = ''
    refreshStatus()
    MessagePlugin.success('远程仓库已添加')
  } else {
    MessagePlugin.warning(String(result))
  }
}

async function removeRemote(name: string) {
  if (!projectStore.currentProject) return
  const result = await window.api.git.removeRemote(projectStore.currentProject.path, name)
  if (result === true) {
    refreshStatus()
    MessagePlugin.success(`已移除 ${name}`)
  } else {
    MessagePlugin.warning(String(result))
  }
}

function getCommitTypeTag(msg: string): string {
  const match = msg.match(/^(\w+)(\(.+\))?:/)
  return match ? match[1] : 'other'
}

function getCommitPureMsg(msg: string): string {
  return msg.replace(/^\w+(\(.+\))?:\s*/, '')
}

function getCommitTypeClass(msg: string): string {
  const type = getCommitTypeTag(msg)
  const classMap: Record<string, string> = {
    feat: 'type-feat', fix: 'type-fix', docs: 'type-docs', style: 'type-style',
    refactor: 'type-refactor', perf: 'type-perf', test: 'type-test', chore: 'type-chore',
    ci: 'type-ci', revert: 'type-revert'
  }
  return classMap[type] || 'type-other'
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}小时前`
    const diffDay = Math.floor(diffHour / 24)
    if (diffDay < 30) return `${diffDay}天前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return dateStr
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

.panel-actions { display: flex; gap: 4px; }

.action-btn {
  width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; cursor: pointer;
  color: var(--mawu-text-muted); transition: all 0.15s;
}
.action-btn:hover { color: var(--mawu-text-primary); background: var(--mawu-bg-hover); }

.panel-body { flex: 1; overflow-y: auto; padding: 0 8px 8px; }

.empty-state { text-align: center; padding: 24px 0; color: var(--mawu-text-muted); font-size: 13px; }
.empty-state p { margin-bottom: 12px; }

/* Branch info */
.branch-info { padding: 8px; margin-bottom: 4px; background: var(--mawu-bg-tertiary); border-radius: 6px; }
.branch-row { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--mawu-text-primary); font-weight: 500; }
.branch-current { cursor: pointer; }
.branch-current:hover { color: var(--mawu-accent); }
.sync-info { font-size: 11px; margin-left: auto; display: flex; gap: 4px; }
.sync-info .ahead { color: var(--mawu-success); }
.sync-info .behind { color: var(--mawu-warning); }
.branch-toggle { cursor: pointer; font-size: 10px; color: var(--mawu-text-muted); transition: transform 0.2s; }
.branch-toggle.open { transform: rotate(180deg); }

/* Branch manager */
.branch-manager { padding: 6px 0; border-bottom: 1px solid var(--mawu-border); }
.sub-section-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; font-size: 11px; font-weight: 600; color: var(--mawu-text-secondary); cursor: pointer; }
.sub-section-header .collapse-icon { font-size: 10px; transition: transform 0.2s; }
.sub-section-header .collapse-icon.open { transform: rotate(180deg); }
.count-badge { background: var(--mawu-bg-hover); padding: 0 5px; border-radius: 8px; font-size: 10px; margin-left: 4px; }

.branch-list { padding: 0 4px; }
.branch-item { display: flex; align-items: center; justify-content: space-between; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
.branch-item:hover { background: var(--mawu-bg-hover); }
.branch-item.current { color: var(--mawu-accent); }
.branch-item-name { cursor: pointer; display: flex; align-items: center; gap: 6px; flex: 1; }
.branch-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--mawu-accent); flex-shrink: 0; }
.branch-item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
.branch-item:hover .branch-item-actions { opacity: 1; }

.mini-btn { font-size: 11px; cursor: pointer; padding: 0 4px; color: var(--mawu-text-muted); border-radius: 3px; }
.mini-btn:hover { color: var(--mawu-text-primary); background: var(--mawu-bg-hover); }
.mini-btn.danger:hover { color: var(--mawu-error); }

.inline-input-row { display: flex; gap: 4px; padding: 4px 8px; align-items: center; }
.inline-input-row .t-input { flex: 1; min-width: 0; }

/* Remote section */
.remote-section { border-bottom: 1px solid var(--mawu-border); }
.remote-manager { padding: 4px 8px 8px; }
.remote-item { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
.remote-item:hover { background: var(--mawu-bg-hover); }
.remote-info { display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 0; }
.remote-name { font-weight: 600; color: var(--mawu-text-primary); font-size: 12px; }
.remote-url { color: var(--mawu-text-muted); font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Changes */
.section-label { font-size: 11px; font-weight: 600; color: var(--mawu-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 4px 4px; }

.change-group { border-radius: 4px; }
.change-item { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.change-item:hover { background: var(--mawu-bg-hover); }

.change-expand { font-size: 9px; color: var(--mawu-text-muted); transition: transform 0.15s; flex-shrink: 0; width: 10px; text-align: center; }
.change-expand.open { transform: rotate(90deg); }

.change-path { flex: 1; color: var(--mawu-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.change-badge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; }
.change-badge.modified { color: var(--mawu-warning); background: rgba(255, 170, 0, 0.1); }
.change-badge.added { color: var(--mawu-success); background: rgba(0, 204, 136, 0.1); }
.change-badge.deleted { color: var(--mawu-error); background: rgba(255, 68, 102, 0.1); }
.change-badge.untracked { color: var(--mawu-text-muted); background: var(--mawu-bg-hover); }

.stage-btn { font-size: 14px; cursor: pointer; color: var(--mawu-text-muted); opacity: 0; transition: opacity 0.15s; flex-shrink: 0; width: 16px; text-align: center; }
.change-item:hover .stage-btn { opacity: 0.7; }
.stage-btn:hover { opacity: 1 !important; color: var(--mawu-accent); }
.stage-btn.unstage:hover { color: var(--mawu-warning); }

/* Diff view */
.diff-section { margin-top: 8px; }
.diff-group { margin-bottom: 4px; }
.diff-file-header {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 4px;
  font-size: 12px; cursor: pointer;
  background: var(--mawu-bg-tertiary);
}
.diff-file-header:hover { background: var(--mawu-bg-hover); }
.diff-file-name { flex: 1; color: var(--mawu-text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.diff-view { margin: 2px 0 4px; background: var(--mawu-bg-deep); border-radius: 4px; border: 1px solid var(--mawu-border); overflow: hidden; }
.diff-loading { padding: 8px 12px; font-size: 11px; color: var(--mawu-text-muted); }
.diff-content {
  padding: 8px 12px; margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 11px; line-height: 1.5;
  color: var(--mawu-text-secondary);
  max-height: 200px; overflow: auto;
  white-space: pre-wrap; word-break: break-all;
}

/* Commit area */
.commit-area { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.commit-type-row { display: flex; gap: 6px; }
.commit-type-select {
  background: var(--mawu-bg-deep); color: var(--mawu-text-primary);
  border: 1px solid var(--mawu-border); border-radius: 4px;
  font-size: 12px; padding: 2px 6px; outline: none; cursor: pointer;
  font-family: inherit; flex-shrink: 0; width: 130px;
}
.commit-type-select:focus { border-color: var(--mawu-accent); }
.scope-input { flex: 1; }

.commit-desc-row { display: flex; gap: 4px; align-items: center; }
.commit-input { flex: 1; }
.ai-gen-btn { flex-shrink: 0; font-size: 14px !important; }

.commit-preview { font-size: 11px; color: var(--mawu-text-muted); display: flex; align-items: center; gap: 4px; }
.commit-preview code { color: var(--mawu-accent); background: var(--mawu-bg-tertiary); padding: 1px 6px; border-radius: 3px; font-size: 11px; }
.commit-btn { align-self: flex-end; }

/* Timeline */
.timeline-section { margin-top: 12px; }
.timeline { position: relative; padding-left: 16px; }
.timeline-entry { position: relative; padding: 6px 0 6px 20px; }
.timeline-line { position: absolute; left: 6px; top: 18px; bottom: -6px; width: 1px; background: var(--mawu-border); }
.timeline-dot { position: absolute; left: 2px; top: 10px; width: 9px; height: 9px; border-radius: 50%; background: var(--mawu-text-muted); border: 2px solid var(--mawu-bg-deep); }

.timeline-dot.type-feat { background: var(--mawu-accent); }
.timeline-dot.type-fix { background: var(--mawu-error); }
.timeline-dot.type-docs { background: #5b9bd5; }
.timeline-dot.type-style { background: #c586c0; }
.timeline-dot.type-refactor { background: #dcdcaa; }
.timeline-dot.type-perf { background: #ff8c00; }
.timeline-dot.type-test { background: #4ec9b0; }
.timeline-dot.type-chore { background: var(--mawu-text-muted); }
.timeline-dot.type-ci { background: #569cd6; }
.timeline-dot.type-revert { background: #f44747; }

.timeline-content { min-width: 0; }
.timeline-msg { font-size: 12px; color: var(--mawu-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }

.commit-type-tag { font-size: 9px; font-weight: 700; padding: 0 4px; border-radius: 3px; flex-shrink: 0; text-transform: lowercase; }
.commit-type-tag.type-feat { color: var(--mawu-accent); background: rgba(0, 122, 204, 0.15); }
.commit-type-tag.type-fix { color: var(--mawu-error); background: rgba(255, 68, 102, 0.12); }
.commit-type-tag.type-docs { color: #5b9bd5; background: rgba(91, 155, 213, 0.12); }
.commit-type-tag.type-style { color: #c586c0; background: rgba(197, 134, 192, 0.12); }
.commit-type-tag.type-refactor { color: #dcdcaa; background: rgba(220, 220, 170, 0.12); }
.commit-type-tag.type-perf { color: #ff8c00; background: rgba(255, 140, 0, 0.12); }
.commit-type-tag.type-test { color: #4ec9b0; background: rgba(78, 201, 176, 0.12); }
.commit-type-tag.type-chore { color: var(--mawu-text-muted); background: var(--mawu-bg-hover); }
.commit-type-tag.type-ci { color: #569cd6; background: rgba(86, 156, 214, 0.12); }
.commit-type-tag.type-revert { color: #f44747; background: rgba(244, 71, 71, 0.12); }
.commit-type-tag.type-other { color: var(--mawu-text-muted); background: var(--mawu-bg-hover); }

.timeline-meta { display: flex; gap: 8px; font-size: 10px; color: var(--mawu-text-muted); margin-top: 2px; }
.timeline-hash { font-family: 'JetBrains Mono', 'Consolas', monospace; }
.timeline-author { max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
