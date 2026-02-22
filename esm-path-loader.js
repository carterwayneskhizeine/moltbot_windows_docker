/**
 * ESM Path Loader
 *
 * This module extends the ESM module resolution paths to allow the Gateway
 * to find dependencies in the unpacked node_modules directory.
 *
 * This is used when running the Gateway as a subprocess from the packaged
 * Electron app, where the code is in resources/app but dependencies are in
 * resources/app.asar.unpacked/node_modules.
 *
 * Usage: node -r ./esm-path-loader.js index.js gateway
 */

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const appUnpackedDir = path.join(process.resourcesPath, 'app.asar.unpacked');
const nodeModulesPath = path.join(appUnpackedDir, 'node_modules');

try {
  const _nodeModulesUrl = pathToFileURL(nodeModulesPath).href;
  
  if (!import.meta.paths.includes(nodeModulesPath)) {
    import.meta.paths.push(nodeModulesPath);
  }
  
  console.log('[ESM Path Loader] Added to import.meta.paths:', nodeModulesPath);
} catch (err) {
  console.error('[ESM Path Loader] Failed to add path:', err);
}
