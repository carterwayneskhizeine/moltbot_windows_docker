import { ipcMain, BrowserWindow } from 'electron'
import { buildSafeEnvironment } from './env-utils'

// 动态加载避免原生模块编译失败导致应用直接崩溃
let pty: any = null
try {
  pty = require('@homebridge/node-pty-prebuilt-multiarch')
} catch (e) {
  console.warn('Failed to load @homebridge/node-pty-prebuilt-multiarch module. Terminal feature will be disabled.', e)
}

export class PtyManager {
  private ptys: Map<string, any> = new Map()

  constructor(private mainWindow: BrowserWindow) {
    this.setupIPC()
  }

  private setupIPC() {
    ipcMain.handle('pty:create', (event, options?: { cwd?: string; id?: string }) => {
      const id = options?.id || Math.random().toString(36).substring(2, 9)
      this.createPty(id, options?.cwd)
      return id
    })

    ipcMain.on('pty:write', (event, id: string, data: string) => {
      const pt = this.ptys.get(id)
      if (pt) {
        pt.write(data)
      }
    })

    ipcMain.on('pty:resize', (event, id: string, cols: number, rows: number) => {
      const pt = this.ptys.get(id)
      if (pt) {
        try {
          pt.resize(cols, rows)
        } catch (e) {
          console.error(`Failed to resize PTY ${id}:`, e)
        }
      }
    })

    ipcMain.on('pty:destroy', (event, id: string) => {
      this.destroyPty(id)
    })
  }

  private createPty(id: string, customCwd?: string) {
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash'
    const cwd = customCwd || process.cwd()
    const safeEnv = buildSafeEnvironment(process.env)
    return this.spawnCommand(id, shell, [], cwd, safeEnv)
  }

  public spawnCommand(id: string, command: string, args: string[], cwd: string, env: Record<string, string>) {
    if (this.ptys.has(id)) {
      this.destroyPty(id)
    }

    if (!pty) {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        setTimeout(() => {
          this.mainWindow.webContents.send('pty:data', id, '\r\n\x1b[31mError: Native PTY module failed to load. Please install Spectre-mitigated libraries in Visual Studio to compile node-pty, or wait for prebuild support.\x1b[0m\r\n')
        }, 500)
      }
      return null
    }

    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd,
      env,
    })

    ptyProcess.onData((data: string) => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('pty:data', id, data)
      }
    })

    ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
      this.ptys.delete(id)
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('pty:exit', id, { exitCode, signal })
      }
    })

    this.ptys.set(id, ptyProcess)
    return ptyProcess
  }

  public destroyPty(id: string) {
    const pt = this.ptys.get(id)
    if (pt) {
      try {
        pt.kill()
      } catch (e) {
        console.error(`Failed to kill PTY ${id}:`, e)
      }
      this.ptys.delete(id)
    }
  }

  public destroyAll() {
    for (const [id, pt] of this.ptys.entries()) {
      try {
        pt.kill()
      } catch (e) {
        console.error(`Failed to kill PTY ${id}:`, e)
      }
    }
    this.ptys.clear()
  }
}
