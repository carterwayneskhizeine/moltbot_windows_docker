# Electron 打包问题 - node_modules 处理

## 问题描述

### 当前情况
- 打包时包含 `node_modules` 导致安装包非常大
- 打包时间极长
- 最终报错：`RangeError: Invalid string length`（命令行参数过长）

### 错误信息
```
RangeError: Invalid string length
    at Array.join (<anonymous>)
    at ChildProcess.exithandler (node:child_process:404:16)
```

这是因为 electron-builder 在处理大量文件时，命令行参数超过了系统限制。

---

## 为什么需要 node_modules？

### 开发环境 vs 生产环境

**开发环境：**
```
D:\Code\goldieopenclaw\
├── node_modules/          # 完整的开发依赖
├── openclaw.mjs           # CLI 入口
└── dist/                  # 编译后的代码
```

**生产环境（打包后）：**
```
C:\Program Files\OpenClaw\
└── resources\
    └── app\
        ├── index.js      # 打包后的代码
        └── node_modules/ # 只有运行时依赖
```

### 为什么不能直接去掉 node_modules？

当前代码在运行时仍然依赖 node_modules：

```typescript
// gateway.ts:89 - spawn 启动子进程
this.process = spawn(nodeExe, [gatewayEntry, 'gateway'], {
  cwd: cwd, // 需要 node_modules 在 cwd 中
});
```

Gateway 进程运行时会 `require('tslog')` 等运行时依赖，这些依赖不在打包后的代码中。

---

## 解决方案

### 方案 1: 使用 webpack 打包（推荐）

将 Gateway 代码和所有依赖打包成单个 bundle 文件，这样就不需要 node_modules。

**优点：**
- 体积小
- 启动快
- 不需要 node_modules

**缺点：**
- 需要配置 webpack
- 可能需要处理一些特殊情况

**实现步骤：**

1. 安装 webpack：
```bash
pnpm add -D webpack webpack-cli webpack-node-externals
```

2. 创建 webpack 配置 `apps/electron/webpack.config.js`：
```javascript
import path from 'path';
import nodeExternals from 'webpack-node-externals';

export default {
  target: 'node',
  mode: 'production',
  entry: './src/gateway-bundle.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'gateway-bundle.js',
  },
  externals: [nodeExternals()], // 不打包 Node.js 内置模块
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
};
```

3. 创建打包入口 `apps/electron/src/gateway-bundle.ts`（导出所有 gateway 相关代码）

4. 修改 `electron-builder.yml`：
```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
  - from: "../../dist"
    to: "app"
  # 不再需要 node_modules

asarUnpack:
  - "dist/**/*"
```

---

### 方案 2: 只打包必要的依赖（临时方案）

不是复制整个 node_modules，而是只复制 Gateway 实际需要的包。

**实现：**

修改 `electron-builder.yml`：
```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
  - from: "../../dist"
    to: "app"
  # 只复制必要的运行时依赖
  - from: "../../node_modules/tslog"
    to: "app/node_modules/tslog"
  - from: "../../node_modules/tslib"
    to: "app/node_modules/tslib"
  # 添加其他运行时依赖...
```

**如何找出运行时依赖？**

1. 运行打包后的 app 并查看错误日志
2. 或使用 `pnpm why <package-name>` 查看依赖关系

---

### 方案 3: 使用 pnpm 的 `hoist` 功能

让 pnpm 将依赖提升到根目录，减少 node_modules 的复杂度。

**修改 `.npmrc`：**
```
shamefully-hoist=true
public-hoist-pattern[]=*
```

然后重新安装依赖：
```bash
rm -rf node_modules
pnpm install
```

---

### 方案 4: 分离 Gateway 进程（架构调整）

将 Gateway 作为独立的 CLI 工具，不打包到 Electron 中。

**结构：**
```
C:\Program Files\OpenClaw\
├── OpenClaw.exe           # Electron GUI
└── tools\
    └── openclaw.exe       # 独立的 Gateway CLI
```

Electron 只负责启动 tools/openclaw.exe，不需要包含 node_modules。

**优点：**
- 最干净的方案
- Gateway 可以独立使用
- 体积最小

**缺点：**
- 需要调整架构
- 安装程序需要复制两个可执行文件

---

## 推荐方案总结

| 方案 | 难度 | 效果 | 推荐度 |
|------|------|------|--------|
| 方案 1: webpack | 高 | 最好 | ⭐⭐⭐⭐⭐ |
| 方案 2: 选择性复制 | 低 | 一般 | ⭐⭐⭐ |
| 方案 3: pnpm hoist | 低 | 一般 | ⭐⭐ |
| 方案 4: 分离进程 | 中 | 最好 | ⭐⭐⭐⭐ |

---

## 快速修复（临时）

如果你只是想快速让打包通过，可以：

1. **移除 node_modules 打包**：
```yaml
extraResources:
  - from: "../../bundled-tools"
    to: "tools"
  - from: "../../dist"
    to: "app"
  # 暂时注释掉 node_modules
  # - from: "../../node_modules"
  #   to: "app/node_modules"
```

2. **让 Gateway 使用系统安装的 OpenClaw CLI**：

```typescript
// gateway.ts - 修改启动逻辑
private findGatewayEntry(): string {
  // 优先使用系统全局安装的 openclaw
  const globalOpenclaw = 'openclaw'; // 系统 PATH 中的命令
  return globalOpenclaw;
}
```

这样用户需要先安装 OpenClaw CLI：
```bash
pnpm install -g .
```

---

## 需要帮助？

如果需要实现以上某个方案，可以：
1. 选择一个方案
2. 我可以帮你实现具体的配置

**建议：** 如果这是长期项目，推荐使用方案 1（webpack）或方案 4（分离进程）。
