# OpenClaw Electron 桌面应用项目计划

## 一、项目目标

将 OpenClaw 打造为一个独立的 Electron 桌面应用程序。该应用默认显示 OpenClaw Control UI 界面，具备系统托盘功能，关闭主窗口时最小化到托盘而不是退出应用。

## 二、项目位置

项目代码存放于仓库根目录下的 `apps/openclaw-electron` 文件夹中。

## 三、核心功能

### 3.1 界面展示

应用启动后，主窗口默认加载 OpenClaw Control UI，访问地址为本地 18789 端口的控制界面。用户可以在该界面中完成所有 OpenClaw 提供的操作。

### 3.2 Gateway 管理

应用启动时自动在后台启动 OpenClaw Gateway 进程，该进程负责提供 WebSocket 和 HTTP 服务。Gateway 管理功能包括：

- 端口占用检测与旧进程终止
- 健康检查机制（HTTP 请求验证）
- 自动重启（连续失败后）
- 实时日志输出到 UI
- 支持外部 Gateway 连接

当用户关闭主窗口时，Gateway 进程不会被自动停止，需要在托盘点击退出停止资源才会释放。

### 3.3 系统托盘

应用包含系统托盘功能。当用户点击窗口的关闭按钮时，主窗口会隐藏而不是退出应用，程序继续在后台运行。托盘区域会显示应用图标，用户可以通过以下方式与程序交互：

- 双击托盘图标：显示主窗口
- 右键点击托盘图标：弹出菜单，包含"显示窗口"和"退出"两个选项

选择"退出"选项时，会先停止 Gateway 进程，然后关闭应用。

### 3.4 内置 Node.js 运行时

应用内置独立的 Node.js 24.13.1 运行时，无需依赖系统 Node.js 版本：

- Windows: `bundled/node/node.exe`
- macOS/Linux: `bundled/node/node`
- 开发环境：优先使用 bundled 目录，回退到系统 node

### 3.5 OpenClaw 资源管理（本地源码直接打包）

> **核心理念**：直接将本地仓库构建产物以**目录形式**打包到 `bundled/openclaw/`，不使用压缩包，不从 npm 安装。这样做的目的是保留对源代码的完全控制，方便后续魔改。

应用将 OpenClaw 以**目录形式**直接打包到 `bundled/openclaw/`，参考 ClawWin2.0 的打包策略。目录内容来源于**当前仓库的本地构建产物**，包含：

- `dist/` — 通过 `pnpm build` 生成的构建产物（包含 `entry.js` 入口文件等）
- `node_modules/` — 生产环境依赖（已清理非必要文件）
- `openclaw.mjs` — CLI 入口文件
- `package.json` — 包元信息

**生产环境目录结构**：
```
应用安装目录/resources/
├── bundled/
│   ├── node/
│   │   └── node.exe         # 内置 Node.js 运行时
│   └── openclaw/             # OpenClaw 直接以目录形式存在
│       ├── dist/             # 构建产物
│       │   ├── entry.js
│       │   ├── index.js
│       │   └── ...
│       ├── node_modules/     # 生产依赖
│       ├── openclaw.mjs      # CLI 入口
│       └── package.json
```

**优势**（对比旧的 tar.gz 方案）：
- **无需运行时解压**：不再需要首次启动时的解压流程，启动速度更快
- **无需 `resource-manager.ts`**：消除了整个解压管理模块的复杂性
- **无需 `%APPDATA%` 解压目录**：资源直接随应用安装，路径确定
- **完全基于本地源码**：可随时修改仓库源代码，重新构建即可打包
- **参考 ClawWin2.0 验证过的方案**：已证明此方式在 Windows 上可靠工作

**为全局 `openclaw` 命令提供支持**：需在打包配置（NSIS）中提供一个自定义安装脚本，在应用安装期间将 `bundled/openclaw/` 所在的资源路径追加到用户的系统环境变量 `PATH` 中，并在该目录中创建 `openclaw.cmd` 命令链接。

## 四、技术架构

### 4.1 Electron 主进程

主进程负责以下核心任务：

- 创建和管理应用窗口
- 在后台启动 Gateway 子进程（使用内置 Node.js）
- 监听窗口事件并做出响应
- 管理系统托盘图标和菜单
- 应用退出时清理资源
- Gateway 健康检查与自动重启

### 4.2 BrowserWindow

应用使用单个 BrowserWindow 加载 OpenClaw Control UI。该窗口具备标准的窗口操作功能，包括最小化、最大化、关闭等。窗口的标题栏和尺寸可根据需要配置。

### 4.3 子进程管理

Gateway 进程作为主进程的子进程运行，使用内置 Node.js 运行时启动。管理特性：

- 记录子进程 PID，通过信号优雅关闭
- 超时未响应则强制终止
- 启动前检测端口占用情况。若端口（如 18789）被占用，需安全地验证该占用进程是否是我们以前残留的 `node` Gateway 进程（通过命令行参数特征匹配），确认为内部残留后才执行清理。若为第三方进程占用，则在 UI 提示警告并允许配置新端口，绝不强杀无关进程。
- 健康检查失败后自动重启

### 4.4 资源打包（直接目录方式）

使用 electron-builder 将以下资源打包到 extraResources（参考 ClawWin2.0）：

```yaml
extraResources:
  - from: bundled/node/
    to: bundled/node/
    filter:
      - "**/*"
  - from: bundled/openclaw/
    to: bundled/openclaw/
    filter:
      - "**/*"
```

**与旧方案的对比**：

| 对比项 | 旧方案（tar.gz 压缩） | 新方案（直接目录） |
|--------|----------------------|-------------------|
| 打包内容 | `bundled/openclaw.tar.gz` | `bundled/openclaw/` 目录 |
| 运行时处理 | 需首次启动解压到 `%APPDATA%` | 无需额外处理 |
| 资源路径 | `%APPDATA%/OpenClaw/resources/openclaw/` | `process.resourcesPath/bundled/openclaw/` |
| 额外模块 | 需要 `resource-manager.ts` + `tar` npm 包 | 无需额外模块 |
| 来源 | npm 全局安装或 npm pack | 本地仓库 `pnpm build` 产物 |
| 可维护性 | 修改需重新 npm publish | 直接修改源码重新构建 |

## 五、打包与发布

### 5.1 打包配置

使用 electron-builder 进行应用打包，配置参考 ClawWin2.0：

```yaml
appId: com.openclaw.desktop
productName: "OpenClaw"
copyright: MIT License
directories:
  output: release
  buildResources: assets

files:
  - dist/**/*
  - dist-electron/**/*

extraResources:
  - from: bundled/node/
    to: bundled/node/
    filter:
      - "**/*"
  - from: bundled/openclaw/
    to: bundled/openclaw/
    filter:
      - "**/*"

win:
  target:
    - target: nsis
      arch:
        - x64
  icon: assets/icon.ico
  artifactName: "OpenClaw-Setup-${version}.${ext}"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  installerIcon: assets/icon.ico
  uninstallerIcon: assets/icon.ico
  installerHeaderIcon: assets/icon.ico
  include: installer/installer.nsh  # 自定义 NSIS 脚本，将资源目录写入用户 PATH
  perMachine: false
  deleteAppDataOnUninstall: false
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "OpenClaw"
  runAfterFinish: true
  allowElevation: false
```

### 5.2 支持的平台

应用打包后支持以下平台：

- Windows 系统生成 NSIS 安装包
- macOS 系统生成 DMG 镜像
- Linux 系统生成 AppImage

### 5.3 资源准备流程

#### 5.3.1 下载 Node.js 运行时

自动下载 Node.js 24.13.1 到 `bundled/node/`：

- Windows: `node-v24.13.1-win-x64/node.exe`
- macOS: `node-v24.13.1-darwin-x64/node` 或 `node-v24.13.1-darwin-arm64/node`
- Linux: `node-v24.13.1-linux-x64/node`
- 检查文件完整性（大小验证）
- 已存在则跳过下载

#### 5.3.2 准备 OpenClaw（从本地仓库构建）

> **注意**：不再使用 `npm install -g openclaw@latest`，完全基于当前仓库的本地源代码。

**准备流程**：

1. **构建本地源码**：在仓库根目录执行 `pnpm build`，生成 `dist/` 构建产物
2. **清空目标目录**：清理 `apps/openclaw-electron/bundled/openclaw/`
3. **复制构建产物**：
   ```bash
   # 复制 dist/ 目录（构建产物）
   cp -R ../../dist bundled/openclaw/dist

   # 复制入口文件和元信息
   cp ../../openclaw.mjs bundled/openclaw/
   cp ../../package.json bundled/openclaw/
   ```
4. **安装生产依赖**：
   ```bash
   cd bundled/openclaw
   npm install --production --ignore-scripts
   ```
   > 使用 `npm install` 而非 `pnpm install`，因为生产环境没有 pnpm，且 npm 安装的 `node_modules` 更扁平、兼容性更好。
5. **清理非必要文件**（减小体积）：
   - 删除 `test/tests/__tests__/.github/example/examples` 目录
   - 删除 `changelog.md/history.md/*.map` 文件
6. **验证**：检查 `bundled/openclaw/dist/entry.js` 是否存在

**`scripts/prepare-openclaw.js` 伪代码**：
```javascript
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')  // monorepo 根目录
const TARGET_DIR = path.join(__dirname, '..', 'bundled', 'openclaw')

async function main() {
  // 检查是否已安装且版本正确
  if (existsSync(join(TARGET_DIR, 'dist', 'entry.js'))) {
    console.log('openclaw 已准备就绪，跳过（如需更新请删除 bundled/openclaw/）')
    return
  }

  // Step 1: 在仓库根目录构建
  console.log('正在构建本地 OpenClaw 源码...')
  execSync('pnpm build', { cwd: REPO_ROOT, stdio: 'inherit' })

  // Step 2: 清空并创建目标目录
  rmSync(TARGET_DIR, { recursive: true, force: true })
  mkdirSync(TARGET_DIR, { recursive: true })

  // Step 3: 复制构建产物
  copyDirSync(join(REPO_ROOT, 'dist'), join(TARGET_DIR, 'dist'))
  copyFileSync(join(REPO_ROOT, 'openclaw.mjs'), join(TARGET_DIR, 'openclaw.mjs'))
  copyFileSync(join(REPO_ROOT, 'package.json'), join(TARGET_DIR, 'package.json'))

  // Step 4: 安装生产依赖
  execSync('npm install --production --ignore-scripts', {
    cwd: TARGET_DIR,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  })

  // Step 5: 清理非必要文件
  cleanupDir(join(TARGET_DIR, 'node_modules'))

  // Step 6: 验证
  assert(existsSync(join(TARGET_DIR, 'dist', 'entry.js')))
  console.log('openclaw 准备完成!')
}
```

#### 5.3.3 增量更新机制

应用支持增量更新 OpenClaw 资源，无需重新安装应用：

**更新流程**：
1. 启动时检查更新服务器（可配置 URL）
2. 对比本地版本与服务器版本
3. 如有新版本，下载更新包到操作系统的临时目录
4. **强制向 Gateway 管理器发送停止命令，确保原 Node 进程已完全退出且释放文件句柄（防止 Windows 下报 `EBUSY` 文件被占用错误）**
5. 将更新内容覆盖到 `process.resourcesPath/bundled/openclaw/` 目录
6. **重启 Gateway 进程**
7. 更新版本记录

**更新服务器配置**：
```json
{
  "updateUrl": "https://your-server.com/openclaw/",
  "currentVersion": "2026.1.1"
}
```

**更新检查逻辑**：
- 应用启动时自动检查
- 可在设置中手动检查更新
- 支持静默更新（后台下载）

**版本文件**：
```
process.resourcesPath/bundled/openclaw/package.json 中读取 version 字段
```

**发布更新**：
1. 修改本地 OpenClaw 源码
2. 运行 `pnpm build` 重新构建
3. 运行 `npm run prepare:openclaw` 准备打包资源
4. 运行 `npm run build:installer` 重新打包安装包
5. 上传安装包（或增量更新包 + `version.json`）到服务器

## 六、构建与运行

### 6.1 开发模式

开发环境下（通过判断 `app.isPackaged === false` 识别），Electron 主进程应直接基于本地仓库源码启动 Gateway，以保证极速的热重载和开发体验。

开发环境构建和运行：

```bash
cd apps/openclaw-electron
npm install
npm run dev
```

使用 Vite + vite-plugin-electron 热重载开发。

**开发环境 OpenClaw 路径解析**：
- 优先使用本地 `bundled/openclaw/` 目录
- 回退到仓库根目录（直接使用源码 + `pnpm build` 产物）
- 最后回退到 npm 全局安装目录

### 6.2 生产打包

完整构建流程：

```bash
npm run build:installer
```

该命令执行以下步骤：

1. `prepare:node` - 下载 Node.js 运行时
2. `prepare:openclaw` - 从本地仓库构建并复制 OpenClaw 到 `bundled/openclaw/`
3. `vite build` - 编译前端 + Electron 主进程
4. `electron-builder` - 打包安装包

最终安装包位于 `release/` 目录。

## 七、实施步骤

### 第一步：创建项目结构

```
apps/openclaw-electron/
├── src/                    # 渲染进程源码
├── electron/               # 主进程源码
│   ├── main.ts            # 主进程入口
│   ├── gateway-manager.ts # Gateway 管理
│   ├── node-runtime.ts    # Node.js 路径管理
│   └── preload.ts         # 预加载脚本
├── assets/                 # 图标等资源
├── installer/              # NSIS 自定义安装脚本
│   └── installer.nsh
├── scripts/                # 构建脚本
│   ├── prepare-node.js
│   ├── prepare-openclaw.js
│   └── build-installer.js
├── bundled/                # 打包资源（运行时生成）
│   ├── node/
│   │   └── node.exe
│   └── openclaw/           # OpenClaw 直接以目录形式存在
│       ├── dist/
│       ├── node_modules/
│       ├── openclaw.mjs
│       └── package.json
├── release/                # 打包输出
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

> **注意**：不再需要 `electron/resource-manager.ts`，因为资源以目录形式直接打包，无需运行时解压。

### 第二步：配置文件

- `package.json` - 应用元信息和脚本
- `electron-builder.yml` - 打包配置
- `vite.config.ts` - Vite 构建配置

### 第三步：实现主进程

在 `electron/main.ts` 实现主逻辑：

- GatewayManager 初始化（端口 18789）
- 创建应用窗口（加载 Control UI）
- 启动 Gateway 子进程
- 设置系统托盘
- IPC 通信处理
- 窗口事件处理

### 第四步：实现 Gateway 管理器

在 `electron/gateway-manager.ts` 实现：

- 端口占用检测与**安全校验**（只静默 kill 属于我们自己的僵尸进程进程，防止误杀第三方服务）
- 根据 `app.isPackaged` 智能指向入口文件：
  - **开发时**：指向本地仓库根目录的 `dist/entry.js`
  - **生产时**：指向 `process.resourcesPath/bundled/openclaw/dist/entry.js`
- 进程启动/停止/重启
- 健康检查（HTTP /health）
- 自动重启机制
- 日志输出

### 第五步：实现 Node.js 运行时管理

在 `electron/node-runtime.ts` 实现（参考 ClawWin2.0 的 `node-runtime.ts`）：

```typescript
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

/**
 * 获取内嵌的 Node.js 运行时路径
 */
export function getNodePath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bundled', 'node', 'node.exe')
  }

  // 开发环境：先检查 bundled 目录，再回退到系统 node
  const devBundled = path.join(__dirname, '..', 'bundled', 'node', 'node.exe')
  if (fs.existsSync(devBundled)) {
    return devBundled
  }

  return process.execPath.includes('electron')
    ? 'node'
    : process.execPath
}

/**
 * 获取 openclaw 安装目录路径
 */
export function getOpenclawPath(): string {
  if (app.isPackaged) {
    // 生产环境：直接从 resources 目录读取
    return path.join(process.resourcesPath, 'bundled', 'openclaw')
  }

  // 开发环境：
  // 1. 本地 bundled 目录
  const devBundled = path.join(__dirname, '..', 'bundled', 'openclaw')
  if (fs.existsSync(path.join(devBundled, 'package.json'))) {
    return devBundled
  }

  // 2. 仓库根目录（直接使用源码）
  const repoRoot = path.join(__dirname, '..', '..', '..')
  if (fs.existsSync(path.join(repoRoot, 'dist', 'entry.js'))) {
    return repoRoot
  }

  // 3. 回退到 bundled
  return devBundled
}
```

### 第六步：创建预加载脚本

在 `electron/preload.ts` 实现：

- IPC 桥接
- 安全上下文隔离

### 第七步：准备资源脚本

- `scripts/prepare-node.js` - 下载 Node.js 运行时
- `scripts/prepare-openclaw.js` - 从本地仓库构建 OpenClaw 并复制到 `bundled/openclaw/` 目录
- `scripts/build-installer.js` - 统一构建流程

### 第八步：测试与打包

- 开发模式测试功能
- 运行 `npm run build:installer` 生成安装包
- 验证安装包功能完整性

## 八、关键路径参考

- OpenClaw 控制界面地址：本地 18789 端口的控制页面
- Gateway 默认端口：18789
- Node.js 运行时：`bundled/node/node.exe`（生产）/ `bundled/node/node`（macOS/Linux）
- OpenClaw 目录：`bundled/openclaw/`（development & production 均为目录形式）
- **生产环境资源路径**：`process.resourcesPath/bundled/openclaw/`
- **开发环境资源路径**：`apps/openclaw-electron/bundled/openclaw/` 或仓库根目录
- 命令链接：安装目录 `resources/bundled/openclaw/openclaw.cmd`（Windows，NSIS 创建）
- Gateway 健康检查：`http://127.0.0.1:18789/health`

## 九、参考项目

本项目参考了 ClawWin2.0（https://github.com/wk42worldworld/ClawWin2.0）的优秀打包方案：

- 独立 Node.js 运行时打包
- **直接目录打包策略**（不使用压缩包，避免运行时解压复杂性）
- 智能安装脚本
- Gateway 健康检查与自动重启
- 统一构建流程

### 与 ClawWin2.0 的主要差异

| 对比项 | ClawWin2.0 | 本项目 |
|--------|-----------|--------|
| OpenClaw 来源 | npm 全局安装或 npm pack | **本地仓库源码构建** |
| 打包方式 | 直接目录 ✅ | 直接目录 ✅（已改为一致） |
| 可维护性 | 依赖 npm 发布 | **直接修改源码，灵活度最高** |
| 更新方式 | 重新从 npm 获取 | **本地构建后重新打包** |
