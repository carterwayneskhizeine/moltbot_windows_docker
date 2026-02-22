# Electron Gateway 无法启动问题记录

## 问题描述

打包安装 OpenClaw Electron 应用后，Gateway 无法启动，导致应用显示：

```
OpenClaw Gateway Unavailable
Could not connect to the Gateway server.
Please check if the Gateway is running on port 18789.
```

## 环境信息

- **操作系统**: Windows 11
- **Node.js 版本**: v22.12.0
- **Electron 版本**: ^40.6.0
- **electron-builder 版本**: ^25.1.8
- **应用版本**: 2026.2.22
- **安装路径**: `C:\Program Files\OpenClaw`

## 当前配置

### electron-builder.yml

```yaml
appId: ai.openclaw.desktop
productName: OpenClaw

directories:
  output: dist-electron
  buildResources: build

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
  - "dist/**/*"
  - "node_modules/**/*"
```

### apps/electron/package.json

```json
{
  "name": "openclaw-electron",
  "version": "2026.2.22",
  "main": "dist/main.js",
  "dependencies": {
    "electron-store": "^10.0.0"
  },
  "optionalDependencies": {
    "@napi-rs/canvas": "^0.1.89",
    "@lydell/node-pty": "1.2.0-beta.3",
    "sharp": "^0.34.5",
    "sqlite-vec": "0.1.7-alpha.2",
    "playwright-core": "1.58.2",
    "tslog": "^4.10.2",
    "express": "^5.2.1",
    "ws": "^8.19.0",
    "undici": "^7.22.0",
    "tar": "7.5.9"
  }
}
```

### apps/electron/src/gateway.ts (关键部分)

```typescript
// 启动 Gateway 子进程
const appDir = path.join(this.resourcesPath, 'app');
const appUnpackedDir = path.join(this.resourcesPath, 'app.asar.unpacked');
const cwd = fs.existsSync(appDir) ? appDir : this.resourcesPath;

const nodeExe = this.findNodeExecutable();  // 使用 bundled Node.js
const gatewayEntry = this.findGatewayEntry();  // 查找 index.js

this.process = spawn(nodeExe, [gatewayEntry, 'gateway'], {
  env: {
    ...process.env,
    OPENCLAW_MODE: 'gui',
    NODE_ENV: 'production',
    PATH: process.env.PATH,
    NODE_PATH: fs.existsSync(appUnpackedDir)
      ? path.join(appUnpackedDir, 'node_modules')
      : undefined,
  },
  cwd,  // = C:\Program Files\OpenClaw\resources\app
  stdio: ['pipe', 'pipe', 'pipe'],
});
```

## 安装后的目录结构

```
C:\Program Files\OpenClaw\
├── OpenClaw.exe                 # Electron 主程序
└── resources\
    ├── app.asar                  # 主进程代码（压缩）
    ├── app.asar.unpacked\
    │   ├── dist\                 # Electron 源码编译后的文件
    │   │   ├── main.js
    │   │   ├── gateway.js
    │   │   └── ...
    │   └── node_modules\         # ✅ 运行时依赖已解包
    │       ├── express\
    │       ├── tslog\
    │       ├── ws\
    │       ├── undici\
    │       ├── tar\
    │       └── ... (其他依赖)
    ├── app\                     # ✅ Gateway 代码在这里
    │   ├── index.js             # Gateway 入口文件
    │   ├── paths-*.js           # 编译后的 chunk 文件
    │   ├── utils-*.js
    │   └── ... (约 1000+ 个 chunk 文件)
    └── tools\
        ├── nodejs\              # Bundled Node.js 22
        │   └── node.exe
        ├── python\
        └── ffmpeg\
```

## 已尝试的解决方案

### 方案 1: 设置 NODE_PATH 环境变量

在 `gateway.ts` 中设置：

```typescript
NODE_PATH: fs.existsSync(appUnpackedDir)
  ? path.join(appUnpackedDir, 'node_modules')
  : undefined,
```

**结果**: ❌ 不起作用

### 方案 2: 修改 cwd 为 app.asar.unpacked

```typescript
const cwd = fs.existsSync(appUnpackedDir) ? appUnpackedDir : appDir;
```

**结果**: ❌ 不起作用（index.js 的相对导入会失败）

### 方案 3: asarUnpack 所有 node_modules

```yaml
asarUnpack:
  - "dist/**/*"
  - "node_modules/**/*"
```

**结果**: ❌ node_modules 已正确解包，但 Gateway 仍然无法启动

## 调试信息

### 检查端口占用

```powershell
netstat -ano | findstr :18789
```

**输出**: 空（Gateway 未启动）

### 检查文件存在性

- ✅ `C:\Program Files\OpenClaw\resources\app\index.js` 存在
- ✅ `C:\Program Files\OpenClaw\resources\app.asar.unpacked\node_modules\` 存在
- ✅ `C:\Program Files\OpenClaw\resources\tools\nodejs\node.exe` 存在
- ✅ 依赖包（express, tslog, ws 等）都在 node_modules 中

### Gateway 查找逻辑

```typescript
private findGatewayEntry(): string {
  // 1. resourcesPath/openclaw.mjs - ❌ 不存在
  // 2. resourcesPath/dist/index.js - ❌ 不存在
  // 3. resourcesPath/app/index.js - ✅ 存在（应该使用这个）
  // 4. resourcesPath/app/dist/index.js - ❌ 不存在

  const appEntry = path.join(this.resourcesPath, 'app', 'index.js');
  return appEntry;  // 应该返回 "C:\\Program Files\\OpenClaw\\resources\\app\\index.js"
}
```

### 预期的 spawn 命令

```bash
# 应该执行：
"C:\Program Files\OpenClaw\resources\tools\nodejs\node.exe" \
  "C:\Program Files\OpenClaw\resources\app\index.js" \
  gateway

# 环境变量：
# NODE_PATH=C:\Program Files\OpenClaw\resources\app.asar.unpacked\node_modules
# cwd=C:\Program Files\OpenClaw\resources\app
```

## 问题分析

### 根本原因怀疑

1. **NODE_PATH 不生效**: Node.js 可能不支持通过 `NODE_PATH` 环境变量来解析 ES 模块
2. **模块解析路径错误**: `index.js` 的导入是 ESM 格式（`import "./xxx.js"`），Node.js 的模块解析可能找不到依赖
3. **依赖路径问题**: 依赖在 `app.asar.unpacked/node_modules`，但代码在 `app/`，Node.js 无法跨目录查找

### 关键代码

`index.js` 的导入方式：

```javascript
#!/usr/bin/env node
import "./paths-B4BZAPZh.js";
import { B as theme, P as setVerbose } from "./utils-CP9YLh6M.js";
import { Vt as createDefaultDeps } from "./reply-BodBL61X.js";
// ... 更多相对导入
```

这些相对导入能正常工作（文件都在 `app/` 目录），但是当 `index.js` 尝试 `import "express"` 时，Node.js 无法找到 express 模块。

## 可能的解决方案方向

### 方案 A: 在 app 目录创建 node_modules 符号链接

```yaml
extraResources:
  - from: "../../dist"
    to: "app"
    filter:
      - "**/*"
  # 添加符号链接
  - from: "../app.asar.unpacked/node_modules"
    to: "app/node_modules"
```

**问题**: Windows 需要管理员权限创建符号链接

### 方案 B: 复制 node_modules 到 app 目录

```yaml
extraResources:
  - from: "../../dist"
    to: "app"
  - from: "../../app.asar.unpacked/node_modules"
    to: "app/node_modules"
```

**问题**: 会导致重复，增加安装包大小

### 方案 C: 修改 index.js，添加 --experimental-loader

```typescript
this.process = spawn(nodeExe, [
  '--experimental-loader',
  path.join(appUnpackedDir, 'node_modules', 'some-loader'),
  gatewayEntry,
  'gateway'
], { ... });
```

**问题**: 需要找到合适的 loader

### 方案 D: 使用 esbuild 打包 Gateway

将 Gateway 和所有依赖打包成单个 bundle 文件，不依赖外部 node_modules。

**问题**: 需要额外的构建配置

## 测试步骤

1. 手动运行 Gateway 查看错误：

```powershell
cd "C:\Program Files\OpenClaw\resources\app"

$env:NODE_PATH = "C:\Program Files\OpenClaw\resources\app.asar.unpacked\node_modules"

& "C:\Program Files\OpenClaw\resources\tools\nodejs\node.exe" index.js gateway
```

2. 查看 Electron 开发者工具控制台（F12）的 `[Gateway]` 日志

3. 检查 Windows 事件查看器中的应用程序日志

## 相关文件

- [apps/electron/src/gateway.ts](../apps/electron/src/gateway.ts)
- [apps/electron/electron-builder.yml](../apps/electron/electron-builder.yml)
- [apps/electron/package.json](../apps/electron/package.json)

## 参考资料

- Electron asar 打包: https://www.electron.build/configuration/configuration
- Node.js 模块解析: https://nodejs.org/api/modules.html
- NODE_PATH 环境变量: https://nodejs.org/api/cli.html#node_path

## 需要帮助

如果有高手能解决这个问题，请关注以下关键点：

1. **Gateway 代码**在 `resources/app/index.js`
2. **依赖**在 `resources/app.asar.unpacked/node_modules`
3. **Node.js ESM 模块**的解析机制可能不支持 NODE_PATH
4. 可能需要**自定义模块解析**或**重新组织文件结构**
