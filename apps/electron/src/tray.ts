/**
 * OpenClaw Electron - System Tray
 *
 * Manages the system tray icon and context menu.
 */

import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron';
import path from 'node:path';
import { getGateway } from './gateway.js';
import { createMainWindow } from './browser.js';

class TrayManager {
  private tray: Tray | null = null;
  private status: 'running' | 'stopped' | 'error' = 'stopped';

  constructor() {
    this.createTray();
  }

  /**
   * Create the system tray icon
   */
  private createTray(): void {
    // Try to load the icon
    const iconPath = this.getIconPath();
    const icon = nativeImage.createFromPath(iconPath);

    this.tray = new Tray(icon.isEmpty() ? this.createFallbackIcon() : icon);
    this.tray.setToolTip('OpenClaw');

    // Handle single click - toggle window visibility
    this.tray.on('click', () => {
      this.onTrayClick();
    });

    // Handle double click - show and focus window
    this.tray.on('double-click', () => {
      this.onTrayDoubleClick();
    });

    this.updateMenu();
  }

  /**
   * Handle tray click - toggle window visibility
   */
  private onTrayClick(): void {
    const { BrowserWindow } = require('electron');
    const windows = BrowserWindow.getAllWindows();

    if (windows.length === 0) {
      // No window exists, create one
      createMainWindow().show();
      return;
    }

    const win = windows[0];
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  }

  /**
   * Get the tray icon path
   */
  private getIconPath(): string {
    const isDev = !app.isPackaged;
    const iconPaths = [
      path.join(__dirname, '../resources/icon.png'),
      path.join(__dirname, '../resources/icon.ico'),
      path.join(__dirname, '../../../assets/openclaw-icon.png'),
    ];

    for (const p of iconPaths) {
      return p; // Return first path, let Electron handle missing files
    }

    return '';
  }

  /**
   * Create a fallback icon (simple colored square)
   */
  private createFallbackIcon(): Electron.NativeImage {
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);

    // Fill with purple color (RGBA)
    for (let i = 0; i < size * size; i++) {
      buffer[i * 4] = 118;     // R
      buffer[i * 4 + 1] = 75;  // G
      buffer[i * 4 + 2] = 162; // B
      buffer[i * 4 + 3] = 255; // A
    }

    return nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  /**
   * Update the tray icon based on status
   */
  private updateIcon(): void {
    if (!this.tray) {
      return;
    }

    // In a full implementation, you'd have different icons for different states
    // For now, we just update the tooltip
    const tooltips = {
      running: 'OpenClaw - Running',
      stopped: 'OpenClaw - Stopped',
      error: 'OpenClaw - Error',
    };

    this.tray.setToolTip(tooltips[this.status]);
  }

  /**
   * Update the context menu
   */
  private updateMenu(): void {
    if (!this.tray) {
      return;
    }

    const gateway = getGateway();
    const status = gateway?.getStatus() ?? 'stopped';

    // Update internal status
    this.status = status === 'running' ? 'running' : status === 'stopped' ? 'stopped' : 'error';

    const statusText = this.status === 'running' ? '● Running' : '○ Stopped';
    const statusClickAction = this.status === 'running' ? 'gateway:stop' : 'gateway:start';

    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'OpenClaw',
        enabled: false,
      },
      {
        type: 'separator',
      },
      {
        label: statusText,
        click: () => {
          const gw = getGateway();
          if (this.status === 'running') {
            gw?.stop();
          } else {
            gw?.restart();
          }
        },
      },
      {
        label: 'Open Web UI',
        click: () => {
          const win = createMainWindow();
          win.show();
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Restart Gateway',
        click: () => {
          const gw = getGateway();
          gw?.restart();
        },
      },
      {
        label: 'Settings...',
        click: () => {
          // Open settings window
          const win = createMainWindow();
          win.show();
          win.loadURL('http://127.0.0.1:18789#settings');
        },
      },
      {
        type: 'separator',
      },
      {
        label: 'Quit OpenClaw',
        click: () => {
          app.quit();
        },
      },
    ];

    const contextMenu = Menu.buildFromTemplate(template);
    this.tray.setContextMenu(contextMenu);

    // Update icon
    this.updateIcon();
  }

  /**
   * Handle tray double-click
   */
  private onTrayDoubleClick(): void {
    const win = createMainWindow();

    if (win.isMinimized()) {
      win.restore();
    }

    win.show();
    win.focus();
  }
}

// Global instance
let globalTray: TrayManager | null = null;

/**
 * Initialize the system tray
 */
export function initTray(): TrayManager {
  if (!globalTray) {
    globalTray = new TrayManager();
  }
  return globalTray;
}

/**
 * Update the tray menu (call when Gateway status changes)
 */
export function updateTrayMenu(): void {
  if (globalTray) {
    // Access private method through cast
    (globalTray as any).updateMenu();
  }
}

/**
 * Clean up the tray
 */
export function destroyTray(): void {
  if (globalTray) {
    (globalTray as any).tray?.destroy();
    globalTray = null;
  }
}
