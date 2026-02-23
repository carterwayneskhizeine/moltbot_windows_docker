# Pinokio Gateway 架构深度研究报告
## 从源码（pinokiod v6.0.28）提炼 OpenClaw 的改造思路

> 研究日期：2026-02-23  
> 源码来源：`pinokiod-6.0.28.tgz`（npm registry 直接获取）  
> 目标：找出 Pinokio 如何做到在 Electron 中完全无外部窗口地运行后端服务与终端，为 OpenClaw 提供可落地的改造方案。

---

## 一、核心架构：Pinokio 不是 "在 PTY 里跑服务"

这是最关键、最容易误解的一点。

**OpenClaw 之前的尝试（错误方向）：**
```
Electron 主进程
  └─ PTY（node-pty）
       └─ 用 shell.js 启动 `node entry.js gateway run`
            └─ 等待 gateway 运行，健康检查
```

**Pinokio 的实际做法（正确方向）：**
```
Electron 主进程
  ├─ require('pinokiod')  ← 直接 require！服务在主进程内运行！
  │     └─ new Pinokiod(config)
  │          └─ new Server(config)     ← Express HTTP 服务器
  │               └─ server.listen()  ← 在端口 42000 监听
  │
  └─ PTY（node-pty）
       └─ 只用于"用户交互终端"（User Terminal）
            └─ 里面跑的是 cmd.exe 或 bash
                 └─ 用户手动输入的各种命令
```

**结论：Pinokio 的后端服务本身从来不跑在 PTY 里。**  
PTY 只给用户交互终端用。后端服务直接 `require` 进来，在主进程空间内运行。

---

## 二、Pinokiod 的启动流程（逐行分析）

### 2.1 `full.js`（Electron 主进程入口）
```javascript
// full.js 第5行
const Pinokiod = require("pinokiod")

// 第62行
const pinokiod = new Pinokiod(config)
```
就这两行。整个后端服务实例化，零外部进程生成。

### 2.2 `pinokiod/index.js`
```javascript
module.exports = require('./server')
```

### 2.3 `pinokiod/server/index.js`（核心）
```javascript
// 第43行：默认端口
const DEFAULT_PORT = 42000

class Server {
  constructor(config) {
    this.port = DEFAULT_PORT
    this.kernel = new Kernel(config.store)  // 核心内核
    // ...
    
    // ★ 关键：Windows PATH 注入（防止 cmd/ps 找不到的问题）
    if (platform === 'win32') {
      process.env[PATH_KEY] = [
        "C:\\Windows\\System32",
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0",
        process.env[PATH_KEY]
      ].join(path.delimiter)
    }
  }
}
```

注意：**PATH 注入在 `Server` 的构造函数里，影响的是整个 Node.js 进程（即 Electron 主进程）的全局环境。** 这意味着之后生成的所有子进程都能继承正确的 PATH。

### 2.4 服务启动（`server.listen`）
从源码结构来看，`Server` 类使用 `httpserver`（即 `node:http`）建立服务器，Socket.js 通过 `new WebSocket.Server({ server: this.parent.server })` 挂载 WebSocket。整个过程在同一个 Node.js 进程（Electron 主进程）内完成，无外部进程。

---

## 三、PTY 的实际用途：仅用于用户交互终端

### 3.1 `kernel/shell.js`（PTY 使用位置）
```javascript
// 第13行
const pty = require('@homebridge/node-pty-prebuilt-multiarch')

class Shell {
  constructor(kernel) {
    // Windows 用 cmd.exe，而不是 PowerShell！
    this.shell = this.platform === 'win32' ? 'cmd.exe' : 'bash'
    
    // Windows 参数：/D 禁用 AutoRun Registry Key
    this.args = this.platform === 'win32' ? ["/D"] : ["--noprofile", "--norc"]
  }
  
  // ★ PTY 创建的实际时机：用户请求终端会话时
  prompt(cwd) {
    return new Promise((resolve, reject) => {
      const config = {
        name: 'xterm-color',
        cols: 1000,
        rows: Math.max(this.rows || 24, 24),
        cwd: path.resolve(cwd),
        env: this.env  // ← 使用精心构建的 env，不是原始 process.env
      }
      // ★ 在这里才真正 spawn PTY
      let term = pty.spawn(this.shell, this.args, config)
    })
  }
}
```

**PTY 的用途：**
- ✅ 用户手动开的 User Terminal（Dev 页面里的终端）
- ✅ 执行 JSON 脚本中的 `shell.run` 命令
- ❌ 不用于启动后端服务本身

### 3.2 Windows 下用 `cmd.exe` 而非 PowerShell

这一点很有意思。Pinokio 在 Windows 选择 `cmd.exe + /D` 而不是 `powershell.exe`。原因：
- `cmd.exe` 启动更快，占用更少资源
- PowerShell 在 PTY 内有兼容性问题（括号粘贴模式等）
- `/D` 标志直接禁用注册表 AutoRun，防止用户配置污染环境

---

## 四、环境变量管理（最关键的工程细节）

这是 Pinokio 能稳定运行的核心秘密。

### 4.1 两级环境体系

**Level 1：全局 PATH 修复（Server 构造函数，影响主进程）**
```javascript
// server/index.js 第194-208行
if (platform === 'win32') {
  process.env[PATH_KEY] = [
    "C:\\Windows\\System32",
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0",
    process.env[PATH_KEY]
  ].join(path.delimiter)
}
```

**Level 2：Shell 会话级 env 构建（shell.js `init_env`，影响子 PTY）**
```javascript
// shell.js 第90-253行（精简）
async init_env(params) {
  this.env = Object.assign({}, process.env)
  
  // 1. 清除危险变量（CUDA、SSH、SSL 相关）
  for(let key in this.env) {
    if (key.startsWith("CUDA")) delete this.env[key]
    if (/.*(SSH|SSL).*/.test(key)) delete this.env[key]
  }
  
  // 2. 读取 ENVIRONMENT 文件（用户层配置）
  let system_env = await Environment.get(this.kernel.homedir, this.kernel)
  this.env = Object.assign(this.env, system_env)
  
  // 3. 注入 Pinokio HOME bin 路径（让内置工具优先）
  this.env[PATH_KEY] = this.env[PATH_KEY] + path.delimiter
                     + path.resolve(this.kernel.homedir, 'bin')
  
  // 4. 覆盖用户脚本指定的额外 env
  if (params.env) { /* 合并... */ }
  
  // 5. 清理非法 key（正则过滤，防止注入）
  for(let key in this.env) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)
        && key !== "ProgramFiles(x86)") {
      delete this.env[key]
    }
  }
}
```

**Level 3：ENVIRONMENT 文件（`C:\pinokio\ENVIRONMENT`）**

Pinokio 用一个纯文本的 `ENVIRONMENT` 文件（dotenv 格式）作为持久化环境配置：
```dotenv
HOMEBREW_CACHE=./cache/HOMEBREW_CACHE
HF_HOME=./cache/HF_HOME
TEMP=./cache/TEMP
CONDA_SHORTCUTS=0
```
每次启动 Shell 会话时读取，相对路径会被解析为相对于 `C:\pinokio\` 的绝对路径。

### 4.2 环境变量的优先级

```
低 ←──────────────────────────────────────────────────────────────────→ 高
系统 PATH   ENVIRONMENT 文件   params.env（脚本指定）   PATH_KEY 修复
```

---

## 五、Pinokio 如何做到零外部窗口

### Windows 无窗口的三个层次

| 层次 | Pinokio 做法 | 效果 |
|------|-------------|------|
| 服务进程 | 直接 `require` 进主进程，无子进程 | 完全无窗口 |
| 用户 PTY | `node-pty` spawn `cmd.exe /D`，PTY 天然无窗口 | 无窗口 |
| 辅助命令 | 都在 PTY 内部用 `ptyProcess.write()` 执行 | 无窗口 |

Pinokio **从不** 对服务本身使用 `child_process.spawn/exec`。所有命令执行都通过 PTY 的 `write()` 方法注入。

---

## 六、对 OpenClaw 改造方案的启示

基于以上分析，问题根源和解决路径变得清晰：

### 6.1 为什么之前的方案失败

**失败原因 A：`gateway run` 命中 config-guard 的校验**
- `config-guard.ts` 的白名单只允许 `gateway start/stop/restart` 等管理命令带着无效配置运行
- `gateway run` 是"前台运行"命令，config-guard 要求配置必须有效才放行
- `openclaw.json` 里有 `feishu`、`telegram`、`memory-core` 等打包版本没有的插件 → 校验失败 → `process.exit(1)`

**失败原因 B：`gateway start` 走了 Windows 计划任务路**
- `gateway start` → `runDaemonStart` → `runServiceStart` → Windows schtasks
- 即使放在 PTY 里，命令执行完就退出了（它的职责是注册任务，不是持续运行）

### 6.2 Pinokio 方案的核心思路（OpenClaw 可借鉴）

**方案 A：最彻底 - 直接 require（像 Pinokio 一样）**

把 OpenClaw 的 Gateway 作为一个可以被 `require` 的模块集成进 Electron 主进程：

```typescript
// electron/main.ts
import { startGatewayServer } from '../../../src/gateway/server'  // 直接导入

// 在主进程内直接启动，无子进程
const gateway = await startGatewayServer(port, { ... })
```

**优点：** 零子进程，零窗口风险，调试最容易  
**难点：** 需要 OpenClaw 源码提供可编程的服务启动 API（而不仅仅是 CLI 入口）

**方案 B：折中 - 修改 config-guard 白名单（最小改动）**

在 `src/cli/program/config-guard.ts` 中把 `"run"` 加入 `ALLOWED_INVALID_GATEWAY_SUBCOMMANDS`：

```typescript
// config-guard.ts 第10行
const ALLOWED_INVALID_GATEWAY_SUBCOMMANDS = new Set([
  "status", "probe", "health", "discover", "call",
  "install", "uninstall", "start", "stop", "restart",
  "run",  // ← 加入这一行
]);
```

**优点：** 改动极小，立即生效  
**风险：** 需要修改上游源码；`gateway run` 在配置无效时不再报错退出（但能启动）

**方案 C：环境变量欺骗 - 注入 `OPENCLAW_SKIP_VALIDATION=1`**

如果存在类似 `OPENCLAW_SKIP_CHANNELS` 的跳过机制，就在 `GatewayManager` 里的 `env` 里注入。但当前代码里这个机制只能跳过"频道加载"，不能跳过"配置文件有效性检查"（config-guard 在启动任何命令之前就运行）。

**方案 D：先修复配置再启动（短期实用方案）**

1. Electron 启动时，先静默运行 `openclaw doctor --fix`
2. doctor 命令在白名单里，可以带着无效配置运行
3. `--fix` 会自动清理掉 openclaw.json 里引用的不存在插件（feishu/telegram 等）
4. 然后再启动 `gateway run`

**注意：** 此方案已经被用户撤销，因为实测发现还有其他问题。

---

## 七、推荐的最终方案

综合评估，**方案 B + 环境变量注入** 是最实际可行的路径：

### 第一步：修改 config-guard（上游源码）

```typescript
// src/cli/program/config-guard.ts
const ALLOWED_INVALID_GATEWAY_SUBCOMMANDS = new Set([
  "status", "probe", "health", "discover", "call",
  "install", "uninstall", "start", "stop", "restart",
  "run",   // ← 新增
]);
```

### 第二步：GatewayManager 继续使用 `gateway run`，保持 PTY 内运行

```typescript
// gateway-manager.ts
this.process = ptyManager.spawnCommand(
  'gateway',
  this.opts.nodePath,
  [
    '--disable-warning=ExperimentalWarning',
    entryScript,
    'gateway', 'run',
    '--port', String(this.opts.port),
  ],
  this.opts.openclawPath,
  env  // 包含 OPENCLAW_SKIP_CHANNELS=1 等
)
```

### 第三步：在 GatewayManager 的 env 里加入 Windows System32 兜底（学 Pinokio）

```typescript
// electron/env-utils.ts
export function buildSafeEnvironment(env: Record<string, string>) {
  if (process.platform === 'win32') {
    const pathKey = 'Path' in env ? 'Path' : 'PATH'
    env[pathKey] = [
      'C:\\Windows\\System32',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
      env[pathKey] || '',
    ].filter(Boolean).join(';')
  }
  return env
}
```

---

## 八、关键源码位置速查

| 功能 | 文件 | 行号 |
|------|------|------|
| Pinokio 服务初始化 | `pinokio/full.js` | 5, 62 |
| HTTP 服务器 + 默认端口 | `pinokiod/server/index.js` | 43, 130-216 |
| Windows PATH 注入 | `pinokiod/server/index.js` | 194-208 |
| PTY 使用（shell.js） | `pinokiod/kernel/shell.js` | 13, 617 |
| 环境初始化 | `pinokiod/kernel/shell.js` | 90-253 |
| 环境变量文件读取 | `pinokiod/kernel/environment.js` | 404-420 |
| OpenClaw config-guard | `src/cli/program/config-guard.ts` | 10-21 |
| OpenClaw preaction hook | `src/cli/program/preaction.ts` | 74-75 |
