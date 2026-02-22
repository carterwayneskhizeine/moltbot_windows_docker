import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import * as tar from 'tar';

export class ResourceManager {
  static getResourcesPath(): string {
    return path.join(app.getPath('userData'), 'resources');
  }

  static getExtractedOpenClawPath(): string {
    return path.join(this.getResourcesPath(), 'openclaw');
  }

  /**
   * Extrac the bundled tar.gz to the user data directory if needed
   */
  static async setupResources(): Promise<void> {
    if (!app.isPackaged) {
      console.log('[ResourceManager] Development mode, skipping resource extraction.');
      return;
    }

    const resourcesPath = this.getResourcesPath();
    const openClawDestPath = this.getExtractedOpenClawPath();
    const bundledArchive = path.join(process.resourcesPath, 'bundled', 'openclaw.tar.gz');

    if (!fs.existsSync(bundledArchive)) {
      console.warn(`[ResourceManager] Archive not found at ${bundledArchive}. Ensure it is packed correctly.`);
      return;
    }

    const entryExists = fs.existsSync(path.join(openClawDestPath, 'dist', 'entry.js'));

    // Check version.json in a mature system, but here we just check if entry.js is there
    if (entryExists) {
      console.log('[ResourceManager] OpenClaw resources already present and seem valid.');
      return;
    }

    console.log('[ResourceManager] Extracting bundled OpenClaw to user data...');
    
    // Ensure destiny dir exists
    if (!fs.existsSync(openClawDestPath)) {
      fs.mkdirSync(openClawDestPath, { recursive: true });
    }

    try {
      // Use pure JS tar to extract, safely cross-platform.
      await tar.x({
        file: bundledArchive,
        cwd: openClawDestPath,
        // Depending on how prepare_openclaw packages it, you might need strip: 1
        // Usually `tar -czf file.tar.gz -C bundled openclaw` puts an `openclaw` folder inside
        // So we strip that top-level folder to map perfectly to openClawDestPath
        strip: 1 
      });
      console.log('[ResourceManager] Extraction complete.');
      
      this.createCommandLinks();
    } catch (err) {
      console.error('[ResourceManager] Failed to extract archive:', err);
    }
  }

  /**
   * Creates openclaw.cmd (Windows) or an executable script (macOS/Linux).
   */
  static createCommandLinks() {
    const resourcesPath = this.getResourcesPath();
    if (process.platform === 'win32') {
        const cmdPath = path.join(resourcesPath, 'openclaw.cmd');
        const script = `@ECHO OFF\r\nnode "%~dp0\\openclaw\\dist\\entry.js" %*`;
        fs.writeFileSync(cmdPath, script, 'utf8');
        console.log(`[ResourceManager] Created command link at ${cmdPath}`);
    } else {
        const binPath = path.join(resourcesPath, 'openclaw');
        const script = `#!/bin/sh\nnode "$(dirname "$0")/openclaw/dist/entry.js" "$@"`;
        fs.writeFileSync(binPath, script, { encoding: 'utf8', mode: 0o755 });
        console.log(`[ResourceManager] Created command link at ${binPath}`);
    }
  }
}
