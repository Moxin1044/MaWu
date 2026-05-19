<template>
  <div class="mawu-app" :class="{ 'has-project': !!projectStore.currentProject }">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- Model setup dialog -->
    <ModelSetup ref="modelSetupRef" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useAiStore } from '@/stores/ai'
import ModelSetup from '@/components/ModelSetup.vue'

const projectStore = useProjectStore()
const aiStore = useAiStore()
const modelSetupRef = ref<InstanceType<typeof ModelSetup> | null>(null)

function handleOpenModelSetup() {
  if (modelSetupRef.value) {
    modelSetupRef.value.showSetup = true
  }
}

onMounted(async () => {
  await projectStore.loadHomeDir()
  projectStore.loadRecentProjects()
  aiStore.loadConfig()

  window.addEventListener('mawu-open-model-setup', handleOpenModelSetup)
})

onBeforeUnmount(() => {
  window.removeEventListener('mawu-open-model-setup', handleOpenModelSetup)
})
</script>

<style scoped>
.mawu-app {
  width: 100%;
  height: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
