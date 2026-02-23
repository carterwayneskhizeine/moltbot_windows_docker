import { ChildProcess, spawn, execSync } from 'node:child_process'
import net from 'node:net'
import http from 'node:http'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

export interface GatewayManagerOptions {
  nodePath: string
  openclawPath: string
  port: number
  onStateChange: (state: GatewayState) => void
  onLog: (level: 'info' | 'warn' | 'error', message: string) => void
}

export class GatewayManager {
  private process: ChildProcess | null = null
  private state: GatewayState = 'stopped'
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private consecutiveFailures = 0
  private readonly MAX_FAILURES = 5
  private readonly HEALTH_CHECK_INTERVAL = 5000
  private readonly SHUTDOWN_TIMEOUT = 5000
  private stopping = false
  private externalGateway = false

  constructor(private opts: GatewayManagerOptions) {}

  getStatus() {
    return { state: this.state, port: this.opts.port }
  }

  getPort() {
    return this.opts.port
  }

  async start(): Promise<void> {
    if (this.state === 'ready' || this.state === 'starting') return

    this.stopping = false
    this.setState('starting')

    // 检测端口是否已被真实的 Gateway 占用
    const portInUse = await this.isPortInUse(this.opts.port)
    if (portInUse) {
      this.log('info', `检测到端口 ${this.opts.port} 已有 Gateway 在运行，直接连接`)
      this.externalGateway = true
      this.setState('ready')
      this.startHealthCheck()
      return
    }

    // 检测端口是否被其他进程占用（非 Gateway）
    const portOccupied = await this.isTcpPortOccupied(this.opts.port)
    if (portOccupied) {
      this.log('warn', `端口 ${this.opts.port} 被第三方进程占用，尝试终止僵尸 Gateway 进程`)
      // 只尝试 kill 明确是我们之前的 node 进程
      await this.killOurGatewayZombies(this.opts.port)
      await new Promise(resolve => setTimeout(resolve, 1500))
      const stillOccupied = await this.isTcpPortOccupied(this.opts.port)
      if (stillOccupied) {
        this.log('error', `端口 ${this.opts.port} 仍被占用，无法启动 Gateway`)
        this.setState('error')
        return
      }
    }

    this.externalGateway = false
    this.log('info', `启动 Gateway (端口: ${this.opts.port})...`)

    try {
      await this.spawnGateway()
      this.startHealthCheck()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.log('error', `Gateway 启动失败: ${message}`)
      this.setState('error')
    }
  }

  async stop(): Promise<void> {
    this.stopping = true
    this.stopHealthCheck()

    if (this.externalGateway) {
      this.externalGateway = false
      this.setState('stopped')
      return
    }

    if (!this.process) {
      this.setState('stopped')
      return
    }

    this.log('info', '正在关闭 Gateway...')

    return new Promise<void>((resolve) => {
      const proc = this.process
      if (!proc) {
        this.setState('stopped')
        resolve()
        return
      }

      const pid = proc.pid

      const forceKillTimer = setTimeout(() => {
        this.log('warn', 'Gateway 未在超时内退出，强制终止进程树')
        this.killProcessTree(pid)
      }, this.SHUTDOWN_TIMEOUT)

      proc.once('exit', () => {
        clearTimeout(forceKillTimer)
        this.process = null
        this.setState('stopped')
        this.log('info', 'Gateway 已关闭')
        resolve()
      })

      try {
        // Windows: 用 taskkill /T 递归杀死整个进程树（包括子进程）
        this.killProcessTree(pid)
      } catch {
        clearTimeout(forceKillTimer)
        this.process = null
        this.setState('stopped')
        resolve()
      }
    })
  }

  /**
   * 递归杀死整个进程树，Windows 上使用 taskkill /T /F
   */
  private killProcessTree(pid: number | undefined) {
    if (!pid) return
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /T /F /PID ${pid}`, { timeout: 5000 })
      } else {
        process.kill(-pid, 'SIGKILL')
      }
    } catch { /* 进程可能已退出 */ }
  }

  async restart(): Promise<void> {
    this.setState('restarting')
    this.log('info', '正在重启 Gateway...')
    await this.stop()
    await this.start()
  }

  private setState(state: GatewayState) {
    this.state = state
    this.opts.onStateChange(state)
  }

  private log(level: 'info' | 'warn' | 'error', message: string) {
    this.opts.onLog(level, message)
  }

  /**
   * 检测端口是否有真实的 Gateway 在运行（TCP + HTTP /health 验证）
   */
  private isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(2000)
      socket.once('connect', () => {
        socket.destroy()
        // TCP 通了，再验证是否是 Gateway
        this.isRealGateway(port).then(resolve)
      })
      socket.once('timeout', () => { socket.destroy(); resolve(false) })
      socket.once('error', () => { socket.destroy(); resolve(false) })
      socket.connect(port, '127.0.0.1')
    })
  }

  /**
   * 仅检测 TCP 端口是否被占用（任何进程）
   */
  private isTcpPortOccupied(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      socket.setTimeout(1000)
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('timeout', () => { socket.destroy(); resolve(false) })
      socket.once('error', () => { socket.destroy(); resolve(false) })
      socket.connect(port, '127.0.0.1')
    })
  }

  /**
   * HTTP /health 验证端口是否为 Gateway
   */
  private isRealGateway(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 3000 }, (res) => {
        res.resume()
        resolve(res.statusCode === 200)
      })
      req.on('timeout', () => { req.destroy(); resolve(false) })
      req.on('error', () => resolve(false))
    })
  }

  /**
   * 读取 gateway token（用于认证）
   */
  private readGatewayToken(): string | null {
    try {
      const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        return config?.gateway?.auth?.token ?? null
      }
    } catch { /* ignore */ }
    return null
  }

  private async spawnGateway(): Promise<void> {
    const entryScript = this.findEntryScript()
    const token = this.readGatewayToken()

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      NODE_ENV: 'production',
      OPENCLAW_NO_RESPAWN: '1',
      OPENCLAW_NODE_OPTIONS_READY: '1',
      OPENCLAW_GATEWAY_PORT: String(this.opts.port),
      OPENCLAW_HOME: os.homedir(),
      // 跳过频道加载，避免因缺少频道插件导致配置校验失败
      OPENCLAW_SKIP_CHANNELS: '1',
    }

    if (token) env.OPENCLAW_GATEWAY_TOKEN = token

    this.log('info', `node: ${this.opts.nodePath}`)
    this.log('info', `entry: ${entryScript}`)
    this.log('info', `cwd: ${this.opts.openclawPath}`)

    // 注意：使用 'gateway start' 而非 'gateway'
    // 因为 config-guard 中 'start' 在 ALLOWED_INVALID_GATEWAY_SUBCOMMANDS 白名单中，
    // 允许在配置无效时继续启动（不会 exit(1)）
    this.process = spawn(
      this.opts.nodePath,
      [
        '--disable-warning=ExperimentalWarning',
        entryScript,
        'gateway', 'start',
        '--port', String(this.opts.port),
      ],
      {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: this.opts.openclawPath,
        windowsHide: true,
        // 不要设为 detached，保证进程是我们的子进程，方便 taskkill /T 递归杀死
        detached: false,
      },
    )

    this.process.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n').filter(Boolean)) {
        this.log('info', line)
      }
    })

    this.process.stderr?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n').filter(Boolean)) {
        this.log('warn', line)
      }
    })

    this.process.on('exit', (code, signal) => {
      if (!this.stopping) {
        this.log('warn', `Gateway 进程退出 (code: ${code}, signal: ${signal})`)
        this.setState('error')
      }
      this.process = null
    })

    this.process.on('error', (err) => {
      this.log('error', `Gateway 进程错误: ${err.message}`)
      this.setState('error')
      this.process = null
    })
  }

  private findEntryScript(): string {
    const candidates = [
      path.join(this.opts.openclawPath, 'dist', 'entry.js'),
      path.join(this.opts.openclawPath, 'dist', 'entry.mjs'),
      path.join(this.opts.openclawPath, 'openclaw.mjs'),
    ]

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate
    }

    this.log('error', `未找到 openclaw 入口文件，搜索路径: ${candidates.join(', ')}`)
    throw new Error(`openclaw 未安装或入口文件缺失: ${this.opts.openclawPath}`)
  }

  private startHealthCheck() {
    this.consecutiveFailures = 0
    this.stopHealthCheck()

    const initialDelay = this.externalGateway ? 500 : 5000
    setTimeout(() => {
      this.performHealthCheck()
      this.healthCheckTimer = setInterval(() => {
        this.performHealthCheck()
      }, this.HEALTH_CHECK_INTERVAL)
    }, initialDelay)
  }

  private stopHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  private performHealthCheck() {
    if (this.stopping) return

    const req = http.get(`http://127.0.0.1:${this.opts.port}/health`, { timeout: 3000 }, (res) => {
      res.resume()
      if (res.statusCode === 200) {
        this.consecutiveFailures = 0
        if (this.state !== 'ready') {
          this.setState('ready')
          this.log('info', 'Gateway 已就绪')
        }
      } else {
        this.onHealthCheckFailed(`HTTP ${res.statusCode}`)
      }
    })

    req.on('timeout', () => { req.destroy(); this.onHealthCheckFailed('超时') })
    req.on('error', (err) => this.onHealthCheckFailed(err.message))
  }

  private onHealthCheckFailed(reason: string) {
    this.consecutiveFailures++

    if (this.consecutiveFailures <= 2 || this.consecutiveFailures % 5 === 0) {
      this.log('warn', `健康检查失败 (${this.consecutiveFailures}/${this.MAX_FAILURES}): ${reason}`)
    }

    if (this.consecutiveFailures >= this.MAX_FAILURES && !this.stopping) {
      if (this.externalGateway) {
        this.log('error', '外部 Gateway 不可达')
        this.setState('error')
      } else {
        this.log('error', '连续健康检查失败，自动重启 Gateway...')
        this.restart()
      }
    }
  }

  /**
   * 仅终止我们自己的僵尸 Gateway 进程（通过命令行特征识别）
   * 绝不强杀第三方进程
   */
  private async killOurGatewayZombies(port: number): Promise<void> {
    try {
      if (process.platform === 'win32') {
        const output = execSync(
          `netstat -ano | findstr "LISTENING" | findstr ":${port}"`,
          { encoding: 'utf-8', timeout: 5000 },
        )
        const pids = new Set<string>()
        for (const line of output.split('\n')) {
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
        }

        for (const pid of pids) {
          try {
            // 验证是否是我们的 node gateway 进程
            const cmdOutput = execSync(
              `wmic process where processId=${pid} get CommandLine /value`,
              { encoding: 'utf-8', timeout: 3000 },
            )
            // 只 kill 包含 openclaw gateway 特征的进程
            if (cmdOutput.includes('openclaw') || cmdOutput.includes('entry.js')) {
              execSync(`taskkill /PID ${pid} /F`, { timeout: 5000 })
              this.log('info', `已终止僵尸 Gateway 进程 (PID: ${pid})`)
            } else {
              this.log('warn', `跳过第三方进程 (PID: ${pid})`)
            }
          } catch { /* 进程已退出或无权限 */ }
        }
      } else {
        const output = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', timeout: 5000 })
        for (const pid of output.trim().split('\n').filter(Boolean)) {
          try {
            const cmdOutput = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf-8', timeout: 3000 })
            if (cmdOutput.includes('openclaw') || cmdOutput.includes('entry')) {
              process.kill(Number(pid), 'SIGTERM')
              this.log('info', `已终止僵尸 Gateway 进程 (PID: ${pid})`)
            }
          } catch { /* ignore */ }
        }
      }
    } catch { /* ignore */ }
  }
}
