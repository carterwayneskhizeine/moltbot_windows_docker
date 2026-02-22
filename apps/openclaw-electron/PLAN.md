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

### 3.5 OpenClaw 资源管理

应用将 OpenClaw 预解压到 `bundled/openclaw/` 目录，包含：

- dist 目录中的构建产物
- 入口文件（dist/entry.js）
- node_modules 依赖目录（已清理非必要文件）

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
- 启动前检测端口占用并清理旧进程
- 健康检查失败后自动重启

### 4.4 资源打包

使用 electron-builder 将以下资源打包到 extraResources：

```
extraResources:
  - from: bundled/node/
    to: bundled/node/
    filter: ["**/*"]
  - from: bundled/openclaw/
    to: bundled/openclaw/
    filter: ["**/*"]
```

**优势**：无需运行时解压，启动更快，减少用户等待时间。

## 五、打包与发布

### 5.1 打包配置

使用 electron-builder 进行应用打包，配置参考：

```yaml
appId: com.openclaw.desktop
productName: "OpenClaw"
copyright: MIT License
directories:
  output: dist
  buildResources: assets

files:
  - dist/**/*
  - dist-electron/**/*

extraResources:
  - from: bundled/node/
    to: bundled/node/
    filter: ["**/*"]
  - from: bundled/openclaw/
    to: bundled/openclaw/
    filter: ["**/*"]

win:
  target:
    - target: nsis
      arch: [x64]
  icon: assets/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
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

#### 5.3.2 安装 OpenClaw

支持两种安装策略：

**策略 1：从全局 npm 复制（最快）**
```bash
npm root -g          # 获取全局安装路径
cp -R $GLOBAL/openclaw bundled/openclaw/
```

**策略 2：npm pack + extract + npm install（备用）**
```bash
npm pack openclaw --pack-destination .
tar -xzf openclaw-*.tgz
cd package
npm install --production --ignore-scripts
```

自动清理非必要文件：
- 删除 test/tests/__tests__/.github/example/examples 目录
- 删除 changelog.md/history.md/*.map 文件

## 六、构建与运行

### 6.1 开发模式

开发环境构建和运行：

```bash
cd apps/openclaw-electron
npm install
npm run dev
```

使用 Vite + vite-plugin-electron 热重载开发。

### 6.2 生产打包

完整构建流程：

```bash
npm run build:installer
```

该命令执行以下步骤：

1. `prepare:node` - 下载 Node.js 运行时
2. `prepare:openclaw` - 安装 OpenClaw
3. `vite build` - 编译前端 + Electron 主进程
4. `electron-builder` - 打包安装包

最终安装包位于 `dist/` 目录。

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
├── scripts/                # 构建脚本
│   ├── prepare-node.js
│   ├── prepare-openclaw.js
│   └── build-installer.js
├── bundled/                # 打包资源（运行时生成）
│   ├── node/
│   └── openclaw/
├── dist/                   # 打包输出
├── package.json
├── vite.config.ts
└── electron-builder.yml
```

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

- 端口占用检测
- 进程启动/停止/重启
- 健康检查（HTTP /health）
- 自动重启机制
- 日志输出

### 第五步：实现 Node.js 运行时管理

在 `electron/node-runtime.ts` 实现：

- 智能路径切换（开发/生产）
- 可用性检查
- OpenClaw 路径解析

### 第六步：创建预加载脚本

在 `electron/preload.ts` 实现：

- IPC 桥接
- 安全上下文隔离

### 第七步：准备资源脚本

- `scripts/prepare-node.js` - 下载 Node.js
- `scripts/prepare-openclaw.js` - 安装 OpenClaw
- `scripts/build-installer.js` - 统一构建流程

### 第八步：测试与打包

- 开发模式测试功能
- 运行 `npm run build:installer` 生成安装包
- 验证安装包功能完整性

## 八、关键路径参考

- OpenClaw 控制界面地址：本地 18789 端口的控制页面
- Gateway 默认端口：18789
- Node.js 运行时：`bundled/node/node.exe`（生产）/ `bundled/node/node`（macOS/Linux）
- OpenClaw 目录：`bundled/openclaw/`
- Gateway 健康检查：`http://127.0.0.1:18789/health`

## 九、参考项目

本项目参考了 ClawWin2.0（https://github.com/wk42worldworld/ClawWin2.0）的优秀打包方案：

- 独立 Node.js 运行时打包
- 预解压资源策略
- 智能安装脚本
- Gateway 健康检查与自动重启
- 统一构建流程
