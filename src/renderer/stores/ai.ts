import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AiModel {
  id: string
  name: string
  provider: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export const useAiStore = defineStore('ai', () => {
  const models = ref<AiModel[]>([])
  const activeModelId = ref<string>('')
  const chatMessages = ref<ChatMessage[]>([])
  const isConfigured = ref(false)
  const isChatOpen = ref(false)

  const activeModel = computed(() => {
    return models.value.find((m) => m.id === activeModelId.value) || null
  })

  function loadConfig() {
    try {
      const saved = localStorage.getItem('mawu-ai-config')
      if (saved) {
        const config = JSON.parse(saved)
        models.value = config.models || []
        activeModelId.value = config.activeModelId || ''
        isConfigured.value = models.value.length > 0 && !!activeModelId.value
      }
    } catch {}
  }

  function saveConfig() {
    try {
      localStorage.setItem(
        'mawu-ai-config',
        JSON.stringify({
          models: models.value,
          activeModelId: activeModelId.value
        })
      )
      isConfigured.value = models.value.length > 0 && !!activeModelId.value
    } catch {}
  }

  function addModel(model: Omit<AiModel, 'id'>) {
    const id = Date.now().toString()
    models.value.push({ ...model, id })
    if (!activeModelId.value) {
      activeModelId.value = id
    }
    saveConfig()
  }

  function removeModel(id: string) {
    models.value = models.value.filter((m) => m.id !== id)
    if (activeModelId.value === id) {
      activeModelId.value = models.value[0]?.id || ''
    }
    saveConfig()
  }

  function setActiveModel(id: string) {
    activeModelId.value = id
    saveConfig()
  }

  function addChatMessage(role: 'user' | 'assistant' | 'system', content: string) {
    chatMessages.value.push({
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now()
    })
  }

  function clearChat() {
    chatMessages.value = []
  }

  function toggleChat() {
    isChatOpen.value = !isChatOpen.value
  }

  async function sendToAi(prompt: string, context?: string): Promise<string> {
    const model = activeModel.value
    if (!model) return '请先配置AI模型'

    try {
      // Claude (Anthropic) uses different API format
      if (model.provider === 'claude') {
        const systemMsg = context || ''
        const messages = chatMessages.value
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content }))
        messages.push({ role: 'user', content: prompt })

        const body: any = {
          model: model.model,
          messages,
          max_tokens: 4096
        }
        if (systemMsg) {
          body.system = systemMsg
        }

        const response = await fetch(`${model.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': model.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify(body)
        })

        const data = await response.json()
        if (data.error) return `请求失败: ${data.error.message || JSON.stringify(data.error)}`
        return data.content?.[0]?.text || '无响应'
      }

      // OpenAI-compatible providers
      const messages = chatMessages.value
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }))

      messages.push({ role: 'user', content: prompt })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey}`
      }

      const response = await fetch(`${model.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model.model,
          messages: context
            ? [{ role: 'system', content: context }, ...messages]
            : messages,
          stream: false
        })
      })

      const data = await response.json()
      if (data.error) return `请求失败: ${data.error.message || JSON.stringify(data.error)}`
      return data.choices?.[0]?.message?.content || '无响应'
    } catch (e: any) {
      return `请求失败: ${e.message}`
    }
  }

  return {
    models,
    activeModelId,
    activeModel,
    chatMessages,
    isConfigured,
    isChatOpen,
    loadConfig,
    addModel,
    removeModel,
    setActiveModel,
    addChatMessage,
    clearChat,
    toggleChat,
    sendToAi
  }
})
