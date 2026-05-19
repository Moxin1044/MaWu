import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Dialog
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // App
  getHomeDir: () => ipcRenderer.invoke('app:getHomeDir'),
  getUserData: () => ipcRenderer.invoke('app:getUserData'),

  // File system
  fs: {
    readdir: (dirPath: string) => ipcRenderer.invoke('fs:readdir', dirPath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('fs:writeFile', filePath, content),
    mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath),
    createFile: (filePath: string) => ipcRenderer.invoke('fs:createFile', filePath),
    remove: (targetPath: string) => ipcRenderer.invoke('fs:remove', targetPath),
    rename: (oldPath: string, newPath: string) =>
      ipcRenderer.invoke('fs:rename', oldPath, newPath),
    copy: (src: string, dest: string) => ipcRenderer.invoke('fs:copy', src, dest),
    stat: (filePath: string) => ipcRenderer.invoke('fs:stat', filePath),
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath)
  },

  // Git
  git: {
    init: (repoPath: string) => ipcRenderer.invoke('git:init', repoPath),
    clone: (repoUrl: string, localPath: string) =>
      ipcRenderer.invoke('git:clone', repoUrl, localPath),
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    add: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:add', repoPath, filePath),
    commit: (repoPath: string, message: string) =>
      ipcRenderer.invoke('git:commit', repoPath, message),
    log: (repoPath: string, maxCount?: number) =>
      ipcRenderer.invoke('git:log', repoPath, maxCount),
    branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
    checkout: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:checkout', repoPath, branch),
    isRepo: (repoPath: string) => ipcRenderer.invoke('git:isRepo', repoPath)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
