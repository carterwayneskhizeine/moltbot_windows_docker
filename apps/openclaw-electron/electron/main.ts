import { app, BrowserWindow, ipcMain, Menu, shell, Tray, dialog } from 'electron'
import path from 'node:path'
import { GatewayManager } from './gateway-manager'
import { getNodePath, getOpenclawPath } from './node-runtime'

// ─── Globals ─────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null
let gatewayManager: GatewayManager | null = null
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

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
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
    gatewayManager?.getStatus() ?? { state: 'stopped', port: GATEWAY_PORT },
  )

  ipcMain.handle('gateway:start', async () => {
    try { await gatewayManager?.start() } catch (err) { console.error('gateway:start failed:', err) }
  })

  ipcMain.handle('gateway:stop', async () => {
    try { await gatewayManager?.stop() } catch (err) { console.error('gateway:stop failed:', err) }
  })

  ipcMain.handle('gateway:restart', async () => {
    try { await gatewayManager?.restart() } catch (err) { console.error('gateway:restart failed:', err) }
  })

  ipcMain.handle('gateway:getPort', () => gatewayManager?.getPort() ?? GATEWAY_PORT)

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

function initGatewayManager() {
  const nodePath = getNodePath()
  const openclawPath = getOpenclawPath()

  console.log('[main] node:', nodePath)
  console.log('[main] openclaw:', openclawPath)

  gatewayManager = new GatewayManager({
    nodePath,
    openclawPath,
    port: GATEWAY_PORT,
    onStateChange: (state) => {
      console.log('[gateway]', state)
      mainWindow?.webContents.send('gateway:stateChanged', state)
      // 现在我们保持在 index.html，由渲染进程的 iframe 加载网关页面
    },
    onLog: (level, message) => {
      console.log(`[gateway:${level}]`, message)
      mainWindow?.webContents.send('gateway:log', { level, message })
    },
  })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  dialog.showMessageBoxSync({
    type: 'warning',
    title: 'OpenClaw',
    message: 'OpenClaw 已在运行中',
    detail: '请检查系统托盘，或关闭已运行的 OpenClaw 后再启动。',
    buttons: ['确定'],
  })
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.whenReady().then(() => {
  setupIPC()
  initGatewayManager()

  // 自动启动 Gateway
  gatewayManager?.start()

  createWindow()
  createTray()
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

  if (gatewayManager) {
    gatewayManager.stop().finally(() => {
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
