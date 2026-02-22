# OpenClaw Windows 打包指南

> 当前使用方式：生成可直接运行的 win-unpacked 文件夹

## 概述

OpenClaw Windows 桌面应用使用 Electron + electron-builder 打包，输出为一个可直接运行的 `win-unpacked` 文件夹（包含 OpenClaw.exe），用户可以直接运行或将该文件夹打包成 zip 分发。

## 打包方式

### 输出产物

```
apps/electron/dist-electron/win-unpacked/
├── OpenClaw.exe                    # 主程序
└── resources/
    ├── app/                        # OpenClaw CLI 代码 + 依赖
    │   ├── index.js                # Gateway 入口
    │   ├── dist/                   # CLI chunks
    │   └── node_modules/            # CLI 依赖
    ├── app.asar.unpacked/          # Electron 原生模块
    │   └── node_modules/
    └── tools/                       # 预装工具
        ├── nodejs/
        ├── python/
        ├── git/
        └── ffmpeg/
```

### 构建命令

```bash
# 构建并打包（推荐）
pnpm electron:dist:win

# 仅打包，不重新构建（更快）
cd apps/electron && npx electron-builder --win --dir
```

输出目录：`apps/electron/dist-electron/win-unpacked`

### 直接运行

```bash
# 运行打包后的应用
apps/electron/dist-electron/win-unpacked/OpenClaw.exe
```

### 分发方式

将 `win-unpacked` 文件夹打包成 zip，用户解压后直接运行 `OpenClaw.exe`。

## 技术细节

### electron-builder.yml 配置

关键配置说明：

```yaml
# 输出到 win-unpacked 目录
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
  # OpenClaw CLI 代码
  - from: "../../dist"
    to: "app"
  # CLI 依赖
  - from: "../../node_modules"
    to: "app/node_modules"

asar: true
asarUnpack:
  - "dist/**/*"
```

### Gateway 启动方式

Gateway 作为子进程启动，使用系统 Node.js（从 PATH 查找）：

- 入口：`resources/app/index.js`
- 工作目录：`resources/app/`（与 node_modules 同级，Node.js 自动解析模块）

### 为什么不用 NSIS 安装包？

NSIS 安装包构建时间过长（>1 小时），且签名配置复杂。直接分发 `win-unpacked` 文件夹更简单高效。

## 构建环境

- Node.js: 22+
- pnpm: 10+
- electron-builder: ^25.1.8
- electron: ^40.6.0

## 预装工具

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | 22.x | Runtime |
| Python | 3.12 | 插件执行 |
| Git | - | 版本控制 |
| FFmpeg | - | 媒体处理 |

工具位于 `resources/tools/`，应用启动时自动检测可用性。

## 相关文件

- `apps/electron/electron-builder.yml` - 打包配置
- `apps/electron/src/gateway.ts` - Gateway 进程管理
- `apps/electron/src/main.ts` - Electron 主进程
- `docs/electron-gateway-not-starting.md` - Gateway 启动问题排查
