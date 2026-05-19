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
  openInExplorer: (filePath: string) => ipcRenderer.invoke('app:openInExplorer', filePath),

  // Terminal
  terminal: {
    getShells: () => ipcRenderer.invoke('terminal:getShells'),
    execute: (command: string, cwd?: string, shellId?: string) =>
      ipcRenderer.invoke('terminal:execute', command, cwd, shellId),
    createSession: (sessionId: string, cwd?: string, shellId?: string) =>
      ipcRenderer.invoke('terminal:createSession', sessionId, cwd, shellId),
    write: (sessionId: string, data: string) =>
      ipcRenderer.send('terminal:write', sessionId, data),
    killSession: (sessionId: string) =>
      ipcRenderer.invoke('terminal:killSession', sessionId),
    openExternal: (filePath: string) =>
      ipcRenderer.invoke('terminal:openExternal', filePath),
    onData: (callback: (sessionId: string, data: string, stream: string) => void) =>
      ipcRenderer.on('terminal:data', (_, sessionId, data, stream) => callback(sessionId, data, stream)),
    onExit: (callback: (sessionId: string, code: number | null) => void) =>
      ipcRenderer.on('terminal:exit', (_, sessionId, code) => callback(sessionId, code)),
    onError: (callback: (sessionId: string, message: string) => void) =>
      ipcRenderer.on('terminal:error', (_, sessionId, message) => callback(sessionId, message)),
    removeDataListener: () => ipcRenderer.removeAllListeners('terminal:data'),
    removeExitListener: () => ipcRenderer.removeAllListeners('terminal:exit'),
    removeErrorListener: () => ipcRenderer.removeAllListeners('terminal:error')
  },

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
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
    readdirRecursive: (dirPath: string) => ipcRenderer.invoke('fs:readdirRecursive', dirPath)
  },

  // Git
  git: {
    init: (repoPath: string) => ipcRenderer.invoke('git:init', repoPath),
    clone: (repoUrl: string, localPath: string) =>
      ipcRenderer.invoke('git:clone', repoUrl, localPath),
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    add: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:add', repoPath, filePath),
    reset: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:reset', repoPath, filePath),
    commit: (repoPath: string, message: string) =>
      ipcRenderer.invoke('git:commit', repoPath, message),
    log: (repoPath: string, maxCount?: number) =>
      ipcRenderer.invoke('git:log', repoPath, maxCount),
    branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
    checkout: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:checkout', repoPath, branch),
    createBranch: (repoPath: string, branchName: string) =>
      ipcRenderer.invoke('git:createBranch', repoPath, branchName),
    deleteBranch: (repoPath: string, branchName: string) =>
      ipcRenderer.invoke('git:deleteBranch', repoPath, branchName),
    renameBranch: (repoPath: string, oldName: string, newName: string) =>
      ipcRenderer.invoke('git:renameBranch', repoPath, oldName, newName),
    isRepo: (repoPath: string) => ipcRenderer.invoke('git:isRepo', repoPath),
    pull: (repoPath: string, remote?: string, branch?: string) =>
      ipcRenderer.invoke('git:pull', repoPath, remote, branch),
    push: (repoPath: string, remote?: string, branch?: string) =>
      ipcRenderer.invoke('git:push', repoPath, remote, branch),
    fetch: (repoPath: string, remote?: string) =>
      ipcRenderer.invoke('git:fetch', repoPath, remote),
    getRemotes: (repoPath: string) => ipcRenderer.invoke('git:getRemotes', repoPath),
    addRemote: (repoPath: string, name: string, url: string) =>
      ipcRenderer.invoke('git:addRemote', repoPath, name, url),
    removeRemote: (repoPath: string, name: string) =>
      ipcRenderer.invoke('git:removeRemote', repoPath, name),
    diff: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:diff', repoPath, filePath),
    diffStaged: (repoPath: string, filePath?: string) =>
      ipcRenderer.invoke('git:diffStaged', repoPath, filePath)
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
