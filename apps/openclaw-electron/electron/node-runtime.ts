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
      // In development, point to the openclaw module within the monorepo
      // Adjust path if needed. Defaulting to assuming openclaw is installed and resolvable
      const searchPaths = [
        path.resolve(process.cwd(), 'node_modules', 'openclaw', 'dist', 'entry.js'),
        path.resolve(process.cwd(), '..', '..', 'node_modules', 'openclaw', 'dist', 'entry.js')
      ];
      
      for (const p of searchPaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
      return 'openclaw'; // fallback to global bin
    }

    // In production, it is extracted to userData
    // e.g. %APPDATA%/OpenClaw/resources/openclaw/dist/entry.js
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'resources', 'openclaw', 'dist', 'entry.js');
  }
}
