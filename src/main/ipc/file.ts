import { ipcMain } from 'electron'
import * as fs from 'fs-extra'
import * as path from 'path'

export function registerFileIpc(): void {
  // Read directory
  ipcMain.handle('fs:readdir', async (_, dirPath: string) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      return entries
        .filter((e) => !e.name.startsWith('.'))
        .map((e) => ({
          name: e.name,
          path: path.join(dirPath, e.name),
          isDirectory: e.isDirectory(),
          isFile: e.isFile()
        }))
        .sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
    } catch {
      return []
    }
  })

  // Read file
  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return content
    } catch {
      return null
    }
  })

  // Write file
  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    try {
      await fs.ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, content, 'utf-8')
      return true
    } catch {
      return false
    }
  })

  // Create directory
  ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
    try {
      await fs.ensureDir(dirPath)
      return true
    } catch {
      return false
    }
  })

  // Create file
  ipcMain.handle('fs:createFile', async (_, filePath: string) => {
    try {
      await fs.ensureDir(path.dirname(filePath))
      await fs.writeFile(filePath, '', 'utf-8')
      return true
    } catch {
      return false
    }
  })

  // Delete
  ipcMain.handle('fs:remove', async (_, targetPath: string) => {
    try {
      await fs.remove(targetPath)
      return true
    } catch {
      return false
    }
  })

  // Rename / Move
  ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
    try {
      await fs.rename(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  // Copy
  ipcMain.handle('fs:copy', async (_, src: string, dest: string) => {
    try {
      await fs.copy(src, dest)
      return true
    } catch {
      return false
    }
  })

  // Stat
  ipcMain.handle('fs:stat', async (_, filePath: string) => {
    try {
      const stat = await fs.stat(filePath)
      return {
        isFile: stat.isFile(),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtimeMs
      }
    } catch {
      return null
    }
  })

  // Exists
  ipcMain.handle('fs:exists', async (_, filePath: string) => {
    try {
      return await fs.pathExists(filePath)
    } catch {
      return false
    }
  })
}
