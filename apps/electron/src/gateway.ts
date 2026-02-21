/**
 * OpenClaw Electron - Gateway Process Manager
 *
 * Manages the OpenClaw Gateway subprocess.
 * Handles starting, stopping, and monitoring the Gateway.
 */

import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { net } from 'electron';

// Gateway configuration
const GATEWAY_PORT = 18789;
const GATEWAY_HOST = '127.0.0.1';

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

    // Determine Node.js executable path
    const nodeExe = this.findNodeExecutable();

    // Determine Gateway entry point
    const gatewayEntry = this.findGatewayEntry();

    console.log('[Gateway] Starting with:', nodeExe, gatewayEntry);

    // Spawn the process
    this.process = spawn(nodeExe, [gatewayEntry, 'gateway'], {
      env: {
        ...process.env,
        OPENCLAW_MODE: 'gui',
        NODE_ENV: 'production',
        ...this.options.env,
      },
      cwd: this.resourcesPath,
      stdio: 'pipe',
      detached: false,
    });

    // Handle stdout
    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log('[Gateway stdout]', output);
      this.notifyOutput(output);
    });

    // Handle stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.error('[Gateway stderr]', output);
      this.notifyOutput(output);
    });

    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log(`[Gateway] Process exited with code ${code}, signal ${signal}`);
      this.status = 'stopped';
      this.process = null;

      // Auto-restart on unexpected exit (not during normal quit)
      if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
        console.log('[Gateway] Auto-restarting after unexpected exit');
        setTimeout(() => this.start(), 2000);
      }
    });

    // Handle process error
    this.process.on('error', (err) => {
      console.error('[Gateway] Process error:', err);
      this.status = 'error';
      this.notifyOutput(`ERROR: ${err.message}\n`);
    });

    // Set up ready check
    this.readyPromise = this.waitForReady();
  }

  /**
   * Find the Node.js executable
   */
  private findNodeExecutable(): string {
    // Try bundled Node.js first
    const bundledNode = path.join(this.resourcesPath, 'tools', 'nodejs', 'node.exe');
    if (fs.existsSync(bundledNode)) {
      return bundledNode;
    }

    // Fall back to system Node.js
    return process.execPath;
  }

  /**
   * Find the Gateway entry point
   */
  private findGatewayEntry(): string {
    // Try the built dist/index.js
    const distEntry = path.join(this.resourcesPath, 'app', 'dist', 'index.js');
    if (fs.existsSync(distEntry)) {
      return distEntry;
    }

    // Try the CLI entry point
    const cliEntry = path.join(this.resourcesPath, 'openclaw.mjs');
    if (fs.existsSync(cliEntry)) {
      return cliEntry;
    }

    // Fall back to a relative path (development)
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
          console.log('[Gateway] Ready at', url);
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
    if (this.process) {
      console.log('[Gateway] Stopping...');
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('[Gateway] Force killing...');
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
