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

  // Recursive readdir - returns all files in project (excluding node_modules, .git, dist, etc.)
  ipcMain.handle('fs:readdirRecursive', async (_, dirPath: string) => {
    const ignoreDirs = new Set([
      'node_modules', '.git', 'dist', '.nuxt', '.next', 'build', 'out',
      '.cache', '.vscode', '.idea', '__pycache__', '.tox', 'venv', '.venv',
      'env', '.env', 'coverage', '.coverage', 'target', 'bin', 'obj',
      '.sass-cache', '.electron', '.electron-vite'
    ])
    const textExtensions = new Set([
      '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte', '.html', '.css', '.scss',
      '.less', '.json', '.md', '.yaml', '.yml', '.toml', '.py', '.rb', '.go',
      '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.hpp', '.cs',
      '.php', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
      '.sql', '.graphql', '.proto', '.lua', '.r', '.dart', '.scala',
      '.clj', '.ex', '.exs', '.erl', '.hs', '.ml', '.fs', '.nim',
      '.zig', '.sol', '.txt', '.csv', '.ini', '.cfg', '.conf', '.env',
      '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc'
    ])
    const results: Array<{ path: string; relPath: string }> = []

    async function walk(dir: string, relDir: string): Promise<void> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (entry.name.startsWith('.') && entry.name !== '.env') continue
          const fullPath = path.join(dir, entry.name)
          const relPath = relDir ? `${relDir}/${entry.name}` : entry.name
          if (entry.isDirectory()) {
            if (ignoreDirs.has(entry.name)) continue
            await walk(fullPath, relPath)
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase()
            if (textExtensions.has(ext) || entry.name.startsWith('.env') || entry.name === 'Dockerfile' || entry.name === 'Makefile') {
              results.push({ path: fullPath, relPath })
            }
          }
        }
      } catch {}
    }

    await walk(dirPath, '')
    return results
  })
}
