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

    try {
      await this.checkAndClearPort();

      const nodePath = NodeRuntime.getNodePath();
      const entryPath = NodeRuntime.getOpenClawEntryPath();

      console.log(`[GatewayManager] Starting Gateway...`);
      console.log(`[GatewayManager] Node executable: ${nodePath}`);
      console.log(`[GatewayManager] Entry script: ${entryPath}`);

      // openclaw.mjs uses relative imports (./dist/entry.js),
      // so cwd MUST be the directory containing openclaw.mjs (workspace root in dev, 
      // or the extracted userData path in production).
      const entryCwd = path.dirname(entryPath);

      const env = { ...process.env, NODE_ENV: 'production' };

      this.gatewayProcess = spawn(nodePath, [entryPath], {
        env,
        cwd: entryCwd,
        stdio: 'pipe',
        windowsHide: true,
      });

      this.gatewayProcess.stdout?.on('data', (data) => {
        console.log(`[Gateway stdout]: ${data.toString()}`);
      });

      this.gatewayProcess.stderr?.on('data', (data) => {
        console.error(`[Gateway stderr]: ${data.toString()}`);
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
      attempts++;
      http.get(checkUrl, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          this.retryCount = 0; // Reset retries on successful boot
          console.log(`[GatewayManager] Gateway is healthy and ready at port ${this.port}`);
          this.onReady(`http://127.0.0.1:${this.port}`);
        }
      }).on('error', () => {
        // Ignored, just means it's not up yet
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error(`[GatewayManager] Gateway failed health checks after ${maxAttempts} attempts.`);
        }
      });
    }, 1000); // Check every second
  }

  private async checkAndClearPort(): Promise<void> {
    // Basic port checking implementation.
    // In production, we should specifically find PIDs listening on the port
    // and verify their command line arguments before killing them to prevent killing 3rd party apps.
    // For now, if the port is busy initially and we don't own it, we could change PORT.
    return Promise.resolve();
  }
}
