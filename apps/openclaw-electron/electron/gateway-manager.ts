import { ChildProcess, spawn } from 'child_process';
import { NodeRuntime } from './node-runtime';
import http from 'http';
import path from 'path';

export class GatewayManager {
  private gatewayProcess: ChildProcess | null = null;
  private port = 18789;
  private isRestarting = false;
  private stoppedByUser = false;
  private readonly maxRetries = 5;
  private retryCount = 0;

  constructor(private onReady: (url: string) => void) {}

  async start(): Promise<void> {
    if (this.gatewayProcess) {
      console.log('[GatewayManager] Gateway is already running.');
      return;
    }

    this.stoppedByUser = false;

    try {
      const { command, args, cwd } = NodeRuntime.getGatewayStartCommand();

      console.log(`[GatewayManager] Starting Gateway...`);
      console.log(`[GatewayManager] Command: ${command} ${args.join(' ')}`);
      console.log(`[GatewayManager] CWD: ${cwd}`);

      const env = { ...process.env };

      this.gatewayProcess = spawn(command, args, {
        env,
        cwd,
        stdio: 'pipe',
        windowsHide: true,
        // On Windows, pnpm is a .cmd script and needs shell: true
        shell: process.platform === 'win32',
      });

      this.gatewayProcess.stdout?.on('data', (data) => {
        console.log(`[Gateway stdout]: ${data.toString().trimEnd()}`);
      });

      this.gatewayProcess.stderr?.on('data', (data) => {
        console.error(`[Gateway stderr]: ${data.toString().trimEnd()}`);
      });

      this.gatewayProcess.on('exit', (code, signal) => {
        console.warn(`[GatewayManager] Process exited with code ${code}, signal ${signal}`);
        this.gatewayProcess = null;

        if (!this.isRestarting && !this.stoppedByUser) {
          this.handleUnexpectedCrash();
        }
      });

      this.waitForHealth();
    } catch (err) {
      console.error('[GatewayManager] Failed to start gateway:', err);
    }
  }

  async stop(): Promise<void> {
    this.isRestarting = true;
    this.stoppedByUser = true;

    if (this.gatewayProcess) {
      console.log('[GatewayManager] Stopping gateway process...');
      this.gatewayProcess.kill('SIGTERM');

      // Give it time to gracefully exit
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (this.gatewayProcess && !this.gatewayProcess.killed) {
        console.log('[GatewayManager] Force killing gateway process...');
        this.gatewayProcess.kill('SIGKILL');
      }
      this.gatewayProcess = null;
    }
    this.isRestarting = false;
  }

  private handleUnexpectedCrash() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(5000 * this.retryCount, 30000);
      console.log(`[GatewayManager] Restarting gateway in ${delay}ms (Attempt ${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => {
        this.start();
      }, delay);
    } else {
      console.error('[GatewayManager] Max restart retries reached. Gateway is dead.');
    }
  }

  private async waitForHealth(): Promise<void> {
    const checkUrl = `http://127.0.0.1:${this.port}/health`;

    const maxAttempts = 30;
    let attempts = 0;

    const interval = setInterval(() => {
      if (this.stoppedByUser) {
        clearInterval(interval);
        return;
      }

      attempts++;
      http.get(checkUrl, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          this.retryCount = 0;
          console.log(`[GatewayManager] Gateway is healthy at port ${this.port}`);
          this.onReady(`http://127.0.0.1:${this.port}`);
        }
      }).on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error(`[GatewayManager] Gateway failed health checks after ${maxAttempts} attempts.`);
        }
      });
    }, 1000);
  }
}
