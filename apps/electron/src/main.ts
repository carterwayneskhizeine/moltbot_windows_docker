/**
 * OpenClaw Electron - Main Process
 *
 * Entry point for the OpenClaw desktop application.
 * Manages application lifecycle, splash screen, gateway process, and main window.
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';

// Global references
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let gatewayProcess: any = null;
let isQuitting = false;
let isDev: boolean;
let resourcesPath: string;

/**
 * Create and show the splash screen
 */
async function createSplashWindow(): Promise<BrowserWindow> {
  const splash = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load splash screen HTML
  const splashHtmlPath = path.join(__dirname, '../resources/splash.html');
  try {
    await splash.loadFile(splashHtmlPath);
  } catch {
    // Fallback: create a simple loading screen
    splash.loadURL(`
      data:text/html;charset=utf-8,
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: white;
            }
            .container {
              text-align: center;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 8px;
            }
            p {
              font-size: 14px;
              opacity: 0.8;
            }
            .spinner {
              margin-top: 24px;
              width: 40px;
              height: 40px;
              border: 3px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>OpenClaw</h1>
            <p>Starting...</p>
            <div class="spinner"></div>
          </div>
        </body>
      </html>
    `);
  }

  splashWindow = splash;
  return splash;
}

/**
 * Create the main browser window
 */
async function createMainWindow(): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // Don't show until ready
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      // Allow loading localhost
      additionalArguments: [
        '--enable-features=ElectronDefaultPoweredByNodeAware',
      ],
    },
  });

  mainWindow = window;

  // Load the OpenClaw Gateway Web UI
  // Give it a moment to start
  setTimeout(async () => {
    try {
      await window.loadURL('http://127.0.0.1:18789');
    } catch (err) {
      console.error('Failed to load Gateway UI:', err);
      // Show error page
      window.loadURL(`
        data:text/html;charset=utf-8,
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: sans-serif;
                padding: 40px;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <h1>OpenClaw Gateway Unavailable</h1>
            <p>Could not connect to the Gateway server.</p>
            <p>Please check if the Gateway is running on port 18789.</p>
          </body>
        </html>
      `);
    }
  }, 1000);

  // Show window when ready
  window.once('ready-to-show', () => {
    window.show();
    if (isDev) {
      window.webContents.openDevTools();
    }
  });

  // Intercept window close to hide instead of quit
  window.on('close', (event) => {
    // If the window is still being shown, hide it instead of closing
    // This allows the app to continue running in the background with tray icon
    if (!window.isDestroyed() && !isQuitting) {
      event.preventDefault();
      window.hide();
    }
  });

  // Window closed (actually destroyed)
  window.on('closed', () => {
    mainWindow = null;
  });

  return window;
}

/**
 * Application ready handler
 */
app.whenReady().then(async () => {
  // Initialize dev mode and resources path (can't access app.isPackaged before ready)
  isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  resourcesPath = isDev
    ? path.join(__dirname, '../../..')
    : process.resourcesPath;

  // Create splash screen first
  await createSplashWindow();

  // Initialize and check tools
  const { checkTools } = await import('./tools/manager.js');
  const toolsStatus = await checkTools(resourcesPath);

  if (splashWindow) {
    // Send status update to splash
    splashWindow.webContents.send('tools-status', toolsStatus);
  }

  // Start the Gateway process
  const { startGateway } = await import('./gateway.js');
  gatewayProcess = startGateway(resourcesPath);

  // Wait for Gateway to be ready (with timeout)
  const gatewayReady = await Promise.race([
    gatewayProcess.isReady(),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 30000)),
  ]);

  if (!gatewayReady) {
    console.error('Gateway failed to start within timeout');
  }

  // Create main window
  await createMainWindow();

  // Initialize system tray
  const { initTray } = await import('./tray.js');
  initTray();

  // Close splash screen after a short delay
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  }, 1000);

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

/**
 * All windows closed handler
 */
app.on('window-all-closed', () => {
  // On macOS, keep app running (common behavior)
  // On Windows/Linux, keep app running in background with tray icon
  // Don't quit - let user explicitly quit via tray menu
});

/**
 * Application quit handler
 */
app.on('before-quit', () => {
  // Set quitting flag so window close handler doesn't interfere
  isQuitting = true;

  // Stop Gateway process
  if (gatewayProcess) {
    gatewayProcess.stop();
    gatewayProcess = null;
  }
});

/**
 * Second instance handler (Windows/Linux)
 */
app.on('second-instance', () => {
  // Focus the existing window when a second instance is launched
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});
