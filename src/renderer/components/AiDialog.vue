<template>
  <div class="ai-dialog">
    <div class="dialog-header">
      <div class="header-left">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--mawu-accent)" stroke-width="1.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <span>AI 助手</span>
      </div>
      <div class="header-right">
        <div class="settings-btn" @click="openModelSetup" title="模型设置">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </div>
        <t-select
          v-model="currentModelId"
          size="small"
          :options="modelOptions"
          style="width: 100px"
          @change="onModelChange"
          v-if="modelOptions.length > 0"
        />
      </div>
    </div>

    <div class="dialog-messages" ref="messagesContainer">
      <div v-if="aiStore.chatMessages.length === 0" class="empty-chat">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--mawu-text-muted)" stroke-width="1" opacity="0.4">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <p>向 AI 助手提问</p>
        <p class="hint">可以直接让 AI 修改当前代码文件</p>
      </div>

      <div
        v-for="msg in aiStore.chatMessages"
        :key="msg.id"
        class="chat-message"
        :class="msg.role"
      >
        <div class="msg-avatar">
          <span v-if="msg.role === 'user'">U</span>
          <span v-else class="ai-avatar">AI</span>
        </div>
        <div class="msg-content">
          <div class="msg-text">{{ msg.content }}</div>
          <div class="msg-actions" v-if="msg.role === 'assistant' && hasCodeBlock(msg.content)">
            <span class="apply-btn" @click="applyCode(msg.content)">应用到当前文件</span>
          </div>
          <div class="msg-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </div>

      <div v-if="isLoading" class="chat-message assistant">
        <div class="msg-avatar"><span class="ai-avatar">AI</span></div>
        <div class="msg-content">
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="dialog-input">
      <div class="input-wrapper">
        <t-textarea
          ref="textareaRef"
          v-model="inputText"
          placeholder="输入消息，如「帮我优化这段代码」..."
          :autosize="{ minRows: 1, maxRows: 4 }"
          @keydown="handleKeyDown"
          @input="handleInput"
        />
        <!-- @ File Mention Popup -->
        <div v-if="mention.visible" class="mention-popup">
          <div class="mention-search">
            <input
              ref="mentionSearchRef"
              v-model="mention.search"
              placeholder="搜索文件..."
              @keydown="handleMentionKeydown"
              @keydown.down.prevent="mentionIndex = Math.min(mentionIndex + 1, filteredMentionFiles.length - 1)"
              @keydown.up.prevent="mentionIndex = Math.max(mentionIndex - 1, 0)"
              @keydown.enter.prevent="selectMentionFile"
              @keydown.esc.prevent="closeMention"
            />
          </div>
          <div class="mention-list">
            <div
              v-for="(file, idx) in filteredMentionFiles"
              :key="file.path"
              class="mention-item"
              :class="{ active: idx === mentionIndex }"
              @click="selectMentionFile()"
              @mouseenter="mentionIndex = idx"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
              </svg>
              <span class="mention-name">{{ file.name }}</span>
              <span class="mention-path">{{ file.relPath }}</span>
            </div>
            <div v-if="filteredMentionFiles.length === 0" class="mention-empty">未找到文件</div>
          </div>
        </div>
        <!-- Mention Tags -->
        <div v-if="mentionedFiles.length > 0" class="mention-tags">
          <span
            v-for="(f, idx) in mentionedFiles"
            :key="f.path"
            class="mention-tag"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
            </svg>
            {{ f.name }}
            <span class="tag-remove" @click="removeMention(idx)">×</span>
          </span>
        </div>
      </div>
      <div class="send-btn" :class="{ active: inputText.trim() || mentionedFiles.length > 0 }" @click="sendMessage">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, reactive } from 'vue'
import { useAiStore } from '@/stores/ai'
import { useEditorStore } from '@/stores/editor'
import { useProjectStore } from '@/stores/project'

const aiStore = useAiStore()
const editorStore = useEditorStore()
const projectStore = useProjectStore()

const inputText = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<any>(null)
const mentionSearchRef = ref<HTMLInputElement | null>(null)

const currentModelId = ref(aiStore.activeModelId)

// Mention (@) file selection
interface MentionFile {
  path: string
  name: string
  relPath: string
}

const mentionedFiles = ref<MentionFile[]>([])
const mentionIndex = ref(0)
const mention = reactive({
  visible: false,
  search: '',
  allFiles: [] as MentionFile[]
})

const filteredMentionFiles = computed(() => {
  if (!mention.search) return mention.allFiles.slice(0, 30)
  const q = mention.search.toLowerCase()
  return mention.allFiles
    .filter(f => f.name.toLowerCase().includes(q) || f.relPath.toLowerCase().includes(q))
    .slice(0, 30)
})

async function openMention() {
  mention.visible = true
  mention.search = ''
  mentionIndex.value = 0
  if (mention.allFiles.length === 0 && projectStore.currentProject) {
    const files = await window.api.fs.readdirRecursive(projectStore.currentProject.path)
    mention.allFiles = files.map(f => ({
      path: f.path,
      name: f.relPath.split('/').pop() || f.relPath,
      relPath: f.relPath
    }))
  }
  await nextTick()
  mentionSearchRef.value?.focus()
}

function closeMention() {
  mention.visible = false
  mention.search = ''
  mentionIndex.value = 0
  // Remove trailing @ from input
  if (inputText.value.endsWith('@')) {
    inputText.value = inputText.value.slice(0, -1)
  }
  textareaRef.value?.focus()
}

function selectMentionFile() {
  const file = filteredMentionFiles.value[mentionIndex.value]
  if (!file) return
  // Avoid duplicates
  if (!mentionedFiles.value.some(f => f.path === file.path)) {
    mentionedFiles.value.push(file)
  }
  // Remove @ and search text from input
  const atIdx = inputText.value.lastIndexOf('@')
  if (atIdx >= 0) {
    inputText.value = inputText.value.slice(0, atIdx)
  }
  mention.visible = false
  mention.search = ''
  mentionIndex.value = 0
  textareaRef.value?.focus()
}

function removeMention(idx: number) {
  mentionedFiles.value.splice(idx, 1)
}

function handleInput() {
  if (inputText.value.endsWith('@')) {
    openMention()
  }
}

function handleMentionKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMention()
  }
}

const modelOptions = computed(() =>
  aiStore.models.map((m) => ({
    label: m.name,
    value: m.id
  }))
)

watch(() => aiStore.activeModelId, (val) => {
  currentModelId.value = val
})

function onModelChange(id: string) {
  aiStore.setActiveModel(id)
}

function openModelSetup() {
  window.dispatchEvent(new CustomEvent('mawu-open-model-setup'))
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

async function sendMessage() {
  const text = inputText.value.trim()
  if ((!text && mentionedFiles.value.length === 0) || isLoading.value) return

  // Build display message
  let displayText = text
  if (mentionedFiles.value.length > 0) {
    const fileNames = mentionedFiles.value.map(f => `@${f.name}`).join(' ')
    displayText = fileNames + (text ? ' ' + text : '')
  }

  aiStore.addChatMessage('user', displayText)
  inputText.value = ''
  isLoading.value = true

  await nextTick()
  scrollToBottom()

  // Build context from mentioned files and current file
  let contextParts: string[] = []

  // Add mentioned files content
  for (const f of mentionedFiles.value) {
    const content = await window.api.fs.readFile(f.path)
    if (content) {
      contextParts.push(`文件 ${f.relPath} 的内容如下：\n\`\`\`\n${content.substring(0, 5000)}\n\`\`\``)
    }
  }

  // Add current file context if no mentioned files
  if (mentionedFiles.value.length === 0 && editorStore.activeFile) {
    contextParts.push(`当前正在编辑的文件是 ${editorStore.activeFile.name}，文件内容如下：\n\`\`\`\n${editorStore.activeFile.content.substring(0, 3000)}\n\`\`\``)
  }

  if (contextParts.length > 0) {
    contextParts.push('如果用户要求修改代码，请直接返回修改后的完整代码，用代码块包裹。')
  }

  const context = contextParts.length > 0 ? contextParts.join('\n\n') : undefined
  const filesToSend = [...mentionedFiles.value]
  mentionedFiles.value = []

  const response = await aiStore.sendToAi(text, context)
  aiStore.addChatMessage('assistant', response)
  isLoading.value = false

  await nextTick()
  scrollToBottom()
}

function hasCodeBlock(text: string): boolean {
  return text.includes('```')
}

function applyCode(content: string) {
  // Extract code from markdown code blocks
  const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/)
  if (codeMatch && editorStore.activeFilePath) {
    const code = codeMatch[1]
    editorStore.updateFileContent(editorStore.activeFilePath, code)
    editorStore.saveFile(editorStore.activeFilePath)
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.ai-dialog {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--mawu-border);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mawu-text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.settings-btn {
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

.settings-btn:hover {
  color: var(--mawu-accent);
  background: var(--mawu-bg-hover);
}

.dialog-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--mawu-text-muted);
  font-size: 13px;
}

.empty-chat .hint {
  font-size: 11px;
  opacity: 0.6;
}

.chat-message {
  display: flex;
  gap: 8px;
}

.chat-message.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  background: var(--mawu-bg-tertiary);
  color: var(--mawu-text-secondary);
}

.chat-message.user .msg-avatar {
  background: rgba(0, 212, 255, 0.15);
  color: var(--mawu-accent);
}

.ai-avatar {
  color: var(--mawu-accent);
  font-size: 10px;
}

.msg-content {
  max-width: 240px;
}

.chat-message.user .msg-content {
  text-align: right;
}

.msg-text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--mawu-text-primary);
  background: var(--mawu-bg-tertiary);
  padding: 8px 12px;
  border-radius: 8px;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message.user .msg-text {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.15);
}

.msg-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.apply-btn {
  font-size: 11px;
  color: var(--mawu-accent);
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.15s;
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.apply-btn:hover {
  background: rgba(0, 212, 255, 0.1);
}

.msg-time {
  font-size: 10px;
  color: var(--mawu-text-muted);
  margin-top: 4px;
  padding: 0 4px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--mawu-accent);
  opacity: 0.4;
  animation: typing 1.2s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

.dialog-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid var(--mawu-border);
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.dialog-input :deep(.t-textarea) {
  width: 100%;
}

.mention-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0 0;
}

.mention-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 4px;
  font-size: 11px;
  color: var(--mawu-accent);
  white-space: nowrap;
}

.tag-remove {
  cursor: pointer;
  opacity: 0.6;
  font-size: 13px;
  line-height: 1;
  margin-left: 2px;
}

.tag-remove:hover {
  opacity: 1;
}

.mention-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  max-height: 220px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  overflow: hidden;
  margin-bottom: 4px;
}

.mention-search {
  padding: 6px;
  border-bottom: 1px solid #2a2a4a;
}

.mention-search input {
  width: 100%;
  background: #12121e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #e0e0f0;
  outline: none;
}

.mention-search input:focus {
  border-color: rgba(0, 212, 255, 0.4);
}

.mention-list {
  overflow-y: auto;
  padding: 4px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #e0e0f0;
  transition: background 0.1s;
}

.mention-item:hover,
.mention-item.active {
  background: #2a2a4a;
}

.mention-item svg {
  flex-shrink: 0;
  color: var(--mawu-accent);
  opacity: 0.6;
}

.mention-name {
  flex-shrink: 0;
  font-weight: 500;
}

.mention-path {
  color: #8080a0;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-empty {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: #8080a0;
}

.send-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: var(--mawu-bg-tertiary);
  color: var(--mawu-text-muted);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn.active {
  background: var(--mawu-accent-gradient);
  color: #fff;
}

.send-btn:hover.active {
  box-shadow: 0 2px 8px rgba(0, 212, 255, 0.3);
}
</style>
