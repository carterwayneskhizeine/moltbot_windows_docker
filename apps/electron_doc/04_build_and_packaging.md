# 04 — Electron 构建与打包配置方案 (基于 NPM 包策略)

> 本文档详细说明如何使用 `electron-builder` 和 `vite`，配合 `asarUnpack` 将 OpenClaw 作为纯 NPM 依赖正确打包。对标 Pinokio 的 `D:\Code\pinokio\package.json`

---

## 一、Electron 开发环境的 `package.json` 依赖

由于 `openclaw` 虽然是你自己的魔改包，但它是用 `npm install -g openclaw@latest` 或者在项目里 `npm install openclaw@latest` 来安装的，所以你的 Electron App 内部的 `package.json` 应该声明它。

这样做，Electron-builder 构建时就会**自动把 `node_modules/openclaw` 拷贝进产物当中去（默认进 `app.asar` 内）**。

```jsonc
// apps/openclaw-electron/package.json
{
  "name": "openclaw-desktop",
  "version": "1.0.0",
  "description": "Desktop gateway for OpenClaw.",
  "main": "dist-electron/main.js",    // Vite 编译后的主进程出口
  "author": "GoldieOpenClaw",
  "dependencies": {
    "electron-window-state": "^5.0.3",
    "openclaw": "^2026.2.x"           // ★ 必须放在生产环境依赖！(Dependencies)
  },
  "devDependencies": {
    "vite": "^6.x.x",
    "electron": "^39.x.x",
    "electron-builder": "^26.x.x",
    "vite-plugin-electron": "^0.30.0",
    "vite-plugin-electron-renderer": "^0.14.6"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "pack": "electron-builder --dir"
  }
}
```

> **注意！绝不能将 `openclaw` 置于 `devDependencies`**
> Electron-builder 默认只选取 `dependencies` 下面的内容进行真实物理打包（装入 `app.asar` 或展开），放置在 `devDependencies` 在最终 build 里会不翼而飞。

---

## 二、`vite.config.ts` 的 Vite 打包拦截

在 Electron 应用中，主进程的 Typescript (如 `main.ts` ) 是由 Vite 和 `vite-plugin-electron` 编译的。

**最核心的难题：怎么让 Vite 闭嘴？**
如果不作设置，Vite 当看到你写 `await import('openclaw')` 时，它会去 `node_modules/openclaw/dist/index.js` 里扫描，把网关引擎全网罗过来压成一个单文件。（这会导致路径断裂甚至崩溃）。

### 2.1 设置 `external` 排除

必须强制将 `openclaw`（包括某些 Node 原生模块依赖，如 `sharp`、`node-pty`等）列为**外部依赖 (External)**。这样，Vite 把这段代码发给 Node 时只是一行原生的 `import("openclaw")`，而**不会去深层打包 openclaw 里面的源码**。

```typescript
// apps/openclaw-electron/vite.config.ts
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig({
  plugins: [
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              // ★ 核心指令：这三个包及其关联的依赖，全都给我留着不要打包！
              external: [
                'openclaw',
                'electron-window-state',
                'electron-store'
              ]
            }
          }
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {}, // 渲染进程页面，如果有的话。或者留空表示纯后端服务容器。
    }),
  ],
});
```

---

## 三、`electron-builder.yml` 中的物理展开 (asarUnpack)

这是我们**最后一道防线：解决前端 SPA 的路径与 404 问题**。

当 `electron-builder` 生成最终的 Windows `*.exe` 安装包时，它默认会把你所有的代码、包括 `node_modules` 压制进一个虚拟的加密文件叫做 `resources/app.asar` 中。

**但是**：Express 的 `express.static()` 以及 OpenClaw 后端对 `dist/control-ui/` 的查找算法（`resolveControlUiRootSync` 函数，依赖 `fs.existsSync`）很多时候**无法穿透 `.asar` 文件去找到那些静态 HTML/JS 文件**。一旦在 asar 内部寻找静态资源或子进程执行就会报 404 或 `spawn ENOENT` 错误。

### 3.1 引入 `asarUnpack`

借鉴了 `pinokio`，当有大量静态前端资源或者特殊二进制库时，必须将它们从 `.asar` 中**解压出来 (Unpack)**。解压出来后，它们会安全地躺在 `resources/app.asar.unpacked/node_modules/openclaw/...`，NodeJS 仍能无缝 require 到它。

```yaml
# apps/openclaw-electron/electron-builder.yml
appId: com.openclaw.desktop
productName: "OpenClaw"
directories:
  output: release/${version}

# 必须把生产环境源码包括在内
files:
  - dist/**/*
  - dist-electron/**/*
  - package.json

# ★ 模仿 Pinokio 的 asarUnpack
asarUnpack:
  # 把 OpenClaw 控制面板的静态资源释放到真实物理磁盘
  - "node_modules/openclaw/dist/control-ui/**/*"
  
  # （如果有其他使用跨语言编译、或者 C++ Addons 比如 SQLite/Sharp 的模块，也必须 Unpack）
  - "node_modules/sqlite-vec/**/*"
  - "node_modules/sharp/**/*"
  - "node_modules/@lydell/node-pty/**/*"

# Mac配置
mac:
  target: dmg
  icon: build/icon.icns

# Windows配置
win:
  target:
    - target: nsis
      arch: [x64, ia32]
  icon: build/icon.ico

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```

### 3.2 针对路径长度过长 (`MAX_PATH` 260 字符) 解决办法

你曾经提问过 Windows 下的 `系统找不到指定路径 (Path too long)`。

当 `npm install openclaw` 带来深层 `node_modules` 时，经常超过 Windows 的 260 字符长度。因为采用了 `NPM 依赖形式` 加 `electron-builder`：
- `electron-builder` 在压制 `.asar` 时，它其实会在内存或一个较短的临时目录做压制。只要你把大部分 `node_modules` 变成单体 `app.asar`，客户端电脑上就不会有一堆碎纸屑般的深长目录。
- 只要 `asarUnpack` 指定了少量的、必要的 `dist/control-ui`。这个层级也仅仅是 `resources/app.asar.unpacked/node_modules/openclaw/dist/control-ui/index.html`，它的绝对长远远低于 260 字符（最多 150～180）。

此项配置，同时能**天然消灭打包过程中的 MAX_PATH 报错**！

---

## 四、最后确定的构建工作流总结：

当你打算发一版 `openclaw-electron` EXE：

**Step 1:** 更新本地依赖。让 `openclaw-electron` 吃到你最新发版或者 link 的 openclaw NPM 核心：
```bash
cd apps/openclaw-electron
npm install openclaw@latest
```

**Step 2:** 开始 Vite 将你的 `main.ts` (主进程的胶水层，负责启动和展现系统托盘) 变更为 CommonJS:
```bash
npm run build
# 执行: vite build && electron-builder
```
> 这个过程中，Vite 会发现 `import("openclaw")` 被设为了 `external`。Vite 什么都不会做，它直接原封不动的把这段文字印入 `dist-electron/main.js`

**Step 3:** Electron-Builder 开始工作。它会收集你的 `package.json`，把下面列入 `dependencies` 的 `node_modules/openclaw` 原样拷进 `app.asar`。

**Step 4:** Electron-Builder 读取 `asarUnpack` 指令和规则。它会打开剪刀，将 `app.asar` 内的 `node_modules/openclaw/dist/control-ui` 抠出来，单独放在外面 (`app.asar.unpacked/`)。

**Step 5:** 交付产物 `release/1.0.0/OpenClaw Setup 1.0.0.exe`。用户的电脑运行后，没有任何 Command 黑窗，一切都在主进程静默拉起，并在底层完美的吐出控制面板！
