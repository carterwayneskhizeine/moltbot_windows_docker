# 05 — Pinokio 源码与机制：关键位置速查表

> 本文档提炼自 `D:\Code\pinokio\` 和解压出的 `pinokiod-6.0.28.tgz`。作为 OpenClaw Electron 架构改造的绝对对标参考，以后不再需要去翻找 Pinokio 的冗长源码，直接查阅此表。

---

## 一、Electron 外壳 (Frontend / Host) 设计

Pinokio 外壳的主要作用就是：**启动内核（pinokiod），处理 Electron 独有的外围能力（如托盘、窗口状态、开机自启等），最后把一个本地 URL 塞进一个隐藏掉浏览器外框的 `BrowserWindow` 中**。

### 1. 核心流程：`main.js` 与 `full.js`

| 功能 | Pinokio 代码位置 (`full.js`) | 关键实现逻辑 | OpenClaw 借鉴方式 |
|---|---|---|---|
| **入口模块导入** | `main.js` Line 3 | `const Pinokiod = require("pinokiod")`<br>`const pinokiod = new Pinokiod(config)` | 改用**NPM 包引用** `import("openclaw")`，在 `whenReady()` 之前准备好启动器 |
| **单例锁 (防多开)** | Line 2193 | `app.requestSingleInstanceLock()` | **照搬**，确保 Gateway 只运行一份 |
| **开场 Splash (加载画面)** | Line 2310 | 调用 `showSplashWindow()`，没有复杂的框架，就是加载一段 base64 组成的简易 HTML | **照搬**，提升启动体验，遮掩启动延迟 |
| **启动底层 Gateway** | Line 2330 | `await pinokiod.start({ onquit: () => app.quit() })` | 主进程调用网关启动接口：`await startGatewayServer(...)` |
| **处理 Header (CSP 与 Frame)** | Line 1774 | 遍历并 `delete headers['X-Frame-Options']` 允许在 BrowserWindow/Iframe 嵌套网页 | **照搬**，确保 OpenClaw 后续集成插件/UI时不受跨域限制 |
| **正常退出（关闭网关）** | Line 2379 | `app.on('before-quit', (e) => { e.preventDefault(); pinokiod.kernel.kill(); ... app.quit(); })` | 监听 `before-quit`，调用 `gateway.close()` 等待结束再退出 |
| **阻止默认的全部窗口退出** | Line 2392 | 取消默认 `app.quit()`，实现关闭窗口时驻留在系统托盘后台运行 | **照搬**，Windows/Linux 系统常见应用形态 |

---

## 二、底层内核 (`pinokiod` / Gateway) 设计

这是打包好的 NPM (`node_modules/pinokiod/`) 模块的运行机制。这部分的逻辑等同于 OpenClaw 的 `startGatewayServer` 等底层逻辑部分。

### 2. 内部结构与入口：`server/index.js`

| 逻辑环节 | pinokiod (`server/index.js`) 参考行号 | 详细实现与处理手法 |
|---|---|---|
| **Windows PATH 自动修补** | Line 194 - 208 | `pinokiod` 会侦测 `os.platform() === 'win32'`，自动提取 `Path` 或 `PATH`，然后将 `C:\Windows\System32` 以及 PowerShell 路径前置插入到当前 `process.env[PATH_KEY]` 中。<br>👉 *这为了防止某些奇葩系统找不到基础命令导致底层 `exec` 等原生模块崩溃。* |
| **处理未捕获的系统异常** | Line 217 - 263 | `installFatalHandlers()`：截获 `uncaughtException` 和 `unhandledRejection`，记录日志并弹窗。防止 Node 进程无声无息地挂掉。 |
| **寻找静态打包前端 UI** | -- | `pinokiod` 虽然没有显式写，但由于作为 CommonJS NPM 处理，内部相对路径 (`__dirname + '/public'`) 读取完全正常，没有任何前端路由 404 困扰。 |

### 3. PTY / 终端命令下发：`kernel/shell.js` （如果未来需要进程派生）

（由于 OpenClaw 使用了底层脱离 PTY 的方案，如果是要查终端/子进程派生的问题，请重点参考这个节点。Pinokio 自己也是重度使用了后台子进程下发！）

| 机制 | pinokiod (`kernel/shell.js`) 参考 | Pinokio 原理 |
|---|---|---|
| **Pty 的生成器** | Line 587 (`start()`) | 使用 `@homebridge/node-pty-prebuilt-multiarch` 创建无形中端。<br>`let ptyProcess = pty.spawn(this.cmd, this.args, { name: 'xterm-color' ... })` |
| **避免 CMD 窗户弹出** | 原生 `node-pty` 特性 | 在 Windows 上的 `node-pty` / `winpty`，当你在 Electron 的主进程（NodeJS 背景环境）运行 `spawn` 或 `fork` 时，只要没显式开启 `detached: true` 与特殊 `shell: true` 等 flag，是**不会弹出一个黑色 Windows cmd 的**。这是 `node-pty` 比 `child_process.exec` 安全隐秘得多的地方！ |
| **子进程与僵尸进程清理** | `server/index.js` Line 316 | 使用第三方包 `kill-sync`（或类似 `kill-port`、`tree-kill`）：在 `kernel.kill()` 阶段，遍历正在运行的 `PID`，进行树状递归 `SIGKILL` 猎杀。防残留大杀器。 |

---

## 三、电子构建部署 (Builder / NPM) 心智模型

这是你在执行构建与打包时的底层对比：

- **发布为 NPM (*新核心策略*)**：
  OpenClaw 采取与 Pinokio **1:1** 一样的打包哲学。在最初尝试将其与 Vite 一起强行融合编译被反噬后，回退到标准的 Node 模块机制，使得路径处理重新回到健康的发展线。

- **`asarUnpack` 的防线**：
  `D:\Code\pinokio\package.json` 的 `build.asarUnpack`（Line 38-44）指定了 `"node_modules/pinokiod/server/public/**/*"` 不进行打包压缩。
  这对应了新方案的 `node_modules/openclaw/dist/control-ui/**/*` 同样进行 `asarUnpack` 保障其绝对能够被 Express 的 `static()` 读取，从此断绝 404！

- **`node_modules` 物理展开规避 `MAX_PATH` 260 极限**：
  只有少部分的重点静态前端资源被解压，其他依赖都在单个虚的 `app.asar` 中，系统无需深入数百层文件夹探查，变相解决 Windows 一直存在的路径超长报错机制。

---

> 🚀 **总结：** 不要在 Vite 里面和 OpenClaw "打仗"了，它应该作为一个成熟的、自洽的 Node NPM 引擎库，稳稳地挂载在 Electron (作为胶水宿主) 上发挥出该有的实力！
