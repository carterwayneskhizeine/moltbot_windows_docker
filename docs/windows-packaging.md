# OpenClaw Windows .exe 打包计划

> 基于 Pinokio 架构的 OpenClaw 桌面应用打包方案

## 概述

本文档描述如何将 OpenClaw 项目打包成 Windows .exe 安装程序，预装基础工具集（Node.js、Python、Git、FFmpeg），并提供完整的 GUI 界面。

**用户需求：**
- 使用 Electron + electron-builder 打包
- 预装基础工具集（全部内嵌）
- 完整 GUI 窗口（包装现有 Web UI）
- 手动启动 Gateway 服务

---

## 一、项目架构

### 1.1 目录结构

```
D:\Code\goldieopenclaw\
├── apps/
│   ├── macos/                      # 现有 macOS 应用
│   └── electron/                   # 新增：跨平台 Electron 应用
│       ├── src/
│       │   ├── main.ts             # Electron 主进程入口
│       │   ├── preload.ts         # 预加载脚本（IPC 桥接）
│       │   ├── splash.ts           # 启动画面窗口
│       │   ├── gateway.ts         # Gateway 子进程管理
│       │   ├── browser.ts         # 主浏览器窗口
│       │   ├── tray.ts            # 系统托盘
│       │   ├── menu.ts            # 应用菜单
│       │   └── tools/             # 工具管理模块
│       │       ├── index.ts       # 工具管理器入口
│       │       ├── manager.ts     # 工具安装/PATH 管理
│       │       └── download.ts    # 工具下载逻辑
│       ├── resources/
│       │   ├── icon.ico           # Windows 应用图标
│       │   ├── icon.png          # 通用图标
│       │   ├── icon.icns         # macOS 图标
│       │   └── splash.html        # 启动画面 HTML
│       ├── build/
│       │   ├── installer.nsh      # NSIS 自定义安装脚本
│       │   └── entitlements.mac.plist
│       ├── package.json           # Electron 依赖
│       └── electron-builder.yml   # 打包配置
├── bundled-tools/                  # 预装工具（运行时下载）
│   ├── nodejs/                   # 便携版 Node.js 22
│   ├── python/                   # 便携版 Python 3.12
│   ├── git/                      # 便携版 Git for Windows
│   └── ffmpeg/                   # FFmpeg 静态编译版
├── scripts/
│   └── download-bundled-tools.ts # 下载预装工具脚本
└── docs/
    └── windows-packaging.md      # 本文档
```

### 1.2 技术栈

| 组件 | 技术选择 | 版本 |
|------|---------|------|
| 桌面框架 | Electron | ^33.0.0 |
| 打包工具 | electron-builder | ^25.0.0 |
| GUI 框架 | React + TypeScript | ^18.3.0 |
| 构建工具 | Vite | ^6.0.0 |
| 状态管理 | React Context / Zustand | ^4.5.0 |

---

## 二、核心组件设计

### 2.1 主进程 (main.ts)

**职责：**
1. 应用程序生命周期管理
2. 启动画面显示
3. 检查并初始化预装工具
4. 创建主窗口
5. 启动/管理 Gateway 子进程
6. 系统托盘管理

**启动流程：**

```
┌─────────────────────────────────────────────────────────────┐
│                       main.ts 流程                          │
├─────────────────────────────────────────────────────────────┤
│  1. app.whenReady()                                         │
│         │                                                    │
│         ▼                                                    │
│  2. 显示 Splash 窗口                                         │
│         │                                                    │
│         ▼                                                    │
│  3. 检查工具是否存在                                         │
│         │                                                    │
│         ▼                                                    │
│  4. 如缺失，显示下载进度 → 下载工具                          │
│         │                                                    │
│         ▼                                                    │
│  5. 启动 Gateway 子进程                                     │
│         │                                                    │
│         ▼                                                    │
│  6. 创建主窗口 (BrowserWindow) 加载 http://localhost:18789 │
│         │                                                    │
│         ▼                                                    │
│  7. 初始化系统托盘                                           │
│         │                                                    │
│         ▼                                                    │
│  8. 隐藏 Splash 窗口                                         │
└─────────────────────────────────────────────────────────────┘
```

**关键代码结构：**

```typescript
// apps/electron/src/main.ts (伪代码)

export async function createWindow(): Promise<BrowserWindow> {
  // 创建主窗口
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载 OpenClaw Web UI
  await mainWindow.loadURL('http://localhost:18789');

  return mainWindow;
}

export async function startGateway(): Promise<void> {
  // 使用 bundled Node.js 启动 Gateway
  const nodePath = path.join(resourcesPath, 'tools', 'nodejs', 'node.exe');
  const gatewayProcess = spawn(nodePath, [
    path.join(resourcesPath, 'app', 'dist', 'index.js'),
    'gateway',
    '--bind', '127.0.0.1',
    '--port', '18789'
  ], {
    env: { ...process.env, OPENCLAW_MODE: 'gui' }
  });

  gatewayProcess.stdout.on('data', (data) => {
    console.log('[Gateway]', data.toString());
  });
}
```

### 2.2 预加载脚本 (preload.ts)

**职责：**
- 安全地暴露有限的 API 给渲染进程
- IPC 通信桥接

**暴露的 API：**

```typescript
// apps/electron/src/preload.ts (伪代码)

contextBridge.exposeInMainWorld('electronAPI', {
  // Gateway 控制
  gateway: {
    start: () => ipcRenderer.invoke('gateway:start'),
    stop: () => ipcRenderer.invoke('gateway:stop'),
    status: () => ipcRenderer.invoke('gateway:status'),
    restart: () => ipcRenderer.invoke('gateway:restart'),
    onOutput: (callback: (data: string) => void) => {
      ipcRenderer.on('gateway:output', (_, data) => callback(data));
    },
  },

  // 工具管理
  tools: {
    getStatus: () => ipcRenderer.invoke('tools:status'),
    install: (tool: string) => ipcRenderer.invoke('tools:install', tool),
    getPath: (tool: string) => ipcRenderer.invoke('tools:path', tool),
  },

  // 应用控制
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    quit: () => ipcRenderer.invoke('app:quit'),
    getVersion: () => ipcRenderer.invoke('app:version'),
  },

  // 窗口控制
  window: {
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      ipcRenderer.on('window:maximizeChange', (_, maximized) => callback(maximized));
    },
  },
});
```

### 2.3 Gateway 进程管理 (gateway.ts)

**职责：**
- 启动/停止/重启 Gateway 子进程
- 进程输出捕获与日志
- 崩溃检测与自动重启
- 端口可用性检查

**功能清单：**

| 功能 | 描述 |
|------|------|
| start() | 启动 Gateway 子进程 |
| stop() | 优雅停止 Gateway |
| restart() | 重启 Gateway |
| status() | 返回运行状态 (running/stopped/error) |
| getPort() | 返回 Gateway 端口 |
| onOutput() | 订阅 stdout/stderr 输出事件 |

### 2.4 系统托盘 (tray.ts)

**职责：**
- 常驻系统托盘
- 状态指示（运行中/已停止/错误）
- 快捷菜单

**托盘菜单项：**

```
┌─────────────────────────┐
│ OpenClaw                │
├─────────────────────────┤
│ ● 运行中 / ○ 已停止     │
├─────────────────────────┤
│ 打开 Web UI             │
│ 重新启动 Gateway        │
├─────────────────────────┤
│ 工具管理...             │
│ 设置...                 │
├─────────────────────────┤
│ 退出 OpenClaw           │
└─────────────────────────┘
```

### 2.5 工具管理 (tools/)

**职责：**
- 检查预装工具是否存在
- 工具下载与解压
- PATH 环境变量管理
- 工具版本管理

**工具清单：**

| 工具 | 必需 | 版本 | 大小 | 下载源 |
|------|------|------|------|--------|
| Node.js | 是 | 24.13.1 | ~70MB | nodejs.org/dist |
| Python | 是 | 3.12.12 | ~60MB | python.org/ftp |
| Git | 是 | 2.53.0 | ~60MB | github.com/git-for-windows |
| FFmpeg | 是 | 8.0.1 | ~90MB | gyan.dev/ffmpeg |

**工具安装目录：**

```
%APPDATA%\OpenClaw\
├── tools\                 # 预装工具
│   ├── nodejs\            # node.exe, npm, npx
│   ├── python\           # python.exe, pip
│   ├── git\             # git.exe, bash.exe
│   └── ffmpeg\          # ffmpeg.exe
├── data\                 # 应用数据 (~/.openclaw)
├── logs\                 # 日志文件
└── config.json           # 应用配置
```

---

## 三、打包配置

### 3.1 electron-builder.yml

```yaml
appId: ai.openclaw.desktop
productName: OpenClaw
copyright: Copyright © 2024 OpenClaw

directories:
  output: dist-electron
  buildResources: build

files:
  - "!**/*.{ts,map}"
  - "!**/node_modules/*/{CHANGELOG.md,README.md,readme.md,readme}"
  - "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}"
  - "!**/node_modules/.bin"

extraResources:
  - from: "../../bundled-tools"
    to: "tools"
    filter:
      - "**/*"
  - from: "../../dist"
    to: "app"
    filter:
      - "**/*"

asar: true

asarUnpack:
  - "node_modules/sharp/**/*"
  - "node_modules/better-sqlite3/**/*"
  - "node_modules/@canvas/**/*"
  - "node_modules/playwright-core/**/*"

win:
  target:
    - target: nsis
      arch:
        - x64
  artifactName: OpenClaw-Setup-${version}.${ext}
  icon: resources/icon.ico
  publisherName: OpenClaw

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: OpenClaw
  installerIcon: resources/icon.ico
  uninstallerIcon: resources/icon.ico
  license: ../../LICENSE
  include: build/installer.nsh
  installerHeaderIcon: resources/icon.ico
  installerSidebarBitmap: resources/sidebar.bmp
  installerWelcomeBitmap: resources/welcome.bmp
  uninstallerHeaderIcon: resources/icon.ico

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  artifactName: OpenClaw-${version}-${arch}.${ext}
  icon: resources/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist

dmg:
  title: "OpenClaw ${version}"
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

protocols:
  - name: OpenClaw
    schemes:
      - openclaw
    role: Editor

publish:
  provider: github
  owner: openclaw
  repo: openclaw
  releaseType: release
```

### 3.2 NSIS 自定义脚本 (installer.nsh)

```nsis
; apps/electron/build/installer.nsh

!macro customInstall
  ; 安装后自动启动
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "OpenClaw" "$INSTDIR\OpenClaw.exe"
!macroend

!macro customUnInstall
  ; 卸载时移除自启动
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "OpenClaw"
!macroend
```

---

## 四、Docker 构建

### 4.1 构建环境

使用 `electronuserland/builder` Docker 镜像进行跨平台构建：

```dockerfile
# apps/electron/Dockerfile.build
FROM electronuserland/builder:wine

# 设置工作目录
WORKDIR /project

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY apps/electron/package.json ./apps/electron/

# 安装 pnpm
RUN npm install -g pnpm@10

# 安装项目依赖
RUN pnpm install --frozen-lockfile

# 复制源码
COPY . .

# 构建 OpenClaw CLI
RUN pnpm build

# 进入 Electron 目录
WORKDIR /project/apps/electron

# 安装 Electron 依赖
RUN pnpm install --frozen-lockfile

# 构建 Windows 安装包
RUN pnpm electron-builder --win --x64

# 复制输出文件到共享目录
WORKDIR /project
RUN mkdir -p /output && cp -r apps/electron/dist-electron/* /output/
```

### 4.2 构建命令

```bash
# 本地构建（需要 Docker）
docker build -f apps/electron/Dockerfile.build -t openclaw-electron-builder .
docker run --rm -v "$PWD/output:/output" openclaw-electron-builder

# 输出文件位于 ./output/OpenClaw-Setup-*.exe
```

---

## 五、CI/CD 集成

### 5.1 GitHub Actions 工作流

```yaml
# .github/workflows/electron-build.yml

name: Electron Build

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: windows-latest
            target: win --x64

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build CLI
        run: pnpm build

      - name: Build Electron
        working-directory: apps/electron
        run: |
          pnpm install
          pnpm electron-builder ${{ matrix.target }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: openclaw-electron
          path: apps/electron/dist-electron/*.exe

      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: apps/electron/dist-electron/*.exe
          generate_release_notes: true
```

---

## 六、用户界面

### 6.1 启动画面 (Splash Window)

- 无边框透明窗口
- 显示 OpenClaw Logo
- 进度条显示工具安装状态
- 启动失败时显示错误信息和日志路径

### 6.2 主窗口

- 标准窗口框架（支持原生最小化/最大化/关闭）
- 加载 `http://localhost:18789`
- 支持 DevTools 调试（F12）
- 窗口状态持久化

### 6.3 系统托盘

- 双击打开主窗口
- 右键显示上下文菜单
- 状态指示（图标颜色）

---

## 七、实施步骤

| 阶段 | 任务 | 产出 |
|------|------|------|
| **Phase 1** | 创建 Electron 项目骨架 | `apps/electron/package.json`, `tsconfig.json` |
| **Phase 2** | 实现主进程基础功能 | `apps/electron/src/main.ts` |
| **Phase 3** | 实现 Gateway 进程管理 | `apps/electron/src/gateway.ts` |
| **Phase 4** | 实现浏览器窗口 | `apps/electron/src/browser.ts` |
| **Phase 5** | 实现系统托盘 | `apps/electron/src/tray.ts` |
| **Phase 6** | 实现预加载脚本 | `apps/electron/src/preload.ts` |
| **Phase 7** | 实现工具下载脚本 | `scripts/download-bundled-tools.ts` |
| **Phase 8** | 配置 electron-builder | `apps/electron/electron-builder.yml` |
| **Phase 9** | 创建 Docker 构建文件 | `apps/electron/Dockerfile.build` |
| **Phase 10** | 配置 CI/CD | `.github/workflows/electron-build.yml` |
| **Phase 11** | 测试与调优 | 修复构建/运行问题 |

---

## 八、注意事项

### 8.1 代码签名

Windows 安装包需要代码签名才能通过 SmartScreen：
- 使用 EV 代码证书或 SignPath 服务
- macOS 应用需要 Apple Developer 证书进行公证

### 8.2 性能优化

- 首次启动时后台下载工具
- 使用 WebP 格式的应用图标减小体积
- Electron 禁用硬件加速（在 Linux 上）

### 8.3 兼容性

- 目标操作系统：Windows 10 (1903+), Windows 11
- 架构：仅 x64
- 内存要求：最低 4GB RAM

---

## 九、预估产出

| 项目 | 数值 |
|------|------|
| 安装包大小 | ~400-500 MB |
| 首次运行安装后大小 | ~600-700 MB |
| 启动时间 | 3-5 秒（含工具检查） |
| 内存占用 | ~200-300 MB |

---

## 十、相关文档

- [Pinokio 打包配置参考](file:///D:/Code/pinokio/package.json)
- [electron-builder 文档](https://www.electron.build/)
- [OpenClaw 现有 Docker 配置](./Dockerfile)
- [macOS 打包脚本](./scripts/package-mac-app.sh)
