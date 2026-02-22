import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export interface StartCommand {
  /** The executable to spawn (e.g. 'pnpm', 'node', 'C:\...\node.exe') */
  command: string;
  /** Arguments to pass to the executable */
  args: string[];
  /** Working directory for the spawned process */
  cwd: string;
}

export class NodeRuntime {
  private static get isPackaged() {
    return app.isPackaged;
  }

  /**
   * Returns the full command needed to start the OpenClaw Gateway.
   *
   * Dev  : pnpm openclaw gateway start  (cwd = workspace root)
   * Prod : bundledNode openclaw.mjs gateway start  (cwd = extracted openclaw dir)
   */
  static getGatewayStartCommand(): StartCommand {
    if (!this.isPackaged) {
      // Workspace root is 2 levels above apps/openclaw-electron
      const workspaceRoot = path.resolve(process.cwd(), '..', '..');
      console.log(`[NodeRuntime] Dev mode → pnpm openclaw gateway start (cwd: ${workspaceRoot})`);
      return {
        command: 'pnpm',
        args: ['openclaw', 'gateway', 'start'],
        cwd: workspaceRoot,
      };
    }

    // Production: use bundled Node.js + extracted openclaw package
    const isWindows = process.platform === 'win32';
    const nodeExecutable = isWindows ? 'node.exe' : 'node';
    const bundledNodePath = path.join(process.resourcesPath, 'bundled', 'node', nodeExecutable);

    const nodePath = fs.existsSync(bundledNodePath)
      ? bundledNodePath
      : 'node'; // fallback to system node

    const userDataPath = app.getPath('userData');
    const openClawDir = path.join(userDataPath, 'resources', 'openclaw');
    const entryPath = path.join(openClawDir, 'openclaw.mjs');

    console.log(`[NodeRuntime] Prod mode → ${nodePath} openclaw.mjs gateway start (cwd: ${openClawDir})`);
    return {
      command: nodePath,
      args: [entryPath, 'gateway', 'start'],
      cwd: openClawDir,
    };
  }
}
