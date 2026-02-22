"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const tar = require("tar");
const child_process = require("child_process");
const http = require("http");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const tar__namespace = /* @__PURE__ */ _interopNamespaceDefault(tar);
class ResourceManager {
  static getResourcesPath() {
    return path.join(electron.app.getPath("userData"), "resources");
  }
  static getExtractedOpenClawPath() {
    return path.join(this.getResourcesPath(), "openclaw");
  }
  /**
   * Extrac the bundled tar.gz to the user data directory if needed
   */
  static async setupResources() {
    if (!electron.app.isPackaged) {
      console.log("[ResourceManager] Development mode, skipping resource extraction.");
      return;
    }
    this.getResourcesPath();
    const openClawDestPath = this.getExtractedOpenClawPath();
    const bundledArchive = path.join(process.resourcesPath, "bundled", "openclaw.tar.gz");
    if (!fs.existsSync(bundledArchive)) {
      console.warn(`[ResourceManager] Archive not found at ${bundledArchive}. Ensure it is packed correctly.`);
      return;
    }
    const entryExists = fs.existsSync(path.join(openClawDestPath, "dist", "entry.js"));
    if (entryExists) {
      console.log("[ResourceManager] OpenClaw resources already present and seem valid.");
      return;
    }
    console.log("[ResourceManager] Extracting bundled OpenClaw to user data...");
    if (!fs.existsSync(openClawDestPath)) {
      fs.mkdirSync(openClawDestPath, { recursive: true });
    }
    try {
      await tar__namespace.x({
        file: bundledArchive,
        cwd: openClawDestPath,
        // Depending on how prepare_openclaw packages it, you might need strip: 1
        // Usually `tar -czf file.tar.gz -C bundled openclaw` puts an `openclaw` folder inside
        // So we strip that top-level folder to map perfectly to openClawDestPath
        strip: 1
      });
      console.log("[ResourceManager] Extraction complete.");
      this.createCommandLinks();
    } catch (err) {
      console.error("[ResourceManager] Failed to extract archive:", err);
    }
  }
  /**
   * Creates openclaw.cmd (Windows) or an executable script (macOS/Linux).
   */
  static createCommandLinks() {
    const resourcesPath = this.getResourcesPath();
    if (process.platform === "win32") {
      const cmdPath = path.join(resourcesPath, "openclaw.cmd");
      const script = `@ECHO OFF\r
node "%~dp0\\openclaw\\dist\\entry.js" %*`;
      fs.writeFileSync(cmdPath, script, "utf8");
      console.log(`[ResourceManager] Created command link at ${cmdPath}`);
    } else {
      const binPath = path.join(resourcesPath, "openclaw");
      const script = `#!/bin/sh
node "$(dirname "$0")/openclaw/dist/entry.js" "$@"`;
      fs.writeFileSync(binPath, script, { encoding: "utf8", mode: 493 });
      console.log(`[ResourceManager] Created command link at ${binPath}`);
    }
  }
}
class NodeRuntime {
  static get isPackaged() {
    return electron.app.isPackaged;
  }
  /**
   * Get the Node.js executable path depending on environment
   */
  static getNodePath() {
    if (!this.isPackaged) {
      return process.env.NODE_PATH || "node";
    }
    const isWindows = process.platform === "win32";
    const nodeExecutable = isWindows ? "node.exe" : "node";
    const bundledNodePath = path.join(process.resourcesPath, "bundled", "node", nodeExecutable);
    if (fs.existsSync(bundledNodePath)) {
      return bundledNodePath;
    }
    console.warn(`[NodeRuntime] Bundled Node.js not found at ${bundledNodePath}, falling back to system node`);
    return "node";
  }
  /**
   * Get the OpenClaw entry point path depending on environment
   */
  static getOpenClawEntryPath() {
    if (!this.isPackaged) {
      const searchPaths = [
        path.resolve(process.cwd(), "node_modules", "openclaw", "dist", "entry.js"),
        path.resolve(process.cwd(), "..", "..", "node_modules", "openclaw", "dist", "entry.js")
      ];
      for (const p of searchPaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
      return "openclaw";
    }
    const userDataPath = electron.app.getPath("userData");
    return path.join(userDataPath, "resources", "openclaw", "dist", "entry.js");
  }
}
class GatewayManager {
  constructor(onReady) {
    __publicField(this, "gatewayProcess", null);
    __publicField(this, "port", 18789);
    __publicField(this, "isRestarting", false);
    __publicField(this, "maxRetries", 5);
    __publicField(this, "retryCount", 0);
    this.onReady = onReady;
  }
  async start() {
    var _a, _b;
    if (this.gatewayProcess) {
      console.log("[GatewayManager] Gateway is already running.");
      return;
    }
    try {
      await this.checkAndClearPort();
      const nodePath = NodeRuntime.getNodePath();
      const entryPath = NodeRuntime.getOpenClawEntryPath();
      console.log(`[GatewayManager] Starting Gateway...`);
      console.log(`[GatewayManager] Node executable: ${nodePath}`);
      console.log(`[GatewayManager] Entry script: ${entryPath}`);
      const env = { ...process.env, PORT: String(this.port), NODE_ENV: "production" };
      this.gatewayProcess = child_process.spawn(nodePath, [entryPath, "start"], {
        env,
        stdio: "pipe",
        windowsHide: true
      });
      (_a = this.gatewayProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
        console.log(`[Gateway stdout]: ${data.toString()}`);
      });
      (_b = this.gatewayProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
        console.error(`[Gateway stderr]: ${data.toString()}`);
      });
      this.gatewayProcess.on("exit", (code, signal) => {
        console.warn(`[GatewayManager] Process exited with code ${code}, signal ${signal}`);
        this.gatewayProcess = null;
        if (!this.isRestarting && !exports.isQuitting) {
          this.handleUnexpectedCrash();
        }
      });
      this.waitForHealth();
    } catch (err) {
      console.error("[GatewayManager] Failed to start gateway:", err);
    }
  }
  async stop() {
    this.isRestarting = true;
    if (this.gatewayProcess) {
      console.log("[GatewayManager] Stopping gateway process...");
      this.gatewayProcess.kill("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 3e3));
      if (this.gatewayProcess && !this.gatewayProcess.killed) {
        console.log("[GatewayManager] Force killing gateway process...");
        this.gatewayProcess.kill("SIGKILL");
      }
      this.gatewayProcess = null;
    }
    this.isRestarting = false;
  }
  handleUnexpectedCrash() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(5e3 * this.retryCount, 3e4);
      console.log(`[GatewayManager] Restarting gateway in ${delay}ms (Attempt ${this.retryCount}/${this.maxRetries})...`);
      setTimeout(() => {
        this.start();
      }, delay);
    } else {
      console.error("[GatewayManager] Max restart retries reached. Gateway is dead.");
    }
  }
  async waitForHealth() {
    const checkUrl = `http://127.0.0.1:${this.port}/health`;
    const maxAttempts = 30;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      http.get(checkUrl, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          this.retryCount = 0;
          console.log(`[GatewayManager] Gateway is healthy and ready at port ${this.port}`);
          this.onReady(`http://127.0.0.1:${this.port}`);
        }
      }).on("error", () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error(`[GatewayManager] Gateway failed health checks after ${maxAttempts} attempts.`);
        }
      });
    }, 1e3);
  }
  async checkAndClearPort() {
    return Promise.resolve();
  }
}
let mainWindow = null;
let tray = null;
let gatewayManager = null;
exports.isQuitting = false;
electron.app.on("before-quit", () => {
  exports.isQuitting = true;
});
async function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    title: "OpenClaw Control",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Vite builds it to preload.js or .mjs depending on config, here it is .js
      nodeIntegration: false,
      contextIsolation: true
    },
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("close", (event) => {
    if (!exports.isQuitting) {
      event.preventDefault();
      mainWindow == null ? void 0 : mainWindow.hide();
      return false;
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  return mainWindow;
}
function createTray() {
  const iconPath = electron.app.isPackaged ? path.join(process.resourcesPath, "assets", "icon.ico") : path.join(__dirname, "..", "assets", "icon.ico");
  tray = new electron.Tray(iconPath);
  tray.setToolTip("OpenClaw Control Server");
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "显示窗口 (Show Window)",
      click: () => {
        mainWindow == null ? void 0 : mainWindow.show();
      }
    },
    { type: "separator" },
    {
      label: "退出 (Exit)",
      click: async () => {
        exports.isQuitting = true;
        if (gatewayManager) {
          console.log("[Main] Stopping Gateway before exit...");
          await gatewayManager.stop();
        }
        electron.app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
}
electron.app.whenReady().then(async () => {
  console.log("[Main] App ready. Setting up resources...");
  await ResourceManager.setupResources();
  const window = await createWindow();
  createTray();
  gatewayManager = new GatewayManager((url) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send("gateway-ready", url);
    }
  });
  gatewayManager.start();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow == null ? void 0 : mainWindow.show();
    }
  });
});
electron.app.on("window-all-closed", () => {
});
