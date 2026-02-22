const { execSync } = require('child_process');
const path = require('path');

const cwd = path.join(__dirname, '..');

function runCommand(command) {
    console.log(`\n> ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
}

console.log('=== Building OpenClaw Electron Installer ===');

try {
    console.log('\n--- Step 1: Prepare Node.js Runtime ---');
    runCommand('npm run prepare:node');

    console.log('\n--- Step 2: Prepare OpenClaw Resources ---');
    runCommand('npm run prepare:openclaw');

    console.log('\n--- Step 3: Build Frontend & Electron Main Process ---');
    runCommand('npm run build');

    console.log('\n--- Step 4: Build Desktop Installer ---');
    runCommand('npx electron-builder -w');

    console.log('\n=== Build Completed Successfully ===');
} catch (error) {
    console.error(`\n[Build Failed]: ${error.message}`);
    process.exit(1);
}
