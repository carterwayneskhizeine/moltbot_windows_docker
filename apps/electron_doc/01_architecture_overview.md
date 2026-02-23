# 01 — OpenClaw Electron 架构总设计（NPM 包模式）

> 版本 v3.0 | 2026-02-24
> 核心方案：**OpenClaw 以 npm 包形式发布，Electron 通过 `npm install openclaw` 引入，在主进程内直接调用 Gateway API —— 与 Pinokio 使用 `pinokiod` npm 包完全同构**

---

## 一、Pinokio 架构（照搬对象）

```
Electron 主进程 (main.js / full.js)
  │
  ├── const Pinokiod = require("pinokiod")          ← npm 包 (node_modules/pinokiod/)
  │      └── index.js → module.exports = require('./server')
  │           └── class Server { constructor(config), start(options), ... }
  │
  ├── const pinokiod = new Pinokiod(config)          ← 实例化（app.ready 之前）
  │
  └── app.whenReady() → {
        await pinokiod.start({                        ← HTTP 服务器在主进程内启动
          onquit, onrestart, onrefresh,
          browser: { clearCache }                     ← Electron 特定回调
        })
        PORT = pinokiod.port                          ← 服务就绪后获取端口
        createWindow(PORT)                            ← BrowserWindow → http://localhost:PORT
      }
```

**关键源码位置**：
- 入口: `D:\Code\pinokio\main.js` 第 3-6 行 — `require("pinokiod")` + `new Pinokiod(config)`
- 启动: `D:\Code\pinokio\full.js` 第 2330-2367 行 — `pinokiod.start({ onquit, onrestart, ... })`
- 退出: `D:\Code\pinokio\full.js` 第 2379-2404 行 — `pinokiod.kernel.kill()` / `shell.reset()`
- 窗口: `D:\Code\pinokio\full.js` 第 2066-2134 行 — `createWindow(port)`
- 依赖: `D:\Code\pinokio\package.json` 第 147 行 — `"pinokiod": "^6.0.10"`

---

## 二、OpenClaw 新架构（高度模仿 Pinokio）

```
Electron 主进程 (main.ts)
  │
  ├── import("openclaw")                              ← npm 包 (node_modules/openclaw/)
  │      └── dist/index.js → 导出 startGatewayServer
  │           └── startGatewayServer(port, opts) → Promise<{ close }>
  │
  └── app.whenReady() → {
        gateway = await startGatewayServer(PORT, {    ← HTTP + WS 服务器在主进程内启动
          controlUiEnabled: true
        })
        createWindow(PORT)                            ← BrowserWindow → http://127.0.0.1:PORT
      }

  app.on('before-quit') → {
    await gateway.close({ reason: 'electron-quit' }) ← 退出时清理
  }
```

**零子进程、零 PTY、零 CMD 窗口、零计划任务**

---

## 三、NPM 包模式对比

### 3.1 Pinokio ↔ OpenClaw 逐项对照

| 维度 | Pinokio (`pinokiod` 包) | OpenClaw (`openclaw` 包) |
|------|-------------------------|--------------------------|
| **npm 包名** | `pinokiod` | `openclaw` |
| **安装方式** | `"pinokiod": "^6.0.10"` (dependencies) | `"openclaw": "^2026.x.x"` (dependencies) |
| **全局安装** | 不需要 | 用 `npm install -g openclaw@latest` |
| **入口文件** | `index.js` → `module.exports = require('./server')` | `dist/index.js` (ESM, exports `startGatewayServer`) |
| **模块格式** | CJS (`require`) | ESM (`import`) |
| **包结构** | `server/` + `kernel/` + `pipe/` | `dist/` + `node_modules/` |
| **静态资源** | `server/public/` (Pinokio 前端 UI) | `dist/control-ui/` (OpenClaw 控制面板 SPA) |
| **服务启动** | `new Server(config)` → `server.start(opts)` | `startGatewayServer(port, opts)` |
| **服务关闭** | `server.stop()` / `kernel.kill()` | `gateway.close({ reason })` |
| **端口** | `42000` (默认) | `18789` (默认) |

### 3.2 pinokiod 包内部结构（参考 `D:\Code\goldieopenclaw\tmp\package\`）

```
pinokiod/
├── index.js                 ← module.exports = require('./server')  [37 bytes]
├── package.json             ← CJS, 83 dependencies
├── worker.js                ← Web Worker
├── kernel/                  ← 核心：Shell / Git / API / Store / Environment
│   ├── index.js             ← class Kernel { init(), shell, processes... }
│   ├── shell.js             ← PTY 管理 (node-pty-prebuilt-multiarch)
│   ├── environment.js       ← 环境变量管理
│   └── api/                 ← Terminal API, Cloudflare 等
├── server/                  ← HTTP 服务器
│   ├── index.js             ← class Server { start(), stop(), ... }  [511KB, 14363行]
│   ├── socket.js            ← WebSocket 处理
│   ├── public/              ← 前端静态资源 [673 files]
│   └── views/               ← EJS 模板
└── pipe/                    ← 进程间通信管道
```

### 3.3 openclaw npm 包结构（发布到 npm 后）

```
openclaw/
├── dist/                    ← tsdown 编译输出
│   ├── index.js             ← 主入口 (ESM)
│   ├── entry.js             ← CLI 入口
│   ├── gateway/
│   │   ├── server.js        ← 导出 startGatewayServer  ★ 关键
│   │   ├── server.impl.js
│   │   ├── control-ui.js    ← 处理 Control UI 静态资源请求
│   │   └── ...
│   ├── control-ui/          ← ★ SPA 静态资源（之前 404 的元凶）
│   │   ├── index.html
│   │   ├── assets/
│   │   └── ...
│   └── ...
├── openclaw.mjs             ← CLI 入口 (bin)
├── package.json             ← ESM ("type": "module")
└── node_modules/            ← 生产依赖（安装时自动创建）
```

---

## 四、为什么必须用 `require` / 动态 `import()` 而不能用 Vite `import`

### 4.1 之前失败的方案总结

| 尝试方案 | 失败原因 |
|---------|---------|
| `gateway start` (计划任务) | Windows `schtasks` 弹出 cmd 大黑窗 |
| `gateway run` (PTY 内部) | config-guard 校验失败，插件不存在 → `exit(1)` |
| 直接 `import` 源码进 Vite | Vite 把所有源码压成单文件，`import.meta.url` 失效 → control-ui 404 |
| `fork()` / `spawn()` 子进程 | Windows 下 `spawn('node', ...)` 会弹窗 |

### 4.2 Pinokio 成功的秘密

1. **`pinokiod` 是 npm 包**，通过 `npm install` 安装到 `node_modules/pinokiod/`
2. **electron-builder 不会压缩 `node_modules`**，只是原样拷贝（可选 asar 打包但带 `asarUnpack`）
3. **`require("pinokiod")` 走的是 Node.js 原生模块加载**，不经过 Vite/Webpack
4. **`pinokiod` 内部的 `__dirname`、相对路径全部正常**，因为文件树结构完整保持

**关键对比**：
```
❌ import { startGatewayServer } from '../../../src/gateway/server'
   → Vite 介入 → 源码被压缩 → __dirname / import.meta.url 全废

✅ const openclaw = await import("openclaw")
   → Node.js 原生模块加载 → 文件树完整 → 路径正常
```

### 4.3 CWD 与 Control UI 定位

OpenClaw 内部基于多候选路径搜索 `dist/control-ui/index.html` 来定位前端 SPA：

```typescript
// src/infra/control-ui-assets.ts 第 155-201 行
export function resolveControlUiRootSync(opts) {
  const candidates = new Set<string>()
  // ...
  addCandidate(candidates, path.join(cwd, "dist", "control-ui"))     // ← 第 193 行
  // ...
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir      // ← 第 197 行
  }
}
```

当 OpenClaw 作为 npm 包安装时，`dist/control-ui/` 在 `node_modules/openclaw/dist/control-ui/` 中。
`import.meta.url` 指向 `node_modules/openclaw/dist/gateway/server.impl.js`，模块解析会往上遍历找到 `dist/control-ui/` — **天然匹配！不需要额外设置 CWD。**

---

## 五、Electron 项目依赖配置

### 5.1 `package.json` — 等同 Pinokio 的依赖声明方式

```jsonc
// apps/openclaw-electron/package.json
{
  "name": "openclaw-electron",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "dependencies": {
    // ★ 核心：openclaw 作为 npm 依赖
    // 等同 Pinokio package.json 第 147 行: "pinokiod": "^6.0.10"
    "openclaw": "^2026.2.22",

    // Electron 辅助依赖（与 Pinokio 相同）
    "electron-window-state": "^5.0.3",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "electron": "39.2.3",
    "electron-builder": "26.2.0",
    "vite": "^6.0.0",
    "vite-plugin-electron": "^0.30.0"
  }
}
```

### 5.2 `electron-builder.yml` — asarUnpack 保护关键资源

```yaml
# electron-builder.yml
appId: com.openclaw.desktop
productName: "OpenClaw"

files:
  - dist/**/*
  - dist-electron/**/*

# ★ 关键：asarUnpack 确保 openclaw 包不被压缩
# 对标 Pinokio package.json 第 38-44 行的 asarUnpack
asarUnpack:
  # openclaw 的前端 SPA 资源必须物理存在于文件系统
  - "node_modules/openclaw/dist/control-ui/**/*"
  # 如果用了 node-pty 等原生模块
  - "node_modules/@lydell/**/*"
  - "node_modules/sharp/**/*"

win:
  target:
    - target: nsis
      arch: [x64]
```

**对比 Pinokio** (`D:\Code\pinokio\package.json` 第 38-44 行)：
```json
"asarUnpack": [
  "node_modules/go-get-folder-size/**/*",
  "node_modules/7zip-bin/**/*",
  "node_modules/@homebridge/**/*",
  "node_modules/pinokiod/server/public/**/*"   // ← 后端静态资源也 unpack！
]
```

Pinokio 将 `pinokiod/server/public/**/*` 列入 asarUnpack，目的是让前端资源可以被 Express 直接作为静态文件 serve。**OpenClaw 同理，必须 unpack `openclaw/dist/control-ui/**/*`。**

---

## 六、文件清单

| 文档 | 内容 |
|-----|------|
| `01_architecture_overview.md` | 本文件 — 总体架构 + NPM 包方案 |
| `02_main_process_design.md` | Electron 主进程详细设计 + Gateway API 调用 |
| `03_gateway_integration.md` | Gateway 集成方案 + control-ui 404 根治 + ESM/CJS |
| `04_build_and_packaging.md` | 构建流程 + electron-builder 配置 + asarUnpack |
| `05_pinokio_reference.md` | Pinokio 源码关键位置速查表 |

---

## 七、关键原则

1. **OpenClaw 以 npm 包形式存在**：`npm install openclaw` 安装到 Electron 的 `node_modules/`
2. **Electron 主进程 = OpenClaw Gateway 宿主**：不是"启动者"，而是"宿主" — 服务跑在主进程内
3. **不用 Vite/Webpack 打包后端**：后端代码通过 npm 安装，保持完整 `node_modules` 目录结构
4. **用动态 `import()` 或 `require()`**：避免构建工具介入
5. **`asarUnpack` 保护 `dist/control-ui/`**：确保 SPA 静态资源物理存在于文件系统
6. **更新只需 `npm update openclaw`**：等同 Pinokio 更新 `pinokiod` 的方式
