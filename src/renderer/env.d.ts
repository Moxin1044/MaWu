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
      }

      git: {
        init: (repoPath: string) => Promise<boolean>
        clone: (repoUrl: string, localPath: string) => Promise<boolean | string>
        status: (repoPath: string) => Promise<GitStatus | null>
        add: (repoPath: string, filePath?: string) => Promise<boolean>
        commit: (repoPath: string, message: string) => Promise<boolean>
        log: (repoPath: string, maxCount?: number) => Promise<GitLogEntry[]>
        branches: (repoPath: string) => Promise<GitBranches | null>
        checkout: (repoPath: string, branch: string) => Promise<boolean>
        isRepo: (repoPath: string) => Promise<boolean>
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

export {}
