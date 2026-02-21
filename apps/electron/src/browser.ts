/**
 * OpenClaw Electron - Browser Window Manager
 *
 * Manages the main browser window that displays the Gateway Web UI.
 */

import { BrowserWindow, screen } from 'electron';
import path from 'node:path';

export interface WindowOptions {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  maximized?: boolean;
}

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maximized: boolean;
}

class WindowManager {
  private window: BrowserWindow | null = null;
  private state: WindowState;

  constructor() {
    // Load saved window state or use defaults
    this.state = this.loadWindowState();
  }

  /**
   * Load window state from storage (simplified - could use electron-store)
   */
  private loadWindowState(): WindowState {
    return {
      width: 1280,
      height: 800,
      maximized: false,
    };
  }

  /**
   * Save window state
   */
  private saveWindowState(): void {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }

    const bounds = this.window.getBounds();
    const isMaximized = this.window.isMaximized();

    this.state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: isMaximized,
    };

    // TODO: Persist to disk using electron-store
  }

  /**
   * Create and show the main window
   */
  createWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return this.window;
    }

    // Get display bounds to ensure window is visible
    const display = screen.getPrimaryDisplay();
    const { workArea } = display;

    // Validate and clamp position
    let x = this.state.x;
    let y = this.state.y;

    if (x !== undefined && y !== undefined) {
      // Ensure window is within work area
      if (x < workArea.x || x + this.state.width > workArea.x + workArea.width) {
        x = undefined;
      }
      if (y < workArea.y || y + this.state.height > workArea.y + workArea.height) {
        y = undefined;
      }
    }

    // Create window
    const window = new BrowserWindow({
      width: this.state.width,
      height: this.state.height,
      x,
      y,
      minWidth: 900,
      minHeight: 600,
      show: false, // Show when ready
      backgroundColor: '#ffffff',
      title: 'OpenClaw',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });

    this.window = window;

    // Restore maximized state
    if (this.state.maximized) {
      window.maximize();
    }

    // Load the Gateway Web UI
    this.loadGatewayUI();

    // Show when ready
    window.once('ready-to-show', () => {
      window.show();
    });

    // Track state changes
    window.on('resize', () => this.saveWindowState());
    window.on('move', () => this.saveWindowState());
    window.on('maximize', () => {
      this.notifyMaximizeChange(true);
      this.saveWindowState();
    });
    window.on('unmaximize', () => {
      this.notifyMaximizeChange(false);
      this.saveWindowState();
    });

    // Handle close
    window.on('closed', () => {
      this.window = null;
    });

    return window;
  }

  /**
   * Load the Gateway Web UI
   */
  private async loadGatewayUI(): Promise<void> {
    if (!this.window) {
      return;
    }

    const gatewayUrl = 'http://127.0.0.1:18789';

    try {
      // Try loading with a short timeout
      await this.window.loadURL(gatewayUrl, {
        timeout: 5000,
      });
    } catch (err) {
      console.error('Failed to load Gateway UI:', err);

      // Show a loading/error page
      this.window.loadURL(`
        data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                margin: 0;
                padding: 40px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .container {
                text-align: center;
                max-width: 500px;
              }
              h1 {
                font-size: 48px;
                margin: 0 0 16px 0;
              }
              p {
                font-size: 18px;
                opacity: 0.9;
                margin: 8px 0;
              }
              .spinner {
                margin: 32px auto;
                width: 50px;
                height: 50px;
                border: 4px solid rgba(255,255,255,0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              .retry-btn {
                margin-top: 24px;
                padding: 12px 24px;
                font-size: 16px;
                background: white;
                color: #667eea;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
              }
              .retry-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
              }
              .logs {
                margin-top: 32px;
                text-align: left;
                background: rgba(0,0,0,0.3);
                padding: 16px;
                border-radius: 8px;
                font-family: monospace;
                font-size: 12px;
                max-height: 200px;
                overflow-y: auto;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>OpenClaw</h1>
              <p>Connecting to Gateway...</p>
              <div class="spinner"></div>
              <p style="font-size: 14px; opacity: 0.7;">Make sure the Gateway is running on port 18789</p>
              <button class="retry-btn" onclick="location.reload()">Retry</button>
              <div class="logs" id="logs">Waiting for Gateway...</div>
            </div>
            <script>
              // Auto-retry every 3 seconds
              setTimeout(() => location.reload(), 3000);
            </script>
          </body>
        </html>
      `);
    }
  }

  /**
   * Notify listeners of maximize state change
   */
  private notifyMaximizeChange(maximized: boolean): void {
    // Could send IPC event to renderer here
  }

  /**
   * Get the current window
   */
  getWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * Check if window is maximized
   */
  isMaximized(): boolean {
    return this.window ? this.window.isMaximized() : false;
  }

  /**
   * Minimize the window
   */
  minimize(): void {
    this.window?.minimize();
  }

  /**
   * Maximize or restore the window
   */
  toggleMaximize(): void {
    if (this.window) {
      if (this.window.isMaximized()) {
        this.window.restore();
      } else {
        this.window.maximize();
      }
    }
  }

  /**
   * Close the window
   */
  close(): void {
    this.window?.close();
  }
}

// Global instance
let globalWindowManager: WindowManager | null = null;

/**
 * Get or create the window manager
 */
export function getWindowManager(): WindowManager {
  if (!globalWindowManager) {
    globalWindowManager = new WindowManager();
  }
  return globalWindowManager;
}

/**
 * Create and show the main window
 */
export function createMainWindow(): BrowserWindow {
  return getWindowManager().createWindow();
}
