import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, basename } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import * as fs from 'fs-extra'
import * as path from 'path'
import { exec } from 'child_process'
import { registerFileIpc } from './ipc/file'
import { registerGitIpc } from './ipc/git'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    icon: join(__dirname, '../../resources/icon.png'),
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.mawu')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Window control IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

  // Dialog IPC
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    return result.filePaths[0] || null
  })

  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.filePaths[0] || null
  })

  // App path
  ipcMain.handle('app:getHomeDir', () => {
    return app.getPath('home')
  })

  ipcMain.handle('app:getUserData', () => {
    return app.getPath('userData')
  })

  // Execute terminal command
  ipcMain.handle('app:executeCommand', async (_, command: string) => {
    return new Promise((resolve) => {
      exec(command, { cwd: app.getPath('home'), timeout: 10000 }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          resolve(stderr || error.message)
        } else {
          resolve(stdout || '(无输出)')
        }
      })
    })
  })

  // Open in file explorer
  ipcMain.handle('app:openInExplorer', async (_, filePath: string) => {
    shell.openPath(filePath)
  })

  // Open terminal at path
  ipcMain.handle('app:openTerminal', async (_, filePath: string) => {
    if (process.platform === 'win32') {
      exec(`start cmd /K "cd /d ${filePath}"`)
    } else if (process.platform === 'darwin') {
      exec(`open -a Terminal "${filePath}"`)
    } else {
      exec(`xdg-terminal --working-directory="${filePath}" || gnome-terminal --working-directory="${filePath}"`)
    }
  })

  registerFileIpc()
  registerGitIpc()

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
