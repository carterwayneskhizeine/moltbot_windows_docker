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

// ─── Titlebar Injection ──────────────────────────────────────────────────────

/**
 * 向当前已加载的页面注入拖动条。
 * loading 页（index.html）自带拖动条并设置了 window.__OPENCLAW_TITLEBAR__，会被跳过；
 * 外部 Gateway Web UI 页面则注入一个固定在顶部的拖动条 + 窗口控制按钮。
 */
function injectTitlebar(win: BrowserWindow | null) {
  if (!win) return

  const js = `
    (function() {
      if (document.getElementById('__oc_titlebar') || window.__OPENCLAW_TITLEBAR__) return;

      const bar = document.createElement('div');
      bar.id = '__oc_titlebar';
      bar.style.cssText = [
        'position:fixed','top:0','left:0','width:100%','height:36px',
        'background:#141414','display:flex','align-items:center',
        'justify-content:space-between','padding:0 8px 0 14px',
        'z-index:2147483647','-webkit-app-region:drag',
        'border-bottom:1px solid rgba(255,255,255,0.07)',
        'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
        'user-select:none','box-sizing:border-box',
      ].join(';');

      const title = document.createElement('span');
      title.textContent = 'OpenClaw';
      title.style.cssText = 'font-size:12px;font-weight:500;color:rgba(255,255,255,0.45);letter-spacing:.3px';

      const controls = document.createElement('div');
      controls.style.cssText = 'display:flex;align-items:center;gap:2px;-webkit-app-region:no-drag';

      const btnBase = 'width:32px;height:28px;border:none;background:transparent;' +
        'color:rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;' +
        'cursor:pointer;border-radius:4px;transition:background .15s,color .15s;padding:0';

      function makeBtn(svg, hoverBg, cb) {
        const b = document.createElement('button');
        b.innerHTML = svg;
        b.style.cssText = btnBase;
        b.onmouseenter = () => { b.style.background = hoverBg; b.style.color = '#fff'; };
        b.onmouseleave = () => { b.style.background = 'transparent'; b.style.color = 'rgba(255,255,255,0.5)'; };
        b.onclick = cb;
        return b;
      }

      const api = window.electronAPI;
      const SVG_MIN = '<svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1"/></svg>';
      const SVG_MAX = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><rect x=".5" y=".5" width="9" height="9"/></svg>';
      const SVG_CLOSE = '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M1 1l8 8M9 1L1 9"/></svg>';

      controls.appendChild(makeBtn(SVG_MIN,  'rgba(255,255,255,0.1)', () => api && api.window && api.window.minimize()));
      controls.appendChild(makeBtn(SVG_MAX,  'rgba(255,255,255,0.1)', () => api && api.window && api.window.toggleMaximize()));
      controls.appendChild(makeBtn(SVG_CLOSE,'#e81123',               () => api && api.window && api.window.hideToTray()));

      bar.appendChild(title);
      bar.appendChild(controls);
      document.documentElement.appendChild(bar);

      // body 加 padding-top，让页面主内容向下移动，不被 titlebar 遮挡
      // 使用 body 而非 html，避免影响滚动条位置
      const style = document.createElement('style');
      style.id = '__oc_titlebar_style';
      style.textContent = 'body { margin-top: 36px !important; }';
      document.head.appendChild(style);
    })()
  `

  win.webContents.executeJavaScript(js).catch(() => {})
}

// ─── Window ───────────────────────────────────────────────────────────────────

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
    },
    show: false,
  })

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

  // 每次页面加载完成后注入拖动条（包括 Gateway Web UI 页）
  mainWindow.webContents.on('did-finish-load', () => {
    injectTitlebar(mainWindow)
  })

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

  // 当 Gateway 就绪后，导航到 Control UI
  // 这里我们加载一个本地 loading 页，等待 Gateway 就绪后由渲染进程跳转
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
      // 当 Gateway 就绪且窗口当前停留在 loading 页时，导航到 Control UI
      if (state === 'ready' && mainWindow) {
        const currentURL = mainWindow.webContents.getURL()
        const isLoadingPage = currentURL.includes('index.html') ||
          currentURL.startsWith('http://localhost:') ||
          currentURL.startsWith('http://127.0.0.1:517') // Vite dev port
        if (isLoadingPage) {
          setTimeout(() => {
            mainWindow?.loadURL(`http://127.0.0.1:${GATEWAY_PORT}`)
          }, 800)
        }
      }
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
