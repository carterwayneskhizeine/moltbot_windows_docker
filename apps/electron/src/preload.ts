/**
 * OpenClaw Electron - Preload Script
 *
 * Exposes safe APIs to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron API exposed to renderer process
 */
const electronAPI = {
  // Gateway control
  gateway: {
    start: () => ipcRenderer.invoke('gateway:start'),
    stop: () => ipcRenderer.invoke('gateway:stop'),
    restart: () => ipcRenderer.invoke('gateway:restart'),
    status: () => ipcRenderer.invoke('gateway:status'),
    onOutput: (callback: (data: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: string) => callback(data);
      ipcRenderer.on('gateway:output', listener);
      return () => ipcRenderer.removeListener('gateway:output', listener);
    },
  },

  // Tools management
  tools: {
    getStatus: () => ipcRenderer.invoke('tools:status'),
    install: (tool: string) => ipcRenderer.invoke('tools:install', tool),
    getPath: (tool: string) => ipcRenderer.invoke('tools:path', tool),
    onProgress: (callback: (data: { tool: string; progress: number; status: string }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('tools:progress', listener);
      return () => ipcRenderer.removeListener('tools:progress', listener);
    },
  },

  // Application control
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPath: (name: string) => ipcRenderer.invoke('app:path', name),
    quit: () => ipcRenderer.invoke('app:quit'),
    relaunch: () => ipcRenderer.invoke('app:relaunch'),
  },

  // Window control
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    restore: () => ipcRenderer.invoke('window:restore'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window:maximizeChange', listener);
      return () => ipcRenderer.removeListener('window:maximizeChange', listener);
    },
  },

  // System info
  system: {
    getPlatform: () => process.platform,
    getArch: () => process.arch,
    getNodeVersion: () => process.versions.node,
    getElectronVersion: () => process.versions.electron,
    getChromeVersion: () => process.versions.chrome,
  },

  // Splash screen events
  splash: {
    onToolsStatus: (callback: (status: Record<string, boolean>) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: any) => callback(status);
      ipcRenderer.on('splash:tools-status', listener);
      return () => ipcRenderer.removeListener('splash:tools-status', listener);
    },
  },
};

// Expose the API to the window object
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  } catch (error) {
    console.error('[Preload] Failed to expose API:', error);
  }
} else {
  // Fallback for non-isolated context (not recommended)
  (globalThis as any).window.electronAPI = electronAPI;
}

// TypeScript type definitions for the renderer
export type ElectronAPI = typeof electronAPI;

// Extend the Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
