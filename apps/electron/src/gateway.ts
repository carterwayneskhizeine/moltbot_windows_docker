/**
 * OpenClaw Electron - Gateway Process Manager
 *
 * Manages the OpenClaw Gateway subprocess.
 * Handles starting, stopping, and monitoring the Gateway.
 */

import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Gateway configuration
const GATEWAY_PORT = 18789;
const GATEWAY_HOST = '127.0.0.1';

// Debug log file
const debugLogPath = path.join(os.homedir(), '.openclaw', 'gateway-spawn-debug.log');
function debugLog(...args: unknown[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => String(a)).join(' ')}\n`;
  try {
    fs.appendFileSync(debugLogPath, msg);
  } catch {}
  console.log(...args);
}

export interface GatewayOptions {
  port?: number;
  host?: string;
  env?: Record<string, string>;
}

export type GatewayStatus = 'stopped' | 'starting' | 'running' | 'error';

export interface GatewayProcessHandle {
  /** Promise that resolves when Gateway is ready */
  isReady(): Promise<boolean>;
  /** Stop the Gateway */
  stop(): void;
  /** Get current status */
  getStatus(): GatewayStatus;
  /** Restart the Gateway */
  restart(): void;
  /** Subscribe to output logs */
  onOutput(callback: (data: string) => void): void;
}

class GatewayManager implements GatewayProcessHandle {
  private process: ChildProcess | null = null;
  private status: GatewayStatus = 'stopped';
  private readyPromise: Promise<boolean> | null = null;
  private outputCallbacks: Array<(data: string) => void> = [];
  private resourcesPath: string;
  private options: GatewayOptions;
  private restartAttempts = 0;
  private maxRestartAttempts = 5;
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(resourcesPath: string, options: GatewayOptions = {}) {
    this.resourcesPath = resourcesPath;
    this.options = {
      port: options.port ?? GATEWAY_PORT,
      host: options.host ?? GATEWAY_HOST,
      env: options.env ?? {},
    };
  }

  /**
   * Start the Gateway process
   */
  start(): void {
    if (this.process) {
      console.warn('[Gateway] Process already running');
      return;
    }

    this.status = 'starting';

    debugLog('========== Gateway Start ==========');

    // Determine Node.js executable path
    const nodeExe = this.findNodeExecutable();

    // Determine Gateway entry point
    const gatewayEntry = this.findGatewayEntry();

    debugLog('[Gateway] Starting with:', nodeExe, gatewayEntry);
    debugLog('[Gateway] Working directory:', this.resourcesPath);
    debugLog('[Gateway] Current process cwd:', process.cwd());

    // In packaged mode, CLI code is at resources/app/ with node_modules
    // In dev mode, use resourcesPath (project root)
    const appDir = path.join(this.resourcesPath, 'app');
    const isPackaged = fs.existsSync(path.join(appDir, 'index.js'));

    // cwd must be the directory containing the entry point (app/)
    const cwd = isPackaged ? appDir : this.resourcesPath;

    debugLog('[Gateway] Computed cwd:', cwd);
    debugLog('[Gateway] isPackaged:', isPackaged);
    debugLog('[Gateway] gatewayEntry exists:', fs.existsSync(gatewayEntry));
    debugLog('[Gateway] nodeExe exists:', fs.existsSync(nodeExe));
    if (isPackaged) {
      debugLog('[Gateway] node_modules exists:', fs.existsSync(path.join(cwd, 'node_modules')));
    }

    // Spawn the process - Node.js will find node_modules in cwd
    // Use 'gateway start' to allow invalid config
    try {
      this.process = spawn(nodeExe, [gatewayEntry, 'gateway', 'start'], {
        env: {
          ...process.env,
          OPENCLAW_MODE: 'gui',
          PATH: process.env.PATH,
        },
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        shell: false,
        windowsHide: true,
      });
    } catch (err) {
      debugLog('[Gateway] Spawn error:', err);
      this.status = 'error';
      return;
    }

    debugLog('[Gateway] Process spawned, PID:', this.process.pid);

    // Handle stdout
    if (this.process.stdout) {
      this.process.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        debugLog('[Gateway stdout]', output.trim());
        this.notifyOutput(output);
      });

      this.process.stdout.on('error', (err) => {
        console.error('[Gateway stdout error]', err);
      });
    } else {
      debugLog('[Gateway] stdout is null');
    }

    // Handle stderr
    if (this.process.stderr) {
      this.process.stderr.on('data', (data: Buffer) => {
        const output = data.toString();
        debugLog('[Gateway stderr]', output.trim());
        this.notifyOutput(output);
      });

      this.process.stderr.on('error', (err) => {
        console.error('[Gateway stderr error]', err);
      });
    } else {
      console.warn('[Gateway] stderr is null');
    }

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      debugLog(`[Gateway] Process exited with code ${code}, signal ${signal}`);
      this.status = 'stopped';
      this.process = null;

      // Only auto-restart on unexpected exit (not normal exit or kill signals)
      // Exit code 0 means normal exit - don't restart
      // Exit code > 0 or null signal means crash - try to restart
      const isNormalExit = code === 0 && !signal;
      const isKilled = signal === 'SIGTERM' || signal === 'SIGINT' || signal === 'SIGKILL';

      if (!isNormalExit && !isKilled) {
        if (this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++;
          debugLog(`[Gateway] Auto-restarting after unexpected exit (attempt ${this.restartAttempts}/${this.maxRestartAttempts})`);
          this.restartTimeout = setTimeout(() => this.start(), 2000);
        } else {
          console.error('[Gateway] Max restart attempts reached, giving up');
          this.status = 'error';
        }
      } else if (isNormalExit) {
        debugLog('[Gateway] Normal exit, not restarting');
        this.restartAttempts = 0;
      } else {
        // Killed by signal - reset counter
        this.restartAttempts = 0;
      }
    });

    // Handle process error
    this.process.on('error', (err) => {
      console.error('[Gateway] Process error:', err);
      this.status = 'error';
      this.notifyOutput(`ERROR: ${err.message}\n`);
    });

    // Check if process is still alive after a short delay
    setTimeout(() => {
      if (this.process && this.process.pid) {
        try {
          // Check if process is still alive
          process.kill(this.process.pid, 0);
          debugLog('[Gateway] Process is alive, PID:', this.process.pid);
        } catch (err) {
          console.error('[Gateway] Process check failed:', err);
        }
      }
    }, 100);

    // Set up ready check
    this.readyPromise = this.waitForReady();
  }

  /**
   * Find the Node.js executable
   */
  private findNodeExecutable(): string {
    // Always try to find system Node.js first (works in both dev and packaged modes)
    // System Node.js can find modules in project node_modules automatically
    console.log('[Gateway] Finding system Node.js...');
    
    const { execSync } = require('child_process');
    try {
      const nodePath = process.platform === 'win32'
        ? execSync('where node', { encoding: 'utf8' }).trim().split('\n')[0]
        : execSync('which node', { encoding: 'utf8' }).trim();
      
      if (nodePath && fs.existsSync(nodePath)) {
        console.log('[Gateway] Found system Node.js:', nodePath);
        return nodePath;
      }
    } catch (err) {
      console.warn('[Gateway] Failed to find node from PATH:', err);
    }

    // Fallback: try common Windows paths
    if (process.platform === 'win32') {
      const possiblePaths = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'node', 'node.exe'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'nodejs', 'node.exe'),
        'C:\\Program Files\\nodejs\\node.exe',
      ];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          console.log('[Gateway] Found Node.js at:', p);
          return p;
        }
      }
    }

    // Last resort: try bundled Node.js
    const bundledNode = path.join(this.resourcesPath, 'tools', 'nodejs', 'node.exe');
    if (fs.existsSync(bundledNode)) {
      console.log('[Gateway] Using bundled Node.js:', bundledNode);
      return bundledNode;
    }

    console.warn('[Gateway] Could not find Node.js, using process.execPath');
    return process.execPath;
  }

  /**
   * Find the Gateway entry point
   */
  private findGatewayEntry(): string {
    debugLog('[Gateway] findGatewayEntry, resourcesPath:', this.resourcesPath);

    // In packaged mode, CLI code is at resources/app/index.js
    // (from extraResources: "../../dist" -> "app")
    const appDir = path.join(this.resourcesPath, 'app');
    const appEntry = path.join(appDir, 'index.js');
    debugLog('[Gateway] Checking appEntry:', appEntry, 'exists:', fs.existsSync(appEntry));
    if (fs.existsSync(appEntry)) {
      debugLog('[Gateway] Using app entry:', appEntry);
      return appEntry;
    }

    // Fallback: try app.asar.unpacked
    const appUnpackedDir = path.join(this.resourcesPath, 'app.asar.unpacked');
    const unpackedDistEntry = path.join(appUnpackedDir, 'dist', 'index.js');
    debugLog('[Gateway] Checking unpackedDistEntry:', unpackedDistEntry, 'exists:', fs.existsSync(unpackedDistEntry));
    if (fs.existsSync(unpackedDistEntry)) {
      debugLog('[Gateway] Using unpacked dist entry:', unpackedDistEntry);
      return unpackedDistEntry;
    }

    // Dev mode: try project root
    const cliEntry = path.join(this.resourcesPath, 'openclaw.mjs');
    debugLog('[Gateway] Checking cliEntry:', cliEntry, 'exists:', fs.existsSync(cliEntry));
    if (fs.existsSync(cliEntry)) {
      debugLog('[Gateway] Using CLI entry:', cliEntry);
      return cliEntry;
    }

    const distEntry = path.join(this.resourcesPath, 'dist', 'index.js');
    debugLog('[Gateway] Checking distEntry:', distEntry, 'exists:', fs.existsSync(distEntry));
    if (fs.existsSync(distEntry)) {
      debugLog('[Gateway] Using dist entry:', distEntry);
      return distEntry;
    }

    console.warn('[Gateway] Gateway entry not found, using fallback');
    return path.join(this.resourcesPath, 'dist', 'index.js');
  }

  /**
   * Wait for Gateway to be ready (listening on port)
   */
  private async waitForReady(): Promise<boolean> {
    const maxAttempts = 60; // 30 seconds (500ms intervals)
    const url = `http://${this.options.host}:${this.options.port}`;

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok || response.status === 401) {
          debugLog('[Gateway] Ready at', url);
          this.status = 'running';
          return true;
        }
      } catch {
        // Not ready yet, keep trying
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.error('[Gateway] Failed to become ready');
    this.status = 'error';
    return false;
  }

  /**
   * Notify output subscribers
   */
  private notifyOutput(data: string): void {
    for (const callback of this.outputCallbacks) {
      try {
        callback(data);
      } catch (err) {
        console.error('[Gateway] Error in output callback:', err);
      }
    }
  }

  /**
   * Promise that resolves when Gateway is ready
   */
  isReady(): Promise<boolean> {
    if (!this.readyPromise) {
      this.readyPromise = this.waitForReady();
    }
    return this.readyPromise;
  }

  /**
   * Stop the Gateway
   */
  stop(): void {
    // Clear any pending restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Reset restart counter
    this.restartAttempts = 0;

    if (this.process) {
      debugLog('[Gateway] Stopping...');
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          debugLog('[Gateway] Force killing...');
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }

    this.status = 'stopped';
    this.process = null;
    this.readyPromise = null;
  }

  /**
   * Get current status
   */
  getStatus(): GatewayStatus {
    return this.status;
  }

  /**
   * Restart the Gateway
   */
  restart(): void {
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  /**
   * Subscribe to output
   */
  onOutput(callback: (data: string) => void): void {
    this.outputCallbacks.push(callback);
  }
}

// Global instance
let globalGateway: GatewayManager | null = null;

/**
 * Start the Gateway process
 */
export function startGateway(
  resourcesPath: string,
  options?: GatewayOptions,
): GatewayProcessHandle {
  if (!globalGateway) {
    globalGateway = new GatewayManager(resourcesPath, options);
    globalGateway.start();
  }
  return globalGateway;
}

/**
 * Get the global Gateway instance
 */
export function getGateway(): GatewayProcessHandle | null {
  return globalGateway;
}

/**
 * Stop the global Gateway instance
 */
export function stopGateway(): void {
  if (globalGateway) {
    globalGateway.stop();
    globalGateway = null;
  }
}
