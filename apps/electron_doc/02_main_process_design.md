# 02 — Electron 主进程详细设计 + Gateway API 调用

> 对标文件：`D:\Code\pinokio\full.js`(2445 行) + `D:\Code\pinokio\main.js`(23 行)
> 核心变更：openclaw 不再打包源码，而是作为 npm 依赖安装

---

## 一、Pinokio 主进程流程与 OpenClaw 逐行对照

### 1.1 `main.js` — 入口（第 1-22 行）

```javascript
// D:\Code\pinokio\main.js
const { app } = require('electron')
const Pinokiod = require("pinokiod")           // ← npm 包, CJS
const config = require('./config')
const pinokiod = new Pinokiod(config)           // ← app.ready 之前就实例化

let mode = pinokiod.kernel.store.get("mode") || "full"
if (mode === 'minimal') {
  require('./minimal');
} else {
  require('./full');
}
```

**OpenClaw 对应**：
```typescript
// electron/main.ts
import { app } from 'electron'

// ★ openclaw 是 ESM 包 ("type": "module")，必须用动态 import()
// 等同于 Pinokio main.js 第 3 行: const Pinokiod = require("pinokiod")
let startGatewayServer: Function

async function loadOpenClaw() {
  // 动态 import，避免 Vite 介入
  // openclaw 包入口: dist/index.js → 导出 startGatewayServer
  const mod = await import("openclaw")
  startGatewayServer = mod.startGatewayServer
  // 或者从子路径导入:
  // const mod = await import("openclaw/dist/gateway/server.js")
}
```

### 1.2 `full.js` — 核心初始化流程

| Pinokio 行号 | 功能 | OpenClaw 是否照搬 |
|-------------|------|-------------------|
| 2 | `require('electron-window-state')` | ✅ 照搬 |
| 5 | `const Pinokiod = require("pinokiod")` | ✅ 改为 `import("openclaw")` |
| 62 | `const pinokiod = new Pinokiod(config)` | ✅ 改为 `startGatewayServer(port, opts)` |
| 222-266 | Splash Window | ✅ 照搬 |
| 2193 | `app.requestSingleInstanceLock()` | ✅ 照搬（防止多开） |
| 2230-2232 | `commandLine.appendSwitch` | 可选 |
| 2234 | `app.whenReady().then(...)` | ✅ 照搬 |
| 2310-2314 | `updateSplashWindow('Starting...')` | ✅ 照搬 |
| 2319-2326 | `pinokiod.running(port)` 端口占用检测 | ✅ 照搬 |
| **2330-2367** | **`pinokiod.start({ onquit, ... })`** | **✅ 核心照搬** |
| 2373 | `closeSplashWindow()` | ✅ 照搬 |
| 2374 | `PORT = pinokiod.port` | ✅ 照搬 |
| 2375 | `app.on('web-contents-created', attach)` | ✅ 照搬 |
| **2379-2391** | **`before-quit` → `kernel.kill()`** | **✅ 照搬** |
| 2392-2404 | `window-all-closed` → `shell.reset()` | ✅ 照搬 |
| 2440 | `createWindow(PORT)` | ✅ 照搬 |
| 2441 | `updater.run(mainWindow)` | 暂不需要 |

---

## 二、OpenClaw 主进程完整代码设计

### 2.1 `electron/main.ts`

```typescript
// electron/main.ts
// ★ 对标 D:\Code\pinokio\full.js + D:\Code\pinokio\main.js

import {
  app,
  BrowserWindow,
  ipcMain,
  session,
  Tray,
  Menu,
  nativeImage,
  shell,
} from 'electron'
import windowStateKeeper from 'electron-window-state'
import path from 'node:path'
import fs from 'node:fs'
import net from 'node:net'

// ============ 全局状态 ============
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let gateway: { close: (opts?: { reason?: string }) => Promise<void> } | null = null
let PORT = 18789
let isQuitting = false

// ============ Gateway 启动 ============
// 对标 D:\Code\pinokio\full.js 第 2330-2367 行
//
// Pinokio 的做法：
//   const Pinokiod = require("pinokiod")        // CJS npm 包
//   const pinokiod = new Pinokiod(config)
//   await pinokiod.start({ onquit, onrestart, onrefresh, browser })
//
// OpenClaw 的做法：
//   const { startGatewayServer } = await import("openclaw")  // ESM npm 包
//   gateway = await startGatewayServer(port, opts)

async function startGateway(): Promise<void> {
  // ★★★ 动态 import openclaw npm 包 ★★★
  // 使用动态 import() 而不是静态 import，这样：
  //   1. Vite 不会把它打包进 dist-electron/
  //   2. Node.js 原生模块加载保持 openclaw 的完整目录结构
  //   3. import.meta.url 在 openclaw 内部正确指向 node_modules/openclaw/dist/...
  //
  // 注意：如果 Vite 仍然尝试 bundle "openclaw"，
  // 需要在 vite.config.ts 的 rollupOptions.external 中添加 "openclaw"

  const openclawModule = await import("openclaw")

  // 但 openclaw 的 dist/index.js 可能不直接导出 startGatewayServer
  // 需要检查实际导出。根据 package.json exports 和 src/index.ts 的内容，
  // 可能需要直接导入 gateway/server 子模块：
  //
  // 方案 A: 如果 openclaw 主入口导出了 startGatewayServer
  //   const { startGatewayServer } = openclawModule
  //
  // 方案 B: 直接导入子模块路径
  //   const { startGatewayServer } = await import("openclaw/dist/gateway/server.js")
  //
  // 方案 C: 在你的魔改版 npm 包中确保主入口导出 startGatewayServer
  //   → 推荐！最干净的方式

  const { startGatewayServer } = openclawModule

  // ★★★ 在主进程内启动 Gateway ★★★
  // 等同于 Pinokio full.js 第 2330 行: await pinokiod.start({ ... })
  //
  // startGatewayServer 的签名（参见 src/gateway/server.impl.ts 第 168 行）:
  //   export async function startGatewayServer(
  //     port = 18789,
  //     opts: GatewayServerOptions = {},
  //   ): Promise<GatewayServer>
  //
  // GatewayServer 类型:
  //   { close: (opts?: { reason?: string; restartExpectedMs?: number | null }) => Promise<void> }

  gateway = await startGatewayServer(PORT, {
    controlUiEnabled: true,
    // bind: 'loopback',   // 可选: 限制只绑定 127.0.0.1
  })

  console.log(`[OpenClaw] Gateway started on port ${PORT}`)
}

// ============ 端口占用检测 ============
// 对标 D:\Code\pinokio\full.js 第 2319-2326 行：
//   const portInUse = await pinokiod.running(pinokiod.port)

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

// ============ 窗口创建 ============
// 对标 D:\Code\pinokio\full.js 第 2066-2134 行

function createMainWindow(port: number): void {
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 800,
  })

  mainWindow = new BrowserWindow({
    // 对标 Pinokio full.js 第 2076-2093 行
    titleBarStyle: 'hidden',
    titleBarOverlay: process.platform === 'darwin'
      ? false
      : { color: '#1a1a2e', symbolColor: '#e0e0e0', height: 36 },
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 400,
    minHeight: 300,
    webPreferences: {
      // 对标 Pinokio full.js 第 2083-2092 行
      webSecurity: false,
      contextIsolation: false,
      nodeIntegrationInSubFrames: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // 对标 Pinokio full.js 第 2125-2130 行
  const url = `http://127.0.0.1:${port}`
  mainWindow.loadURL(url)

  mainWindowState.manage(mainWindow)

  // 关闭窗口时隐藏到托盘（不退出）
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ============ 系统托盘 ============
function createTray(): void {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'icon.png')
    : path.join(__dirname, '..', 'assets', 'icon.png')

  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        } else {
          createMainWindow(PORT)
        }
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('OpenClaw Gateway')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createMainWindow(PORT)
    }
  })
}

// ============ Splash Window ============
// 对标 D:\Code\pinokio\full.js 第 222-266 行
let splashWindow: BrowserWindow | null = null

function showSplashWindow(message: string): void {
  splashWindow = new BrowserWindow({
    width: 420, height: 320,
    frame: false, resizable: false, transparent: true,
    show: true, alwaysOnTop: true, skipTaskbar: true,
    webPreferences: { backgroundThrottling: false },
  })
  splashWindow.loadURL(`data:text/html;charset=utf-8,
    <html><body style="
      margin:0; display:flex; align-items:center; justify-content:center;
      height:100vh; background:rgba(26,26,46,0.95); color:#fff;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      border-radius:16px; user-select:none; -webkit-app-region:drag;
    "><div style="text-align:center;">
      <div style="font-size:28px; margin-bottom:16px;">🐾 OpenClaw</div>
      <div style="font-size:14px; opacity:0.7;">${message}</div>
    </div></body></html>`)
}

function closeSplashWindow(): void {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
    splashWindow = null
  }
}

// ============ HTTP Headers 处理 ============
// 对标 D:\Code\pinokio\full.js 第 1774-1857 行
function attachWebContentsHandlers(webContents: Electron.WebContents): void {
  // 删除 X-Frame-Options 和 CSP frame-ancestors
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

  // 外部链接用系统浏览器打开 (对标 full.js 第 1753-1769 行)
  webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin !== `http://127.0.0.1:${PORT}`) {
        event.preventDefault()
        shell.openExternal(url)
      }
    } catch { /* ignore */ }
  })
}

// ============ 单实例锁 ============
// 对标 D:\Code\pinokio\full.js 第 2193-2226 行
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })

  // ============ 主启动流程 ============
  // 对标 D:\Code\pinokio\full.js 第 2234-2442 行
  app.whenReady().then(async () => {
    console.log('[OpenClaw] App ready, starting gateway...')
    showSplashWindow('正在启动 Gateway...')

    try {
      // 1. 检查端口 (对标 full.js 第 2319-2326 行)
      const portAvailable = await checkPortAvailable(PORT)
      if (!portAvailable) {
        console.warn(`[OpenClaw] Port ${PORT} is already in use`)
        // TODO: 可考虑提示用户或自动切换端口
      }

      // 2. ★ 启动 Gateway（主进程内，零子进程）
      // 对标 full.js 第 2330 行: await pinokiod.start({ ... })
      await startGateway()

      // 3. 关闭 splash，创建窗口和托盘
      // 对标 full.js 第 2373-2374 行
      closeSplashWindow()
      createMainWindow(PORT)
      createTray()

      // 4. 注册 web-contents 处理器 (对标 full.js 第 2375 行)
      app.on('web-contents-created', (_event, webContents) => {
        attachWebContentsHandlers(webContents)
      })

    } catch (error) {
      console.error('[OpenClaw] Failed to start:', error)
      // 展示错误（对标 full.js 第 272-300 行的错误处理）
      if (splashWindow && !splashWindow.isDestroyed()) {
        const msg = error instanceof Error ? error.message : String(error)
        splashWindow.loadURL(`data:text/html;charset=utf-8,
          <html><body style="margin:0;display:flex;align-items:center;justify-content:center;
            height:100vh;background:rgba(46,26,26,0.95);color:#fff;
            font-family:-apple-system,sans-serif;border-radius:16px;padding:20px;">
            <div style="text-align:center;max-width:380px;">
              <div style="font-size:24px;margin-bottom:16px;">⚠️ 启动失败</div>
              <div style="font-size:12px;opacity:0.8;word-break:break-all;">
                ${msg.replace(/</g, '&lt;')}
              </div>
            </div>
          </body></html>`)
      }
    }
  })

  // ============ 退出清理 ============
  // 对标 D:\Code\pinokio\full.js 第 2379-2404 行：
  //   app.on('before-quit', (e) => {
  //     if (pinokiod.kernel.kill) {
  //       e.preventDefault()
  //       isQuitting = true
  //       pinokiod.kernel.kill()
  //     }
  //   })
  app.on('before-quit', (e) => {
    if (gateway && !isQuitting) {
      e.preventDefault()
      isQuitting = true
      console.log('[OpenClaw] Shutting down gateway...')
      gateway
        .close({ reason: 'electron-quit' })
        .catch((err) => console.error('Gateway close error:', err))
        .finally(() => {
          gateway = null
          app.quit()
        })
    }
  })

  // 对标 full.js 第 2392-2404 行
  app.on('window-all-closed', () => {
    // 不退出，保持 Gateway 在后台运行
    console.log('[OpenClaw] All windows closed, gateway continues in tray')
  })
}
```

---

## 三、ESM vs CJS 兼容性处理

### 3.1 问题

| 项目 | 模块格式 |
|-----|---------|
| Pinokio 主进程 | CJS |
| pinokiod npm 包 | CJS (`module.exports = require('./server')`) |
| Electron 主进程 (Vite 编译后) | CJS (Vite 把 TS 编成 CJS 给 Electron) |
| **openclaw npm 包** | **ESM** (`"type": "module"`) |

两者的差异：
- Pinokio: `const Pinokiod = require("pinokiod")` — 完美匹配 CJS → CJS
- OpenClaw: Electron 主进程(CJS) 要加载 openclaw(ESM) — 需要 `await import()`

### 3.2 解决方案

**方案 A: 动态 `import()` (推荐)**

CJS 环境可以用 `await import("esm-package")`：

```typescript
// electron/main.ts (编译后是 CJS)
async function loadOpenClaw() {
  const { startGatewayServer } = await import("openclaw")
  return startGatewayServer
}
```

**方案 B: 在魔改版 npm 包中发布 CJS 入口**

在你的 `package.json` 中添加 `exports` 的 CJS 字段：

```jsonc
// openclaw/package.json (魔改版)
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"     // ← 添加 CJS 入口
    }
  }
}
```

然后 Electron 主进程可以直接 `require("openclaw")`。

**方案 C: vite.config.ts 不编译主进程为 CJS**

Vite 可以配置输出 ESM：

```typescript
// vite.config.ts
electron({
  entry: 'electron/main.ts',
  vite: {
    build: {
      rollupOptions: {
        output: { format: 'esm' },   // 主进程也输出 ESM
        external: ['openclaw'],       // ★ 不打包 openclaw
      },
    },
  },
})
```

### 3.3 推荐方案

组合使用：
1. 在 `vite.config.ts` 中将 `openclaw` 列为 `external`（不让 Vite 打包它）
2. 在代码中用 `await import("openclaw")` 动态加载
3. 如果你的魔改版同时输出了 CJS，则更简单：直接 `require("openclaw")`

---

## 四、`vite.config.ts` — 必须排除 openclaw

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'

export default defineConfig({
  plugins: [
    electron({
      entry: 'electron/main.ts',
      vite: {
        build: {
          rollupOptions: {
            // ★★★ 告诉 Vite 不要打包 openclaw ★★★
            // openclaw 作为 npm 依赖存在于 node_modules 中，
            // electron-builder 会把 node_modules 一起打包
            external: [
              'openclaw',
              'electron',
              'electron-window-state',
              'electron-store',
            ],
          },
        },
      },
    }),
  ],
})
```

---

## 五、与 Pinokio 的关键差异

| 差异点 | Pinokio | OpenClaw |
|--------|---------|----------|
| 后端 npm 包格式 | CJS | ESM |
| 加载方式 | `require("pinokiod")` | `await import("openclaw")` |
| 后端 API | `new Pinokiod(config).start()` | `startGatewayServer(port, opts)` |
| 返回值 | `pinokiod` 实例 (含 `.port`, `.kernel`, etc.) | `{ close }` 对象 |
| 端口管理 | 动态 `pinokiod.port` | 传 `port` 参数 (默认 18789) |
| 退出回调 | `pinokiod.start({ onquit })` | `gateway.close({ reason })` |
| 前端 UI 资源路径 | `node_modules/pinokiod/server/public/` | `node_modules/openclaw/dist/control-ui/` |
| URL scheme | `pinokio://` | 暂不需要 |
| 更新器 | `electron-updater` | 暂不需要 |

---

## 六、Windows PATH 注入

对标 `D:\Code\goldieopenclaw\tmp\package\server\index.js` 第 194-208 行：

```javascript
// pinokiod/server/index.js
// Server constructor 内:
let platform = os.platform()
if (platform === 'win32') {
  let PATH_KEY;
  if (process.env.Path) {
    PATH_KEY = "Path"
  } else if (process.env.PATH) {
    PATH_KEY = "PATH"
  }
  process.env[PATH_KEY] = [
    "C:\\Windows\\System32",
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0",
    process.env[PATH_KEY]
  ].join(path.delimiter)
}
```

OpenClaw 的 `startGatewayServer` 内部已经通过 `ensureOpenClawCliOnPath()` 处理了 PATH（参见 `src/gateway/server.impl.ts` 第 96 行），但如果你的魔改版去掉了这个逻辑，建议在 `main.ts` 的 `startGateway()` 调用之前手动追加：

```typescript
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
```
