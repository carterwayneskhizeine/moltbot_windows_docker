"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  onGatewayReady: (callback) => {
    electron.ipcRenderer.on("gateway-ready", (_event, url) => callback(url));
  },
  getProcessInfo: () => electron.ipcRenderer.invoke("get-process-info")
});
