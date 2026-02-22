import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const electronDir = path.resolve(__dirname, '..', 'apps', 'electron');
const nodeModulesSrc = path.join(rootDir, 'node_modules');
const nodeModulesTar = path.join(electronDir, 'node_modules.tar.gz');

async function createNodeModulesTar() {
  if (!fs.existsSync(nodeModulesSrc)) {
    console.log('node_modules not found, skipping');
    return;
  }

  // Check if tar already exists and is newer than node_modules
  try {
    const srcStat = fs.statSync(nodeModulesSrc);
    const tarStat = fs.statSync(nodeModulesTar);
    if (tarStat.mtime > srcStat.mtime) {
      console.log('node_modules.tar.gz already up to date');
      return;
    }
  } catch {
    // Continue
  }

  console.log('Creating node_modules.tar.gz...');

  return new Promise((resolve, reject) => {
    const tar = spawn('tar', [
      '-czf', nodeModulesTar,
      '--exclude=.pnpm',
      '--exclude=.bin',
      '-C', rootDir, 'node_modules', '.'
    ], { stdio: 'inherit' });

    tar.on('close', (code) => {
      if (code === 0) {
        console.log('Created node_modules.tar.gz');
        resolve(true);
      } else {
        reject(new Error(`tar exited with code ${code}`));
      }
    });
  });
}

createNodeModulesTar().catch(console.error);
