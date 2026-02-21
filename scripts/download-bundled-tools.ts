#!/usr/bin/env node
/**
 * Download Bundled Tools Script
 *
 * Downloads and extracts portable versions of Node.js, Python, Git, and FFmpeg
 * for bundling with the OpenClaw Electron application.
 *
 * Usage:
 *   node --import tsx scripts/download-bundled-tools.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { createReadStream, createWriteStream } from 'node:fs';
import { createUnzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ToolDownloadInfo {
  name: string;
  version: string;
  url: string;
  extractDir: string;
  targetDir: string;
}

// Download URLs for Windows portable tools
const TOOLS: ToolDownloadInfo[] = [
  {
    name: 'nodejs',
    version: 'v24.13.1',
    url: 'https://nodejs.org/dist/v24.13.1/node-v24.13.1-win-x64.zip',
    extractDir: 'node-v24.13.1-win-x64',
    targetDir: 'bundled-tools/nodejs',
  },
  {
    name: 'python',
    version: '3.12.8',
    url: 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip',
    extractDir: 'python-3.12.8-embed-amd64',
    targetDir: 'bundled-tools/python',
  },
  {
    name: 'git',
    version: '2.48.1',
    url: 'https://github.com/git-for-windows/git/releases/download/v2.48.1.windows.1/MinGit-2.48.1-64-bit.zip',
    extractDir: 'mingit64',
    targetDir: 'bundled-tools/git',
  },
  {
    name: 'ffmpeg',
    version: '7.1',
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip',
    extractDir: 'ffmpeg-master-latest-win64-gpl',
    targetDir: 'bundled-tools/ffmpeg',
  },
];

const ROOT_DIR = path.join(__dirname, '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'bundled-tools');

/**
 * Download a file with progress
 */
async function downloadFile(
  url: string,
  destPath: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  console.log(`Downloading: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
  }

  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  // Ensure directory exists
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const fileStream = createWriteStream(destPath);
  let current = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    current += value.length;
    onProgress?.(current, total);

    fileStream.write(value);
  }

  fileStream.end();
}

/**
 * Extract a ZIP archive using tar (on Windows) or unzip (on Unix)
 */
async function extractZip(
  zipPath: string,
  targetDir: string,
  extractSubdir?: string,
): Promise<void> {
  console.log(`Extracting: ${zipPath} -> ${targetDir}`);

  await fs.promises.mkdir(targetDir, { recursive: true });

  // Extract to a temporary directory first
  const tempDir = path.join(targetDir, '.temp_extract');

  // Use tar on Windows (built into Windows 10+), unzip on Unix
  const isWindows = process.platform === 'win32';
  const tarPath = path.join(ROOT_DIR, 'resources', 'nodejs', 'node_modules', 'npm', 'bin', 'node.exe');

  // Try using tar (available on Windows 10+ and Unix)
  const tarCmd = isWindows
    ? `tar -xf "${zipPath}" -C "${tempDir}"`
    : `unzip -q "${zipPath}" -d "${tempDir}"`;

  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    await execAsync(tarCmd, { maxBuffer: 10 * 1024 * 1024 });
  } catch (err) {
    // If tar fails, try using PowerShell on Windows
    if (isWindows) {
      try {
        await execAsync(
          `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`,
          { maxBuffer: 10 * 1024 * 1024 }
        );
      } catch (psErr) {
        throw new Error(`Failed to extract ZIP: ${psErr}`);
      }
    } else {
      throw err;
    }
  }

  // If there's a subdirectory to extract, move its contents
  if (extractSubdir) {
    const sourceDir = path.join(tempDir, extractSubdir);

    if (!fs.existsSync(sourceDir)) {
      // Subdirectory not found, check if files are directly in temp dir
      // (This happens with Python embed zip)
      const entries = fs.readdirSync(tempDir);
      console.log(`Note: Expected subdirectory '${extractSubdir}' not found, using root contents instead`);

      // Move everything from temp dir to target dir
      for (const entry of entries) {
        const srcPath = path.join(tempDir, entry);
        const destPath = path.join(targetDir, entry);

        await fs.promises.rename(srcPath, destPath);
      }
    } else {
      // Move contents from subdirectory to target directory
      const entries = await fs.promises.readdir(sourceDir);

      for (const entry of entries) {
        const srcPath = path.join(sourceDir, entry);
        const destPath = path.join(targetDir, entry);

        await fs.promises.rename(srcPath, destPath);
      }
    }

    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  } else {
    // Move everything from temp dir to target dir
    const entries = await fs.promises.readdir(tempDir);

    for (const entry of entries) {
      const srcPath = path.join(tempDir, entry);
      const destPath = path.join(targetDir, entry);

      await fs.promises.rename(srcPath, destPath);
    }

    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Download and extract a tool
 */
async function downloadTool(tool: ToolDownloadInfo): Promise<void> {
  const cacheDir = CACHE_DIR;
  const zipFileName = `${tool.name}-${tool.version}.zip`;
  const zipPath = path.join(cacheDir, zipFileName);
  const targetDir = path.join(ROOT_DIR, tool.targetDir);

  // Check if already extracted
  const markerFile = path.join(targetDir, '.tool-version');

  if (fs.existsSync(markerFile)) {
    const installedVersion = await fs.promises.readFile(markerFile, 'utf-8');

    if (installedVersion === tool.version) {
      console.log(`${tool.name} ${tool.version} already installed`);
      return;
    }
  }

  // Download if not cached
  if (!fs.existsSync(zipPath)) {
    await fs.promises.mkdir(cacheDir, { recursive: true });

    await downloadFile(
      tool.url,
      zipPath,
      (current, total) => {
        if (total > 0) {
          const percent = ((current / total) * 100).toFixed(1);
          process.stdout.write(`\r${tool.name}: ${percent}% (${(current / 1024 / 1024).toFixed(1)} MB / ${(total / 1024 / 1024).toFixed(1)} MB)`);
        } else {
          process.stdout.write(`\r${tool.name}: ${(current / 1024 / 1024).toFixed(1)} MB downloaded`);
        }
      },
    );

    console.log(); // New line after progress
  } else {
    console.log(`${tool.name} archive already cached`);
  }

  // Extract
  await extractZip(zipPath, targetDir, tool.extractDir);

  // Write version marker
  await fs.promises.writeFile(markerFile, tool.version);

  console.log(`${tool.name} ${tool.version} installed successfully`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('OpenClaw Bundled Tools Downloader');
  console.log('================================\n');

  for (const tool of TOOLS) {
    try {
      await downloadTool(tool);
    } catch (err) {
      console.error(`Failed to download ${tool.name}:`, err);
      process.exit(1);
    }
  }

  console.log('\nAll tools downloaded successfully!');
}

// Run
main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
