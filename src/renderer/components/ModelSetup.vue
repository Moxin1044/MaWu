<template>
  <t-dialog
    v-model:visible="showSetup"
    header="配置 AI 模型"
    :close-on-overlay-click="!!aiStore.isConfigured"
    :close-on-esc="!!aiStore.isConfigured"
    :footer="false"
    width="480px"
    :theme="'dark'"
  >
    <div class="model-setup">
      <div class="setup-intro" v-if="!aiStore.isConfigured">
        <p>欢迎使用码悟！首次使用需要配置 AI 模型。</p>
        <p>支持 OpenAI 兼容的 API 接口（OpenAI / Azure / DeepSeek / 本地模型等）</p>
      </div>

      <t-form layout="vertical" class="setup-form">
        <t-form-item label="模型名称">
          <t-input v-model="form.name" placeholder="例如: GPT-4o" class="light-input" />
        </t-form-item>
        <t-form-item label="服务商">
          <t-select v-model="form.provider" :options="providerOptions" class="light-input" />
        </t-form-item>
        <t-form-item label="API Key" v-if="providerDefaults[form.provider]?.needKey !== false">
          <t-input v-model="form.apiKey" type="password" placeholder="sk-..." class="light-input" />
        </t-form-item>
        <t-form-item label="API Base URL">
          <t-input v-model="form.baseUrl" placeholder="https://api.openai.com/v1" class="light-input" />
        </t-form-item>
        <t-form-item label="模型 ID">
          <t-input v-model="form.model" placeholder="gpt-4o" class="light-input" />
        </t-form-item>
      </t-form>

      <div class="setup-actions">
        <t-button variant="text" @click="skipSetup" v-if="!aiStore.isConfigured">跳过</t-button>
        <t-button class="btn-gradient" @click="saveModel" :disabled="!canSave">保存配置</t-button>
      </div>

      <!-- Existing models -->
      <div class="model-list" v-if="aiStore.models.length > 0">
        <div class="model-list-title">已配置模型</div>
        <div v-for="model in aiStore.models" :key="model.id" class="model-item">
          <div class="model-info">
            <span class="model-name">{{ model.name }}</span>
            <span class="model-id">{{ model.model }}</span>
          </div>
          <div class="model-actions">
            <t-button
              size="small"
              :variant="model.id === aiStore.activeModelId ? 'primary' : 'outline'"
              @click="aiStore.setActiveModel(model.id)"
            >
              {{ model.id === aiStore.activeModelId ? '当前' : '使用' }}
            </t-button>
            <t-button size="small" variant="text" @click="aiStore.removeModel(model.id)">删除</t-button>
          </div>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useAiStore } from '@/stores/ai'
import { MessagePlugin } from 'tdesign-vue-next'

const aiStore = useAiStore()

const showSetup = ref(false)

// Watch for first-use: show dialog when not configured
watch(() => aiStore.isConfigured, (configured) => {
  if (!configured) {
    // Delay to ensure dialog is rendered after initial load
    setTimeout(() => { showSetup.value = true }, 500)
  }
}, { immediate: true })

const form = reactive({
  name: '',
  provider: 'openai',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o'
})

const providerOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Claude (Anthropic)', value: 'claude' },
  { label: 'Azure OpenAI', value: 'azure' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Moonshot (Kimi)', value: 'moonshot' },
  { label: 'GLM (智谱)', value: 'glm' },
  { label: 'Ollama (本地)', value: 'ollama' },
  { label: '自定义', value: 'custom' }
]

const providerDefaults: Record<string, { baseUrl: string; model: string; needKey: boolean }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', needKey: true },
  claude: { baseUrl: 'https://api.anthropic.com/v1', model: 'claude-sonnet-4-20250514', needKey: true },
  azure: { baseUrl: 'https://YOUR_RESOURCE.openai.azure.com/openai/deployments', model: 'gpt-4', needKey: true },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', needKey: true },
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', needKey: true },
  glm: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4', needKey: true },
  ollama: { baseUrl: 'http://localhost:11434/v1', model: 'codellama', needKey: false },
}

watch(() => form.provider, (val) => {
  const defaults = providerDefaults[val]
  if (defaults) {
    form.baseUrl = defaults.baseUrl
    form.model = defaults.model
  }
})

const canSave = computed(() => {
  const needKey = providerDefaults[form.provider]?.needKey !== false
  return form.name.trim() && (!needKey || form.apiKey.trim()) && form.baseUrl.trim() && form.model.trim()
})

function saveModel() {
  if (!canSave.value) return
  aiStore.addModel({
    name: form.name.trim(),
    provider: form.provider,
    apiKey: form.apiKey.trim(),
    baseUrl: form.baseUrl.trim().replace(/\/$/, ''),
    model: form.model.trim()
  })
  MessagePlugin.success('模型配置已保存')
  showSetup.value = false

  // Reset form
  form.name = ''
  form.apiKey = ''
}

function skipSetup() {
  showSetup.value = false
}

defineExpose({ showSetup })
</script>

<style scoped>
.model-setup {
  padding: 4px 0;
  color: #1a1a2e !important;
}

/* All text in the dialog: black */
.model-setup :deep(.t-dialog__body) {
  color: #1a1a2e !important;
}

.setup-form :deep(.light-input .t-input),
.setup-form :deep(.light-input .t-input__inner),
.setup-form :deep(.light-input.t-input .t-input__inner),
.setup-form :deep(.t-input .t-input__inner) {
  background-color: #ffffff !important;
  color: #1a1a2e !important;
  caret-color: #1a1a2e;
}

.setup-form :deep(.t-input) {
  background-color: #ffffff !important;
}

.setup-form :deep(.t-input .t-input__inner::placeholder) {
  color: #999 !important;
}

.setup-form :deep(.t-select .t-input .t-input__inner) {
  background-color: #ffffff !important;
  color: #1a1a2e !important;
}

.setup-form :deep(.t-textarea__inner) {
  background-color: #ffffff !important;
  color: #1a1a2e !important;
}

.setup-form :deep(.t-form__label) {
  color: #1a1a2e !important;
}

.setup-intro {
  margin-bottom: 20px;
  padding: 16px;
  background: #f0f6ff;
  border: 1px solid #d0e4ff;
  border-radius: 8px;
}

.setup-intro p {
  font-size: 13px;
  color: #333 !important;
  line-height: 1.6;
}

.setup-intro p:first-child {
  color: #1a1a2e !important;
  font-weight: 500;
}

.setup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.model-list {
  margin-top: 24px;
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}

.model-list-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e !important;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: #f5f5f5;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e !important;
}

.model-id {
  font-size: 11px;
  color: #666 !important;
}

.model-actions {
  display: flex;
  gap: 4px;
}
</style>
