import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export class NodeRuntime {
  private static isPackaged = app.isPackaged;

  /**
   * Get the Node.js executable path depending on environment
   */
  static getNodePath(): string {
    if (!this.isPackaged) {
      // In development, use the electron's built-in node, or system node
      return process.env.NODE_PATH || 'node';
    }

    // In production, use the bundled node
    const isWindows = process.platform === 'win32';
    const nodeExecutable = isWindows ? 'node.exe' : 'node';
    
    // extraResources are located in process.resourcesPath
    // Our electron-builder config puts them in: resources/bundled/node/
    const bundledNodePath = path.join(process.resourcesPath, 'bundled', 'node', nodeExecutable);
    
    if (fs.existsSync(bundledNodePath)) {
      return bundledNodePath;
    }
    
    console.warn(`[NodeRuntime] Bundled Node.js not found at ${bundledNodePath}, falling back to system node`);
    return 'node';
  }

  /**
   * Get the OpenClaw entry point path depending on environment
   */
  static getOpenClawEntryPath(): string {
    if (!this.isPackaged) {
      // In development: this repo IS the openclaw monorepo.
      // The electron app lives at apps/openclaw-electron, so the workspace root
      // is 2 levels up. Point directly to the root's openclaw.mjs (the bin entry).
      const workspaceRoot = path.resolve(process.cwd(), '..', '..');
      const entryPath = path.join(workspaceRoot, 'openclaw.mjs');

      if (fs.existsSync(entryPath)) {
        console.log(`[NodeRuntime] Dev mode: using workspace root entry → ${entryPath}`);
        return entryPath;
      }

      // Secondary fallback: try relative to __dirname (dist-electron/ at runtime)
      const alt = path.resolve(__dirname, '..', '..', '..', 'openclaw.mjs');
      if (fs.existsSync(alt)) {
        return alt;
      }

      console.warn('[NodeRuntime] Could not locate openclaw.mjs in workspace root. Falling back to global "openclaw" command.');
      return 'openclaw'; // fallback to global bin
    }

    // In production, it is extracted to userData
    // e.g. %APPDATA%/OpenClaw/resources/openclaw/dist/entry.js
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'resources', 'openclaw', 'dist', 'entry.js');
  }
}
