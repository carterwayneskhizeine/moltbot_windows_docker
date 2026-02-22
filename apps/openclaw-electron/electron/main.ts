import { app, BrowserWindow, Tray, Menu, ipcMain } from 'electron';
import path from 'path';
import { ResourceManager } from './resource-manager';
import { GatewayManager } from './gateway-manager';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let gatewayManager: GatewayManager | null = null;
let isQuitting = false;

// Determine if we should set the app to not quit immediately
app.on('before-quit', () => {
  isQuitting = true;
});

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'OpenClaw Control',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'), // Vite builds it to preload.mjs normally
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    // Only intercept close if we're not actually quitting the app
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
  });

  // Load the loading UI initially
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
  return mainWindow;
}

function createTray() {
  // Setup tray icon path based on dev/prod
  const iconPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'assets', 'icon.ico') 
    : path.join(__dirname, '..', 'assets', 'icon.ico');

  tray = new Tray(iconPath);
  tray.setToolTip('OpenClaw Control Server');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口 (Show Window)',
      click: () => {
        mainWindow?.show();
      },
    },
    { type: 'separator' },
    {
      label: '退出 (Exit)',
      click: async () => {
        isQuitting = true;
        if (gatewayManager) {
          console.log('[Main] Stopping Gateway before exit...');
          await gatewayManager.stop();
        }
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  
  // Double-click shows window
  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

app.whenReady().then(async () => {
  console.log('[Main] App ready. Setting up resources...');
  
  // 1. Setup Resources if packaged
  await ResourceManager.setupResources();
  
  // 2. Create UI window (shows loading spinner)
  const window = await createWindow();
  
  // 3. Setup System Tray
  createTray();

  // 4. Start Gateway Process
  gatewayManager = new GatewayManager((url) => {
    // Send IPC to frontend when gateway is ready
    if (window && !window.isDestroyed()) {
      window.webContents.send('gateway-ready', url);
    }
  });
  
  gatewayManager.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
        mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Overriding standard behavior to keep app running in tray
  // Thus we do nothing here unless quitting
});
