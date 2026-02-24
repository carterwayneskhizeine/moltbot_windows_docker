import { app, BrowserWindow, ipcMain, Menu, shell, Tray, dialog } from 'electron'
import path from 'node:path'
import net from 'node:net'
import windowStateKeeper from 'electron-window-state'

// ─── Globals ─────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let gateway: { close: (opts?: { reason?: string }) => Promise<void> } | null = null
let tray: Tray | null = null
let isQuitting = false

const GATEWAY_PORT = 18789
const DIST = path.join(__dirname, '../dist')
const PRELOAD = path.join(__dirname, 'preload.js')

// ─── Icon ─────────────────────────────────────────────────────────────────────

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icon.ico')
  }
  return path.join(__dirname, '../assets/icon.ico')
}

// ─── Tray ─────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = getIconPath()
  tray = new Tray(iconPath)
  tray.setToolTip('OpenClaw')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ─── Titlebar Injection (Removed as titlebar handles it now) ──────

// ─── Window ───────────────────────────────────────────────────────────────────

import { PtyManager } from './pty-manager'
let ptyManager: PtyManager | null = null

function createWindow() {
  Menu.setApplicationMenu(null)

  const mainWindowState = windowStateKeeper({
    defaultWidth: 1440,
    defaultHeight: 900,
  })

  mainWindow = new BrowserWindow({
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: mainWindowState.x,
    y: mainWindowState.y,
    minWidth: 900,
    minHeight: 600,
    title: 'OpenClaw',
    icon: getIconPath(),
    // 完全自定义标题栏，系统原生按钮就删掉
    frame: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true, // 开启嵌入式浏览器支持
    },
    show: false,
  })

  // 实例化 PtyManager
  ptyManager = new PtyManager(mainWindow)

  mainWindowState.manage(mainWindow)

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // DevTools 快捷键
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (
      (input.control && input.shift && input.key.toLowerCase() === 'i') ||
      input.key === 'F12'
    ) {
      mainWindow?.webContents.toggleDevTools()
    }
  })

  // 每次页面加载完成后触发事件（原注入拖动条的逻辑移除，因为现在拖动条自带）
  // mainWindow.webContents.on('did-finish-load', () => {})

  // 超时 fallback 显示
  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) mainWindow.show()
  }, 5000)

  mainWindow.webContents.on('did-fail-load', () => mainWindow?.show())

  // 外部链接在浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // 始终加载 index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(DIST, 'index.html'))
  }

  // 关闭窗口时隐藏到托盘，不退出
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── IPC ──────────────────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.handle('gateway:status', () =>
    gateway ? { state: 'running', port: GATEWAY_PORT } : { state: 'stopped', port: GATEWAY_PORT },
  )

  ipcMain.handle('gateway:start', async () => {
    try { await startGateway() } catch (err) { console.error('gateway:start failed:', err) }
  })

  ipcMain.handle('gateway:stop', async () => {
    if (gateway) {
      try { 
        await gateway.close({ reason: 'user-requested' })
        gateway = null
      } catch (err) { console.error('gateway:stop failed:', err) }
    }
  })

  ipcMain.handle('gateway:restart', async () => {
    if (gateway) {
      try { await gateway.close({ reason: 'user-requested-restart' }) } catch (err) {}
      gateway = null
    }
    try { await startGateway() } catch (err) { console.error('gateway:restart failed:', err) }
  })

  ipcMain.handle('gateway:getPort', () => GATEWAY_PORT)

  ipcMain.handle('app:getVersion', () => app.getVersion())

  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })

  // 窗口控制
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:toggleMaximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.on('window:hideToTray', () => mainWindow?.hide())
}

// ─── Gateway ──────────────────────────────────────────────────────────────────

function attachWebContentsHandlers(webContents: Electron.WebContents): void {
  webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    delete headers['X-Frame-Options']
    delete headers['x-frame-options']
    for (const key of ['Content-Security-Policy', 'content-security-policy']) {
      if (headers[key]) {
        headers[key] = headers[key]!.map((c: string) =>
          c.replace(/frame-ancestors[^;]+;?/gi, '')
        )
      }
    }
    callback({ responseHeaders: headers })
  })
}

async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, '127.0.0.1')
    server.on('listening', () => {
      server.close()
      resolve(true)
    })
    server.on('error', () => {
      resolve(false)
    })
  })
}

import { spawn, ChildProcess } from 'child_process'

let gatewayProcess: ChildProcess | null = null

async function startGateway(): Promise<void> {
  if (process.platform === 'win32') {
    const pathKey = 'Path' in process.env ? 'Path' : 'PATH'
    const current = process.env[pathKey] || ''
    if (!current.includes('C:\\Windows\\System32')) {
      process.env[pathKey] = [
        'C:\\Windows\\System32',
        'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
        current,
      ].filter(Boolean).join(';')
    }
  }

  return new Promise((resolve, reject) => {
    try {
      // Point directly to the exact bundled node and openclaw files!
      const isPackaged = app.isPackaged
      const basePath = isPackaged ? process.resourcesPath : path.join(process.cwd(), 'release', 'win-unpacked', 'resources')
      const nodePath = path.join(basePath, 'bundled', 'node', process.platform === 'win32' ? 'node.exe' : 'node')
      const openclawPath = path.join(basePath, 'bundled', 'openclaw', 'openclaw.mjs')

      // Use a local isolated state directory to avoid user-level conflicts during dev/prod tests
      const stateDir = path.join(app.getPath('userData'), 'gateway-state')

      const logFile = path.join(process.cwd(), 'gateway-diag.log')
      const fs = require('fs')
      fs.writeFileSync(logFile, `[OpenClaw] Starting gateway via bundled node: ${nodePath}\n`)

      console.log(`[OpenClaw] Starting gateway via bundled node: ${nodePath}`)
      gatewayProcess = spawn(nodePath, [
        openclawPath, 
        'gateway', 
        'run', 
        '--port', 
        String(GATEWAY_PORT),
        '--allow-unconfigured'
      ], {
        windowsHide: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          OPENCLAW_SKIP_CHANNELS: '1',
          OPENCLAW_STATE_DIR: stateDir,
          OPENCLAW_PROFILE: 'electron',
          OPENCLAW_CONFIG_PATH: path.join(stateDir, 'openclaw.json')
        }
      })

      if (gatewayProcess.stdout) {
        gatewayProcess.stdout.on('data', (data) => {
          fs.appendFileSync(logFile, `[STDOUT] ${data}\n`)
          console.log(`[Gateway] ${data.toString().trim()}`)
        })
      }

      if (gatewayProcess.stderr) {
        gatewayProcess.stderr.on('data', (data) => {
          fs.appendFileSync(logFile, `[STDERR] ${data}\n`)
          console.error(`[Gateway Err] ${data.toString().trim()}`)
        })
      }

      gatewayProcess.on('error', (err) => {
        fs.appendFileSync(logFile, `[FATAL] ${err}\n`)
        console.error('[OpenClaw] Failed to spawn bundled node process:', err)
        reject(err)
      })

      gatewayProcess.on('close', (code) => {
        fs.appendFileSync(logFile, `[CLOSE] Code ${code}\n`)
        console.log(`[OpenClaw] Gateway process exited with code ${code}`)
        gatewayProcess = null
      })

      // We resolve immediately after a short boot delay
      setTimeout(() => {
        gateway = {
          close: async () => {
            if (gatewayProcess) {
              console.log('[OpenClaw] Killing gateway process...')
              gatewayProcess.kill()
              gatewayProcess = null
            }
          }
        }
        resolve()
      }, 2000)

    } catch (error) {
      console.error('Failed to spawn openclaw locally:', error)
      reject(error)
    }
  })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  // dialog 只能在 app ready 之后调用
  app.whenReady().then(() => {
    dialog.showMessageBoxSync({
      type: 'warning',
      title: 'OpenClaw',
      message: 'OpenClaw 已在运行中',
      detail: '请检查系统托盘，或关闭已运行的 OpenClaw 后再启动。',
      buttons: ['确定'],
    })
    app.quit()
  })
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(async () => {
  const portAvailable = await checkPortAvailable(GATEWAY_PORT)
  if (!portAvailable) {
    console.warn(`[OpenClaw] Port ${GATEWAY_PORT} is already in use`)
  }

  try {
    await startGateway()
  } catch (error) {
    console.error('[OpenClaw] Failed to start gateway:', error)
  }

  createWindow()
  createTray()

  app.on('web-contents-created', (_event, webContents) => {
    attachWebContentsHandlers(webContents)
  })

  setupIPC()
})

app.on('window-all-closed', () => {
  // 不退出 — 由托盘菜单"退出"驱动
})

app.on('before-quit', (event) => {
  if (isQuitting) return
  
  event.preventDefault()
  isQuitting = true

  // 销毁所有 PTY 实例
  if (ptyManager) {
    ptyManager.destroyAll()
  }

  if (tray) {
    tray.destroy()
    tray = null
  }

  if (gateway) {
    console.log('[OpenClaw] Shutting down gateway...')
    gateway.close({ reason: 'electron-quit' })
      .catch((err: Error) => console.error('Gateway close error:', err))
      .finally(() => {
        gateway = null
        app.quit()
      })
  } else {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
