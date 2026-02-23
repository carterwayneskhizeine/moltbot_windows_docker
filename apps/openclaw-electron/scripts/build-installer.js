/**
 * build-installer.js — 完整构建流程
 *
 * 步骤:
 *   1. prepare-node.js     — 下载 Node.js 运行时
 *   2. prepare-openclaw.js — 从本地仓库构建并复制 OpenClaw
 *   3. vite build          — 编译 Electron 主进程
 *   4. electron-builder    — 打包成 NSIS 安装包（或只生成 unpacked 目录）
 *
 * 用法:
 *   npm run build:installer          # 完整打包（生成 .exe 安装程序）
 *   npm run build:installer-unpacked # 只生成 win-unpacked（不打包 exe，速度更快）
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const ROOT = path.join(__dirname, '..')

// --unpacked 参数或 UNPACKED_ONLY=1 环境变量：只生成 win-unpacked，不打包 exe
const UNPACKED_ONLY = process.argv.includes('--unpacked') || process.env.UNPACKED_ONLY === '1'

function run(cmd, label) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${label}`)
  console.log(`${'='.repeat(60)}\n`)
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env } })
  } catch (err) {
    console.error(`\n❌ 构建步骤失败: ${label}`)
    console.error(err.message)
    process.exit(1)
  }
}

function checkPrerequisites() {
  console.log('检查构建环境...\n')

  const nodeVersion = process.version
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10)
  if (major < 18) {
    console.error(`需要 Node.js >= 18，当前版本: ${nodeVersion}`)
    process.exit(1)
  }
  console.log(`  Node.js: ${nodeVersion}`)

  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim()
    console.log(`  npm: ${npmVersion}`)
  } catch {
    console.error('未找到 npm')
    process.exit(1)
  }

  if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
    console.log('\n正在安装项目依赖...')
    run('npm install', '安装项目依赖')
  }

  console.log('\n✓ 环境检查通过!\n')
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║    OpenClaw Desktop — 安装包构建工具     ║
  ╚══════════════════════════════════════════╝
  `)

  checkPrerequisites()

  run('node scripts/prepare-node.js', '步骤 1/4: 下载 Node.js 运行时')
  run('node scripts/prepare-openclaw.js', '步骤 2/4: 准备 OpenClaw（本地源码）')
  run('npx vite build', '步骤 3/4: 编译前端 + Electron 主进程')

  if (UNPACKED_ONLY) {
    run(
      'npx electron-builder --win --dir --config electron-builder.yml',
      '步骤 4/4: 生成 win-unpacked 目录（快速测试模式，跳过 NSIS 打包）',
    )
  } else {
    run(
      'npx electron-builder --win --config electron-builder.yml',
      '步骤 4/4: 打包 NSIS 安装包',
    )
  }

  if (UNPACKED_ONLY) {
    const unpackedDir = path.join(ROOT, 'release', 'win-unpacked')
    console.log(`
  ╔══════════════════════════════════════════════════╗
  ║           ✅ 构建完成（快速测试模式）             ║
  ╠══════════════════════════════════════════════════╣
  ║  Unpacked 目录: release/win-unpacked/            ║
  ║  运行: release\\win-unpacked\\OpenClaw.exe       ║
  ╚══════════════════════════════════════════════════╝
    `)
    if (fs.existsSync(unpackedDir)) {
      const exe = path.join(unpackedDir, 'OpenClaw.exe')
      if (fs.existsSync(exe)) {
        const stats = fs.statSync(exe)
        console.log(`  OpenClaw.exe: ${(stats.size / 1024 / 1024).toFixed(1)} MB`)
      }
    }
  } else {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║           ✅ 构建完成！                   ║
  ╠══════════════════════════════════════════╣
  ║  安装包位于: release/ 目录               ║
  ╚══════════════════════════════════════════╝
    `)
    const releaseDir = path.join(ROOT, 'release')
    if (fs.existsSync(releaseDir)) {
      const files = fs.readdirSync(releaseDir).filter((f) => f.endsWith('.exe'))
      if (files.length > 0) {
        console.log('生成的安装包:')
        for (const file of files) {
          const stats = fs.statSync(path.join(releaseDir, file))
          console.log(`  ${file} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`)
        }
      }
    }
  }
}

main().catch((err) => {
  console.error('构建失败:', err.message)
  process.exit(1)
})
