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
          style="width: 110px"
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
      <t-textarea
        v-model="inputText"
        placeholder="输入消息..."
        :autosize="{ minRows: 1, maxRows: 4 }"
        @keydown="handleKeyDown"
      />
      <div class="send-btn" :class="{ active: inputText.trim() }" @click="sendMessage">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useAiStore } from '@/stores/ai'

const aiStore = useAiStore()

const inputText = ref('')
const isLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const currentModelId = ref(aiStore.activeModelId)

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
  // Use a simple approach: emit event or directly access the setup component
  // Since ModelSetup is in App.vue, we'll use a global event approach
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
  if (!text || isLoading.value) return

  aiStore.addChatMessage('user', text)
  inputText.value = ''
  isLoading.value = true

  await nextTick()
  scrollToBottom()

  const response = await aiStore.sendToAi(text)
  aiStore.addChatMessage('assistant', response)
  isLoading.value = false

  await nextTick()
  scrollToBottom()
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
  width: 304px;
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
  max-width: 220px;
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
}

.dialog-input :deep(.t-textarea) {
  flex: 1;
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
