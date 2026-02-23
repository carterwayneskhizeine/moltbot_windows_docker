import { contextBridge, ipcRenderer } from 'electron'

export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

export interface GatewayStatus {
  state: GatewayState
  port: number
}

export interface GatewayLog {
  level: 'info' | 'warn' | 'error'
  message: string
}

const electronAPI = {
  gateway: {
    getStatus: (): Promise<GatewayStatus> =>
      ipcRenderer.invoke('gateway:status'),
    start: (): Promise<void> =>
      ipcRenderer.invoke('gateway:start'),
    stop: (): Promise<void> =>
      ipcRenderer.invoke('gateway:stop'),
    restart: (): Promise<void> =>
      ipcRenderer.invoke('gateway:restart'),
    getPort: (): Promise<number> =>
      ipcRenderer.invoke('gateway:getPort'),
    onStateChanged: (callback: (state: GatewayState) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: GatewayState) => callback(state)
      ipcRenderer.on('gateway:stateChanged', handler)
      return () => ipcRenderer.removeListener('gateway:stateChanged', handler)
    },
    onLog: (callback: (log: GatewayLog) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, log: GatewayLog) => callback(log)
      ipcRenderer.on('gateway:log', handler)
      return () => ipcRenderer.removeListener('gateway:log', handler)
    },
  },

  app: {
    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('app:getVersion'),
  },

  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:openExternal', url),
  },
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    toggleMaximize: (): void => ipcRenderer.send('window:toggleMaximize'),
    hideToTray: (): void => ipcRenderer.send('window:hideToTray'),
  },
  pty: {
    create: (options?: { cwd?: string; id?: string }) => ipcRenderer.invoke('pty:create', options),
    write: (id: string, data: string) => ipcRenderer.send('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send('pty:resize', id, cols, rows),
    destroy: (id: string) => ipcRenderer.send('pty:destroy', id),
    onData: (callback: (id: string, data: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, data: string) => callback(id, data)
      ipcRenderer.on('pty:data', handler)
      return () => ipcRenderer.removeListener('pty:data', handler)
    },
    onExit: (callback: (id: string, info: { exitCode: number, signal?: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, id: string, info: any) => callback(id, info)
      ipcRenderer.on('pty:exit', handler)
      return () => ipcRenderer.removeListener('pty:exit', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
