declare global {
  interface Window {
    electron: any
    api: {
      windowMinimize: () => void
      windowMaximize: () => void
      windowClose: () => void
      windowIsMaximized: () => Promise<boolean>

      openDirectory: () => Promise<string | null>
      openFile: () => Promise<string | null>

      getHomeDir: () => Promise<string>
      getUserData: () => Promise<string>
      openInExplorer: (filePath: string) => Promise<void>

      terminal: {
        getShells: () => Promise<Array<{ id: string; label: string; path: string; args: string[] }>>
        execute: (command: string, cwd?: string, shellId?: string) => Promise<string>
        createSession: (sessionId: string, cwd?: string, shellId?: string) => Promise<boolean>
        write: (sessionId: string, data: string) => void
        killSession: (sessionId: string) => Promise<boolean>
        openExternal: (filePath: string) => Promise<void>
        onData: (callback: (sessionId: string, data: string, stream: string) => void) => void
        onExit: (callback: (sessionId: string, code: number | null) => void) => void
        onError: (callback: (sessionId: string, message: string) => void) => void
        removeDataListener: () => void
        removeExitListener: () => void
        removeErrorListener: () => void
      }

      fs: {
        readdir: (dirPath: string) => Promise<FileEntry[]>
        readFile: (filePath: string) => Promise<string | null>
        writeFile: (filePath: string, content: string) => Promise<boolean>
        mkdir: (dirPath: string) => Promise<boolean>
        createFile: (filePath: string) => Promise<boolean>
        remove: (targetPath: string) => Promise<boolean>
        rename: (oldPath: string, newPath: string) => Promise<boolean>
        copy: (src: string, dest: string) => Promise<boolean>
        stat: (filePath: string) => Promise<FileStat | null>
        exists: (filePath: string) => Promise<boolean>
        readdirRecursive: (dirPath: string) => Promise<Array<{ path: string; relPath: string }>>
      }

      git: {
        init: (repoPath: string) => Promise<boolean>
        clone: (repoUrl: string, localPath: string) => Promise<boolean | string>
        status: (repoPath: string) => Promise<GitStatus | null>
        add: (repoPath: string, filePath?: string) => Promise<boolean>
        reset: (repoPath: string, filePath?: string) => Promise<boolean>
        commit: (repoPath: string, message: string) => Promise<boolean>
        log: (repoPath: string, maxCount?: number) => Promise<GitLogEntry[]>
        branches: (repoPath: string) => Promise<GitBranches | null>
        checkout: (repoPath: string, branch: string) => Promise<boolean>
        createBranch: (repoPath: string, branchName: string) => Promise<boolean>
        deleteBranch: (repoPath: string, branchName: string) => Promise<boolean>
        renameBranch: (repoPath: string, oldName: string, newName: string) => Promise<boolean>
        isRepo: (repoPath: string) => Promise<boolean>
        pull: (repoPath: string, remote?: string, branch?: string) => Promise<boolean | string>
        push: (repoPath: string, remote?: string, branch?: string) => Promise<boolean | string>
        fetch: (repoPath: string, remote?: string) => Promise<boolean | string>
        getRemotes: (repoPath: string) => Promise<GitRemote[]>
        addRemote: (repoPath: string, name: string, url: string) => Promise<boolean | string>
        removeRemote: (repoPath: string, name: string) => Promise<boolean | string>
        diff: (repoPath: string, filePath?: string) => Promise<string>
        diffStaged: (repoPath: string, filePath?: string) => Promise<string>
      }
    }
  }
}

interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isFile: boolean
}

interface FileStat {
  isFile: boolean
  isDirectory: boolean
  size: number
  mtime: number
}

interface GitStatus {
  current: string
  tracking: string
  staged: string[]
  modified: string[]
  created: string[]
  deleted: string[]
  renamed: string[]
  conflicted: string[]
  ahead: number
  behind: number
  files: Array<{ path: string; index: string; working_dir: string }>
}

interface GitLogEntry {
  hash: string
  date: string
  message: string
  author_name: string
}

interface GitBranches {
  current: string
  all: string[]
}

interface GitRemote {
  name: string
  refs: { fetch: string; push: string }
}

export {}
