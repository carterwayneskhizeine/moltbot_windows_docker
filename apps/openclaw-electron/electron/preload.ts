import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onGatewayReady: (callback: (url: string) => void) => {
    ipcRenderer.on('gateway-ready', (_event, url) => callback(url));
  },
  getProcessInfo: () => ipcRenderer.invoke('get-process-info')
});
