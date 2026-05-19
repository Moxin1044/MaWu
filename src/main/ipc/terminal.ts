import { ipcMain, app } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import iconv from 'iconv-lite'
import * as fs from 'fs'
import * as path from 'path'

// Active terminal sessions
const sessions = new Map<string, ChildProcess>()

// Available shells per platform
function getAvailableShells(): Array<{ id: string; label: string; path: string; args: string[] }> {
  const shells: Array<{ id: string; label: string; path: string; args: string[] }> = []
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'

  if (isWin) {
    // PowerShell (Windows PowerShell)
    const psPaths = [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe'
    ]
    for (const p of psPaths) {
      if (fs.existsSync(p)) {
        shells.push({ id: 'powershell', label: 'PowerShell', path: p, args: ['-NoLogo', '-NoProfile'] })
        break
      }
    }
    // PowerShell Core (pwsh)
    const pwshPaths = [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Program Files\\PowerShell\\6\\pwsh.exe'
    ]
    for (const p of pwshPaths) {
      if (fs.existsSync(p)) {
        shells.push({ id: 'pwsh', label: 'PowerShell 7', path: p, args: ['-NoLogo'] })
        break
      }
    }
    // CMD
    shells.push({ id: 'cmd', label: 'CMD', path: 'cmd.exe', args: [] })
  } else {
    // Unix-like: check shells in order of preference
    const unixShells = [
      { id: 'zsh', label: 'Zsh', path: '/bin/zsh', args: ['-l'] },
      { id: 'bash', label: 'Bash', path: '/bin/bash', args: ['-l'] },
      { id: 'bash-usr', label: 'Bash', path: '/usr/bin/bash', args: ['-l'] },
      { id: 'sh', label: 'Sh', path: '/bin/sh', args: ['-l'] }
    ]
    if (isMac) {
      // macOS also check /usr/local/bin and opt/homebrew
      unixShells.unshift(
        { id: 'zsh-usr', label: 'Zsh', path: '/usr/bin/zsh', args: ['-l'] }
      )
    }
    for (const s of unixShells) {
      if (fs.existsSync(s.path)) {
        // Avoid duplicates
        if (!shells.find(sh => sh.id === s.id || (sh.label === s.label && sh.path === s.path))) {
          shells.push(s)
        }
      }
    }
    // Fallback
    if (shells.length === 0) {
      shells.push({ id: 'sh', label: 'Sh', path: '/bin/sh', args: [] })
    }
  }

  return shells
}

// Decode buffer with encoding auto-detection
function decode(buf: Buffer): string {
  if (buf.length === 0) return ''
  const utf8Text = buf.toString('utf-8')
  if (utf8Text.includes('\uFFFD')) {
    return iconv.decode(buf, 'gbk')
  }
  return utf8Text
}

// Get shell config by id
function getShellConfig(shellId: string) {
  const shells = getAvailableShells()
  return shells.find(s => s.id === shellId) || shells[0]
}

export function registerTerminalIpc(): void {
  // Get available shells
  ipcMain.handle('terminal:getShells', () => {
    return getAvailableShells()
  })

  // Execute a single command and return output (for simple one-shot commands)
  ipcMain.handle('terminal:execute', async (_, command: string, cwd?: string, shellId?: string) => {
    return new Promise((resolve) => {
      const shellConfig = getShellConfig(shellId || '')
      const isWin = process.platform === 'win32'
      const isCmd = shellConfig.id === 'cmd'

      let args: string[]
      if (isCmd) {
        args = ['/c', command]
      } else if (isWin) {
        // PowerShell
        args = [...shellConfig.args, '-Command', command]
      } else {
        // Unix shells
        args = [...shellConfig.args, '-c', command]
      }

      const child = spawn(shellConfig.path, args, {
        cwd: cwd || app.getPath('home'),
        timeout: 10000,
        env: { ...process.env }
      })

      const stdoutChunks: Buffer[] = []
      const stderrChunks: Buffer[] = []

      child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk))
      child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk))

      child.on('close', () => {
        const stdout = decode(Buffer.concat(stdoutChunks))
        const stderr = decode(Buffer.concat(stderrChunks))

        if (stderr) {
          resolve(stderr)
        } else {
          resolve(stdout || '(无输出)')
        }
      })

      child.on('error', (err) => {
        resolve(err.message)
      })
    })
  })

  // Create a persistent terminal session (spawn a shell process)
  ipcMain.handle('terminal:createSession', async (_, sessionId: string, cwd?: string, shellId?: string) => {
    // Kill existing session if any
    const existing = sessions.get(sessionId)
    if (existing) {
      existing.kill()
      sessions.delete(sessionId)
    }

    const shellConfig = getShellConfig(shellId || '')
    const isCmd = shellConfig.id === 'cmd'

    const child = spawn(shellConfig.path, shellConfig.args, {
      cwd: cwd || app.getPath('home'),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    sessions.set(sessionId, child)

    // Forward output to renderer via webContents
    const webContents = globalThis.__mawu_mainWindow?.webContents

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = decode(chunk)
      webContents?.send('terminal:data', sessionId, text, 'stdout')
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = decode(chunk)
      webContents?.send('terminal:data', sessionId, text, 'stderr')
    })

    child.on('close', (code) => {
      sessions.delete(sessionId)
      webContents?.send('terminal:exit', sessionId, code)
    })

    child.on('error', (err) => {
      sessions.delete(sessionId)
      webContents?.send('terminal:error', sessionId, err.message)
    })

    return true
  })

  // Write to a session's stdin
  ipcMain.on('terminal:write', (_, sessionId: string, data: string) => {
    const child = sessions.get(sessionId)
    if (child?.stdin?.writable) {
      child.stdin.write(data)
    }
  })

  // Kill a session
  ipcMain.handle('terminal:killSession', async (_, sessionId: string) => {
    const child = sessions.get(sessionId)
    if (child) {
      child.kill()
      sessions.delete(sessionId)
    }
    return true
  })

  // Resize is not needed for simple pipe-based terminal, but keep for future pty support

  // Open external terminal at path
  ipcMain.handle('terminal:openExternal', async (_, filePath: string) => {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', 'cmd', '/K', `cd /d ${filePath}`])
    } else if (process.platform === 'darwin') {
      spawn('/bin/sh', ['-c', `open -a Terminal "${filePath}"`])
    } else {
      spawn('/bin/sh', ['-c', `xdg-terminal --working-directory="${filePath}" || gnome-terminal --working-directory="${filePath}"`])
    }
  })
}
