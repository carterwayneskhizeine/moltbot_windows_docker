const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const tar = require('tar');

const NODE_VERSION = 'v24.13.1';
const BUNDLED_DIR = path.join(__dirname, '..', 'bundled');
const NODE_DIR = path.join(BUNDLED_DIR, 'node');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

function getSystemInfo() {
  const platform = process.platform;
  const arch = process.arch;

  let osName = '';
  let ext = 'tar.gz';

  if (platform === 'win32') {
    osName = 'win';
    ext = 'zip';
  } else if (platform === 'darwin') {
    osName = 'darwin';
  } else {
    osName = 'linux';
  }

  const dirname = `node-${NODE_VERSION}-${osName}-${arch}`;
  const filename = `${dirname}.${ext}`;
  const url = `https://nodejs.org/dist/${NODE_VERSION}/${filename}`;

  return { osName, arch, ext, dirname, filename, url };
}

async function run() {
  if (!fs.existsSync(BUNDLED_DIR)) fs.mkdirSync(BUNDLED_DIR, { recursive: true });

  const { osName, ext, dirname, filename, url } = getSystemInfo();
  const archivePath = path.join(BUNDLED_DIR, filename);

  const finalNodeExe = osName === 'win' 
    ? path.join(NODE_DIR, 'node.exe') 
    : path.join(NODE_DIR, 'node');

  if (fs.existsSync(finalNodeExe)) {
    console.log(`[Prepare Node] Node.js ${NODE_VERSION} already exists at ${finalNodeExe}`);
    return;
  }

  console.log(`[Prepare Node] Target OS: ${osName}, Arch: ${process.arch}`);
  console.log(`[Prepare Node] Downloading Node.js from ${url}...`);

  if (!fs.existsSync(archivePath)) {
    await downloadFile(url, archivePath);
    console.log(`[Prepare Node] Download complete.`);
  } else {
    console.log(`[Prepare Node] Archive ${filename} already exists.`);
  }

  console.log(`[Prepare Node] Extracting...`);
  
  const extractTemp = path.join(BUNDLED_DIR, 'extract_temp');
  if (fs.existsSync(extractTemp)) fs.rmdirSync(extractTemp, { recursive: true });
  fs.mkdirSync(extractTemp, { recursive: true });

  if (ext === 'zip') {
    // Use PowerShell on Windows to extract zip
    console.log('[Prepare Node] Unzipping using PowerShell...');
    execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${extractTemp}' -Force"`, { stdio: 'inherit' });
  } else {
    // Use tar npm package for tar.gz
    await tar.x({
      file: archivePath,
      cwd: extractTemp
    });
  }

  // Move the extracted folder to `node`
  const extractedSrc = path.join(extractTemp, dirname);
  if (fs.existsSync(NODE_DIR)) fs.rmdirSync(NODE_DIR, { recursive: true });
  
  fs.renameSync(extractedSrc, NODE_DIR);

  // Cleanup
  fs.rmdirSync(extractTemp, { recursive: true });
  fs.unlinkSync(archivePath);

  console.log(`[Prepare Node] Successfully prepared Node.js in ${NODE_DIR}`);
}

run().catch(err => {
  console.error('[Prepare Node] Error:', err);
  process.exit(1);
});
