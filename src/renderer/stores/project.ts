import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ProjectInfo {
  name: string
  path: string
}

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref<ProjectInfo | null>(null)
  const recentProjects = ref<ProjectInfo[]>([])
  const homeDir = ref('')

  const projectName = computed(() => currentProject.value?.name || '码悟')

  function openProject(name: string, path: string) {
    currentProject.value = { name, path }
    // Add to recent
    const exists = recentProjects.value.findIndex((p) => p.path === path)
    if (exists >= 0) {
      recentProjects.value.splice(exists, 1)
    }
    recentProjects.value.unshift({ name, path })
    if (recentProjects.value.length > 10) {
      recentProjects.value.pop()
    }
    saveRecentProjects()
  }

  function closeProject() {
    currentProject.value = null
  }

  async function loadHomeDir() {
    if (window.api) {
      homeDir.value = await window.api.getHomeDir()
    }
  }

  function saveRecentProjects() {
    try {
      localStorage.setItem('mawu-recent-projects', JSON.stringify(recentProjects.value))
    } catch {}
  }

  function loadRecentProjects() {
    try {
      const saved = localStorage.getItem('mawu-recent-projects')
      if (saved) {
        recentProjects.value = JSON.parse(saved)
      }
    } catch {}
  }

  return {
    currentProject,
    recentProjects,
    homeDir,
    projectName,
    openProject,
    closeProject,
    loadHomeDir,
    loadRecentProjects
  }
})
