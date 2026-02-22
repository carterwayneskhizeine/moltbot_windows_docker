# Electron 打包方案 - Pinokio 与 LobsterAI 如何处理 node_modules

## 问题概述

当前使用的 `electron-builder.yml` 复制了**整个** `node_modules` 目录（814MB+），导致：
- 安装包体积过大（压缩后约 283MB，安装后 1GB+）
- 构建时间过长
- `RangeError: Invalid string length` 错误（命令行过长）

## Pinokio 的方案（推荐）

Pinokio 采用**智能 asar 打包策略**，而不是手动复制 node_modules。

### Pinokio 的关键洞察

1. **不要手动复制 node_modules** - 让 electron-builder 处理
2. **使用 asar 压缩** - 自动压缩所有依赖
3. **只解包原生模块** - 使用 `asarUnpack` 处理原生二进制文件

### Pinokio 的配置策略

```json
{
  "build": {
    "asar": true,
    "asarUnpack": [
      // 只解包包含原生二进制文件的模块
      "node_modules/go-get-folder-size/**/*",
      "node_modules/7zip-bin/**/*",
      "node_modules/@homebridge/**/*"
    ]
  }
}
```

**为什么有效：**
- electron-builder 自动将 `node_modules` 打包到 `.asar` 归档中
- 归档会被压缩，大大减小体积
- 原生模块被解包，以便访问操作系统特定的二进制文件
- 无需手动复制

## 当前问题

查看你的 `apps/electron/electron-builder.yml`：

```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
  - from: "../../dist"
    to: "app"
  # ❌ 问题：手动复制整个 node_modules
  - from: "../../node_modules"
    to: "app/node_modules"
    filter:
      - "**/*"

asar: true

asarUnpack:
  - "dist/**/*"
```

### 问题所在

1. 你同时复制了：
   - `apps/electron/node_modules`（通过 electron-builder 默认行为）
   - 根目录的 `node_modules`（通过 extraResources）

2. 根目录的 `node_modules` 包含**所有**依赖（814MB+）：
   - 开发依赖
   - 测试文件
   - 文档
   - 扩展、UI 等的依赖

3. 你的 Gateway 启动的 Node 进程需要访问依赖：

```typescript
// gateway.ts:90
this.process = spawn(nodeExe, [gatewayEntry, 'gateway'], {
  cwd, // ← 需要 node_modules 在 cwd 中
});
```

## 解决方案

### 方案 1：Pinokio 的方法（推荐）⭐

**移除手动复制，让 electron-builder 处理：**

```yaml
# apps/electron/electron-builder.yml

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
  - "dist/**/*"
  - "resources/**/*"

extraResources:
  - from: "../../bundled-tools"
    to: "tools"
    filter:
      - "**/*"
  - from: "../../dist"
    to: "app"
    filter:
      - "**/*"
  # ✅ 移除 node_modules 复制 - electron-builder 会处理

asar: true

# ✅ 只解包原生模块
asarUnpack:
  - "dist/**/*"
  - "node_modules/@lydell/node-pty/**/*"
  - "node_modules/@napi-rs/canvas/**/*"
  - "node_modules/sharp/**/*"
  - "node_modules/sqlite-vec/**/*"
  - "node_modules/playwright-core/**/*"
```

**然后更新 Electron 的 package.json 以包含运行时依赖：**

```json
// apps/electron/package.json

{
  "dependencies": {
    "electron-store": "^10.0.0"
  },
  // ✅ 添加这些运行时依赖
  "optionalDependencies": {
    "@napi-rs/canvas": "^0.1.89",
    "@lydell/node-pty": "1.2.0-beta.3",
    "sharp": "^0.34.5",
    "sqlite-vec": "0.1.7-alpha.2",
    "playwright-core": "1.58.2",
    "tslog": "^4.10.2",
    "express": "^5.2.1"
  }
}
```

**为什么有效：**
- electron-builder 只打包 `apps/electron/package.json` 中列出的依赖
- `.asar` 归档自动压缩所有内容
- 原生模块被解包以便加载操作系统特定的二进制文件
- **体积从 814MB 减少到约 50-100MB**

---

### 方案 2：选择性复制（快速修复）

如果想保持当前架构，只复制 Gateway 实际需要的包：

```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
    filter:
      - "**/*"
  - from: "../../dist"
    to: "app"
    filter:
      - "**/*"
  # ✅ 只复制运行时依赖
  - from: "../../node_modules/tslog"
    to: "app/node_modules/tslog"
  - from: "../../node_modules/express"
    to: "app/node_modules/express"
  - from: "../../node_modules/ws"
    to: "app/node_modules/ws"
  # 只添加 Gateway 实际使用的
```

**查找 Gateway 需要的依赖：**

1. 查看 Gateway 的实际导入：
```bash
# 在根项目
grep -r "import.*from" apps/electron/src/ dist/
```

2. 运行应用并检查错误日志中的缺失模块

**注意：** 这种方法很脆弱——每次 Gateway 依赖变更时都需要手动更新列表。

---

### 方案 3：使用 esbuild/Webpack 打包 Gateway（长期最佳方案）

创建一个包含所有依赖的 Gateway 打包版本：

1. **安装打包工具：**
```bash
pnpm add -D esbuild
```

2. **创建打包脚本** (`scripts/bundle-gateway.ts`)：

```typescript
import * as esbuild from 'esbuild';
import path from 'path';

await esbuild.build({
  entryPoints: [path.join(process.cwd(), 'dist/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: path.join(process.cwd(), 'dist/gateway-bundle.js'),
  external: [
    // 不打包原生模块
    '@napi-rs/canvas',
    'sharp',
    'sqlite-vec',
    '@lydell/node-pty',
    'playwright-core',
  ],
  format: 'esm',
});
```

3. **更新 electron-builder.yml：**
```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
  - from: "../../dist"
    to: "app"
  # ✅ 包含打包后的 gateway
  - from: "../../dist/gateway-bundle.js"
    to: "app/gateway-bundle.js"
  # ✅ 只包含原生模块
  - from: "../../node_modules/@napi-rs/canvas"
    to: "app/node_modules/@napi-rs/canvas"
  - from: "../../node_modules/sharp"
    to: "app/node_modules/sharp"
```

**优势：**
- 体积最小（约 20-30MB）
- 启动更快（无需 node_modules 解析开销）
- 依赖树更清晰

**劣势：**
- 需要构建配置
- 某些边缘情况可能需要特殊处理

---

## 对比表

| 方案 | 体积 | 复杂度 | 维护难度 | 可靠性 |
|----------|------|------------|-------------|-------------|
| 方案 1：Pinokio (asar) | ~50-100MB | 低 | 低 | ⭐⭐⭐⭐⭐ |
| 方案 2：选择性复制 | ~100-200MB | 低 | 高 | ⭐⭐⭐ |
| 方案 3：esbuild 打包 | ~20-30MB | 高 | 低 | ⭐⭐⭐⭐ |
| 当前（全量复制） | ~800MB+ | 低 | 低 | ⭐⭐ |

## 推荐实施步骤

### 步骤 1：更新 apps/electron/electron-builder.yml

移除 node_modules 复制并配置 asarUnpack：

```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
    filter:
      - "**/*"
  - from: "../../dist"
    to: "app"
    filter:
      - "**/*"
  # ✅ 移除这部分：
  # - from: "../../node_modules"
  #   to: "app/node_modules"

asar: true

asarUnpack:
  - "dist/**/*"
  - "node_modules/@lydell/node-pty/**/*"
  - "node_modules/@napi-rs/canvas/**/*"
  - "node_modules/sharp/**/*"
  - "node_modules/sqlite-vec/**/*"
  - "node_modules/playwright-core/**/*"
```

### 步骤 2：更新 apps/electron/package.json

添加运行时依赖：

```json
{
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

### 步骤 3：测试 Gateway 启动

由于 Gateway 从子进程运行，需要访问依赖。更新 spawn 以使用正确的路径：

```typescript
// gateway.ts - 已经正确处理
const cwd = path.join(this.resourcesPath, 'app');
```

### 步骤 4：重新构建并测试

```bash
pnpm electron:dist:win
```

预期结果：
- 构建时间：约 2-5 分钟（从 10+ 分钟下降）
- 安装包体积：约 100-150MB（从 283MB+ 下降）
- 无 `RangeError` 异常

## 故障排除

### 如果 Gateway 报 "Cannot find module X"

1. 检查模块是否在 `apps/electron/node_modules` 中
2. 将其添加到 `apps/electron/package.json` 依赖中
3. 如果是原生模块，添加到 `asarUnpack`

### 如果构建时出现 RangeError

命令行仍然过长。检查：
1. 是否还在复制大目录？
2. 减少 `extraResources` 中的文件数量
3. 使用 `filter` 排除不必要的文件

### 如果原生模块无法加载

将它们添加到 `asarUnpack`：
```yaml
asarUnpack:
  - "node_modules/module-name/**/*"
```

## 总结

✅ **使用方案 1（Pinokio 的方法）** - 最简单且最可靠

✅ **关键变更：**
1. 从 `extraResources` 中移除手动 `node_modules` 复制
2. 将运行时依赖添加到 `apps/electron/package.json`
3. 只为原生模块配置 `asarUnpack`

✅ **预期结果：**
- 体积减少 80-90%
- 构建更快
- 无命令行长度错误
- 易于维护

---

**参考：**
- Pinokio: `D:\Code\pinokio\package.json`（asarUnpack 见第 38-45 行）
- 你的文档: `docs/electron-packaging-node-modules.md`（问题描述）
- electron-builder 文档: https://www.electron.build/configuration/configuration
