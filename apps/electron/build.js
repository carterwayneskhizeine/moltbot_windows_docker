/**
 * Simple build script for Electron app
 * Compiles TypeScript to JavaScript
 */

import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function build() {
  console.log('Building OpenClaw Electron...');

  // Run tsc
  try {
    await execAsync('npx tsc', {
      cwd: __dirname,
      stdio: 'inherit',
    });
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
