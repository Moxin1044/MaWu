import { ipcMain } from 'electron'
import { simpleGit, SimpleGit } from 'simple-git'

export function registerGitIpc(): void {
  function getGit(repoPath: string): SimpleGit {
    return simpleGit(repoPath)
  }

  // Init repo
  ipcMain.handle('git:init', async (_, repoPath: string) => {
    try {
      await getGit(repoPath).init()
      return true
    } catch {
      return false
    }
  })

  // Clone repo
  ipcMain.handle('git:clone', async (_, repoUrl: string, localPath: string) => {
    try {
      await simpleGit().clone(repoUrl, localPath)
      return true
    } catch (e: any) {
      return e.message || 'Clone failed'
    }
  })

  // Get status
  ipcMain.handle('git:status', async (_, repoPath: string) => {
    try {
      const git = getGit(repoPath)
      const status = await git.status()
      return {
        current: status.current,
        tracking: status.tracking,
        staged: status.staged,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
        renamed: status.renamed,
        conflicted: status.conflicted,
        ahead: status.ahead,
        behind: status.behind,
        files: status.files.map((f) => ({
          path: f.path,
          index: f.index,
          working_dir: f.working_dir
        }))
      }
    } catch {
      return null
    }
  })

  // Stage file
  ipcMain.handle('git:add', async (_, repoPath: string, filePath?: string) => {
    try {
      const git = getGit(repoPath)
      if (filePath) {
        await git.add(filePath)
      } else {
        await git.add('.')
      }
      return true
    } catch {
      return false
    }
  })

  // Commit
  ipcMain.handle('git:commit', async (_, repoPath: string, message: string) => {
    try {
      await getGit(repoPath).commit(message)
      return true
    } catch {
      return false
    }
  })

  // Log
  ipcMain.handle('git:log', async (_, repoPath: string, maxCount: number = 50) => {
    try {
      const result = await getGit(repoPath).log({ maxCount })
      return result.all.map((c) => ({
        hash: c.hash,
        date: c.date,
        message: c.message,
        author_name: c.author_name
      }))
    } catch {
      return []
    }
  })

  // Branch list
  ipcMain.handle('git:branches', async (_, repoPath: string) => {
    try {
      const result = await getGit(repoPath).branch()
      return {
        current: result.current,
        all: result.all
      }
    } catch {
      return null
    }
  })

  // Checkout branch
  ipcMain.handle('git:checkout', async (_, repoPath: string, branch: string) => {
    try {
      await getGit(repoPath).checkout(branch)
      return true
    } catch {
      return false
    }
  })

  // Is git repo
  ipcMain.handle('git:isRepo', async (_, repoPath: string) => {
    try {
      return await getGit(repoPath).checkIsRepo()
    } catch {
      return false
    }
  })
}
