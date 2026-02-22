const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const tar = require('tar');

const BUNDLED_DIR = path.join(__dirname, '..', 'bundled');
const TEMP_DIR = path.join(__dirname, '..', 'openclaw_temp');
const TARGET_TAR = path.join(BUNDLED_DIR, 'openclaw.tar.gz');

async function run() {
  if (!fs.existsSync(BUNDLED_DIR)) fs.mkdirSync(BUNDLED_DIR, { recursive: true });
  if (fs.existsSync(TEMP_DIR)) fs.rmSync(TEMP_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  console.log('[Prepare OpenClaw] Packing local workspace root...');
  // The root 'openclaw' package is 3 directories up: apps/openclaw-electron/scripts/.. -> apps/openclaw-electron -> apps -> root
  const workspaceRoot = path.join(__dirname, '..', '..', '..');
  
  execSync(`npm pack "${workspaceRoot}" --pack-destination "${TEMP_DIR}"`, { stdio: 'inherit' });

  // Find the generated tgz file
  const files = fs.readdirSync(TEMP_DIR);
  const tgzFile = files.find(f => f.endsWith('.tgz'));
  if (!tgzFile) throw new Error('Failed to find generated .tgz file');

  const archivePath = path.join(TEMP_DIR, tgzFile);

  console.log('[Prepare OpenClaw] Extracting package...');
  await tar.x({
    file: archivePath,
    cwd: TEMP_DIR
  });

  const packageDir = path.join(TEMP_DIR, 'package');

  console.log('[Prepare OpenClaw] Installing production dependencies...');
  try {
    execSync(`npm install --production --ignore-scripts --no-package-lock`, { cwd: packageDir, stdio: 'inherit' });
  } catch(e) {
    console.warn('[Prepare OpenClaw] NPM install completed with warnings/errors. Continuing...');
  }

  console.log('[Prepare OpenClaw] Cleaning up unnecessary files...');
  const toDelete = ['test', 'tests', '__tests__', '.github', 'example', 'examples', 'changelog.md', 'history.md', 'README.md'];
  for (const item of toDelete) {
    const p = path.join(packageDir, item);
    const pUpper = path.join(packageDir, item.toUpperCase());
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true });
    if (fs.existsSync(pUpper)) fs.rmSync(pUpper, { recursive: true });
  }

  function removeMapFiles(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            removeMapFiles(fullPath);
        } else if (fullPath.endsWith('.map')) {
            fs.unlinkSync(fullPath);
        }
    }
  }
  removeMapFiles(packageDir);

  // Rename "package" to "openclaw" to match our target extraction
  const openclawDir = path.join(TEMP_DIR, 'openclaw');
  fs.renameSync(packageDir, openclawDir);

  console.log('[Prepare OpenClaw] Creating final bundle openclaw.tar.gz...');
  await tar.c(
    {
      gzip: true,
      file: TARGET_TAR,
      cwd: TEMP_DIR
    },
    ['openclaw']
  );

  console.log('[Prepare OpenClaw] Cleaning up temporary files...');
  fs.rmSync(TEMP_DIR, { recursive: true });

  console.log(`[Prepare OpenClaw] Successfully prepared ${TARGET_TAR}`);
}

run().catch(err => {
  console.error('[Prepare OpenClaw] Error:', err);
  process.exit(1);
});
