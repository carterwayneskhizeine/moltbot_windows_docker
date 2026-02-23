# 03 — Gateway 集成方案与 Control UI 404 根治方案

> 核心目标：解决 Electron 渲染进程中 `http://127.0.0.1:18789/` 无法访问，或者控制面板（Control UI）频繁返回 404 的问题。这些问题曾经在旧方案中反复出现。

---

## 一、为什么旧方案一直 404？

在最初尝试把 OpenClaw 的 TypeScript 源码直接 `import` 进 `apps/openclaw-electron/src` 时，发生了以下连锁反应：

1. **Vite 介入打包**：Vite 试图把 `server.impl.ts` 等所有依赖打包成单文件。
2. **`import.meta.url` 失效**：在 OpenClaw 源码中，用于定位前端静态资源的路径是基于 `import.meta.url` 的：
   ```typescript
   // src/infra/control-ui-assets.ts 第 159 行
   const moduleDir = opts.moduleUrl ? path.dirname(fileURLToPath(opts.moduleUrl)) : null;
   // ...后续利用 moduleDir 计算 "../../dist/control-ui"
   ```
3. **物理目录丢失**：Vite 打包出来的产物在 `dist-electron/`，并没有把前端编译出来的 `dist/control-ui/` 文件夹也一并复制过来。
4. **运行时寻找失败**：当 Express 服务器启动时，找不到用来提供静态资源的 `index.html`，最终 `res.sendFile()` 失败，界面一片空白或者报 404。

## 二、新方案（NPM 依赖模式）的根治机制

借鉴 Pinokio 加载 `pinokiod` 的手法，我们改用 **NPM 包依赖 `openclaw`**。这个方案从根本上绕过了构建工具破坏路径的问题。

### 2.1 依赖结构解析

当你执行 `npm install openclaw` 之后，`node_modules/openclaw` 的结构是原生的、带有完整物理文件的：

```
node_modules/openclaw/
├── package.json
└── dist/
    ├── index.js                     ← 你在 Electron main.ts 里 import 的入口
    ├── gateway/
    │   └── server.js                ← 这里的 import.meta.url 能正确算路径
    └── control-ui/                  ← 前端静态资源
        ├── index.html               ★ Express/vite 渲染入口
        └── assets/
```

### 2.2 NodeJS 原生模块解析如何生效？

在 `electron/main.ts` 中，我们使用原生的运行时导入：

```typescript
// Electron 主进程中 (不再让 Vite 预先打包这段)
const { startGatewayServer } = await import('openclaw');
```

这样带来的好处：
1. **真实路径**：NodeJS 会读取 `node_modules/openclaw/dist/...`。
2. **`import.meta.url` 未被篡改**：指向真正的物理硬盘路径。
3. **`resolveControlUiRootSync` 函数精准命中**：它能完美推算出 `moduleDir/../control-ui` 刚好就是物理层面上存在的 `dist/control-ui`，从而挂载给 Express 的 `express.static`。
4. **根治 404**：当 BrowserWindow 访问 `http://127.0.0.1:18789/` 时，Express 可以正确返回 `dist/control-ui/index.html`。

---

## 三、ESM 与 CJS 的运行时桥接（关键难点）

这是一个隐蔽的坑：**Electron 主进程目前默认是 CJS 环境，而 OpenClaw 最新的打包输出类型是纯 ESM (`"type": "module"`)**。

如果你在 Electron (CJS 代码) 里写：
```javascript
const openclaw = require("openclaw"); 
// 🚨 报错: Error [ERR_REQUIRE_ESM]: require() of ES Module not supported
```

因此，我们必须使用**动态 `import()` 函数**（即便在 CJS 里，动态 import() 也能加载 ESM）：

### 3.1 `main.ts` 中的正确引入方式：

```typescript
// 包装一个异步函数来启动
async function startGateway() {
  console.log('Loading OpenClaw ESM package via dynamic import...');
  let openclawServer;

  try {
    // 【关键】：利用动态 import 加载 node_modules 中的 ESM 包
    const module = await import('openclaw');
    startGatewayServer = module.startGatewayServer;
    
    // 或者如果你知道内部的具体暴露方式:
    // const { startGatewayServer } = await import('openclaw/dist/gateway/server.js');
  } catch (err) {
    console.error('Failed to import openclaw package:', err);
    throw err;
  }

  // 后续正常启动
  gateway = await startGatewayServer(PORT, {
    controlUiEnabled: true,
  });
}
```

### 3.2 控制 `config-guard` 的校验行为

在以前的 `spawn` 方案中，`config-guard.ts` 经常因为找不到 FeiShu/Telegram 插件导致直接退出进程 `exit(1)`。
在把 Gateway 嵌入成为模块函数 (`startGatewayServer`) 后，它不再像 CLI (`argv`) 那样强行执行退出逻辑，而是**抛出 Error Promise**。

这使得 Electron 能轻松捕获报错，防止闪退，并用 UI 提示用户：

```typescript
try {
  await startGatewayServer(PORT, {});
} catch (error) {
  // config-guard 抛出的异常会被 catch 到
  console.error("Gateway 启动检查未通过:", error.message);
  showStartupError(error.message); // 使用 BrowserWindow 弹出红色警告界面
}
```

---

## 四、环境变量隔离与传递

Pinokio 成功的一个核心要素是在主进程中给 Gateway 准备了极度纯净、明确且带有修补的 `process.env`。因为 Electron 的一些内建模块 (比如 `ELECTRON_RUN_AS_NODE`) 会在环境里干扰子进程/子模块的判断。

我们需要做两步：

###步骤 1：修补 PATH（防止 OpenClaw 找不到系统基础命令）
在执行 `startGatewayServer` 前：
```typescript
if (process.platform === 'win32') {
  const pathKey = 'Path' in process.env ? 'Path' : 'PATH';
  const current = process.env[pathKey] || '';
  if (!current.includes('C:\\Windows\\System32')) {
    process.env[pathKey] = [
      'C:\\Windows\\System32',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
      current,
    ].filter(Boolean).join(';');
  }
}
```

###步骤 2：注入特定的 OpenClaw 配置变量
如果你想重定向 OpenClaw 的工作目录，可以借机设置：
```typescript
// 虽然你采用魔改版安装，可能默认读 ~/.openclaw，但如果需要强制重定向：
process.env.OPENCLAW_HOME = path.join(app.getPath('userData'), 'openclaw_data');
```

---

## 五、总结

**一句话总结新方案的集成思路：**
将 OpenClaw 从一个需要 `spawn` 的“外部程序”，变成一个在 Electron 主进程 NodeJS 环境里的“核心库 (Library)”。
- 它运行在同一个 V8 Isolate。
- 直接利用 `await import()` 读取 Node_modules 里的构建物，解决 404 路径问题。
- `gateway = await startGatewayServer(...)` 拿到 HTTP Server 控制权，Electron `before-quit` 时安全触发 `gateway.close()`。
