/**
 * prepare-openclaw.js — 从本地仓库构建并复制 OpenClaw 到 bundled/openclaw/
 *
 * 完全基于当前仓库的本地源代码，不从 npm 下载。
 *
 * 流程：
 *   1. 检查 dist/entry.js 是否存在（跳过重复准备）
 *   2. 在仓库根目录执行 pnpm build
 *   3. 清空 bundled/openclaw/ 目录
 *   4. 复制 dist/ + openclaw.mjs + package.json
 *   5. npm install --production
 *   6. 清理非必要文件
 *   7. 验证
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// apps/openclaw-electron/scripts/ → monorepo 根目录
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const TARGET_DIR = path.join(__dirname, '..', 'bundled', 'openclaw')

function getDirSize(dirPath) {
  let totalSize = 0
  if (!fs.existsSync(dirPath)) return 0
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) totalSize += getDirSize(fullPath)
    else if (entry.isFile()) totalSize += fs.statSync(fullPath).size
  }
  return totalSize
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) copyDirSync(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}

function cleanupDir(dir) {
  let totalRemoved = 0
  if (!fs.existsSync(dir)) return 0

  const REMOVE_DIRS = new Set(['test', 'tests', '__tests__', '.github', 'example', 'examples'])
  const REMOVE_FILES = new Set(['changelog.md', 'history.md'])

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (REMOVE_DIRS.has(entry.name)) {
        fs.rmSync(fullPath, { recursive: true, force: true })
        totalRemoved++
        continue
      }
      totalRemoved += cleanupDir(fullPath)
    } else if (entry.isFile()) {
      const name = entry.name.toLowerCase()
      if (REMOVE_FILES.has(name) || name.endsWith('.map')) {
        fs.unlinkSync(fullPath)
        totalRemoved++
      }
    }
  }
  return totalRemoved
}

async function main() {
  console.log('=== 准备 OpenClaw（本地仓库源码）===\n')
  console.log(`仓库根目录: ${REPO_ROOT}`)
  console.log(`目标目录: ${TARGET_DIR}\n`)

  // 检查是否已准备就绪
  const entryJs = path.join(TARGET_DIR, 'dist', 'entry.js')
  if (fs.existsSync(entryJs)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(TARGET_DIR, 'package.json'), 'utf-8'))
    console.log(`openclaw@${pkg.version} 已准备就绪`)
    console.log('跳过（如需重新准备，请删除 bundled/openclaw/ 目录）\n')
    return
  }

  // Step 1: 验证仓库根 package.json
  const repoPkg = path.join(REPO_ROOT, 'package.json')
  if (!fs.existsSync(repoPkg)) {
    console.error(`错误: 未找到仓库 package.json: ${repoPkg}`)
    process.exit(1)
  }
  const pkg = JSON.parse(fs.readFileSync(repoPkg, 'utf-8'))
  if (pkg.name !== 'openclaw') {
    console.error(`错误: 期望仓库名称为 "openclaw"，实际为 "${pkg.name}"`)
    process.exit(1)
  }
  console.log(`仓库: openclaw@${pkg.version}`)

  // Step 2: 检查 dist/ 是否已有构建产物，没有则构建
  const distEntry = path.join(REPO_ROOT, 'dist', 'entry.js')
  if (!fs.existsSync(distEntry)) {
    console.log('\n正在构建 OpenClaw 源码（pnpm build）...')
    console.log('这可能需要几分钟...\n')
    execSync('pnpm build', {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    })
    console.log('\n构建完成!')
  } else {
    console.log('dist/entry.js 已存在，跳过构建（如需重新构建请先运行 pnpm build）')
  }

  // Step 3: 清空并创建目标目录
  console.log('\n清空目标目录...')
  if (fs.existsSync(TARGET_DIR)) {
    fs.rmSync(TARGET_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(TARGET_DIR, { recursive: true })

  // Step 4: 复制构建产物
  console.log('复制构建产物...')

  // 复制 dist/
  copyDirSync(path.join(REPO_ROOT, 'dist'), path.join(TARGET_DIR, 'dist'))
  console.log('  ✓ dist/')

  // 复制 openclaw.mjs
  fs.copyFileSync(
    path.join(REPO_ROOT, 'openclaw.mjs'),
    path.join(TARGET_DIR, 'openclaw.mjs'),
  )
  console.log('  ✓ openclaw.mjs')

  // 复制 package.json（去掉 devDependencies 以减小体积）
  const cleanPkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: pkg.type,
    main: pkg.main,
    bin: pkg.bin,
    dependencies: pkg.dependencies,
    engines: pkg.engines,
  }
  fs.writeFileSync(
    path.join(TARGET_DIR, 'package.json'),
    JSON.stringify(cleanPkg, null, 2),
    'utf-8',
  )
  console.log('  ✓ package.json')

  // Step 5: 安装生产依赖
  console.log('\n安装生产依赖（npm install --production）...')
  console.log('这可能需要几分钟...\n')
  execSync('npm install --production --ignore-scripts', {
    cwd: TARGET_DIR,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  })
  console.log('\n依赖安装完成!')

  // Step 6: 清理非必要文件
  console.log('\n清理非必要文件...')
  const nodeModulesDir = path.join(TARGET_DIR, 'node_modules')
  if (fs.existsSync(nodeModulesDir)) {
    const removed = cleanupDir(nodeModulesDir)
    console.log(`  已清理 ${removed} 个文件/目录`)
  }

  // Step 7: 验证
  if (!fs.existsSync(entryJs)) {
    console.error(`\n错误: 未找到入口文件 ${entryJs}`)
    process.exit(1)
  }

  const totalSize = getDirSize(TARGET_DIR)
  console.log(`\nopenclaw 目录大小: ${(totalSize / 1024 / 1024).toFixed(1)} MB`)
  console.log('OpenClaw 准备完成!\n')
}

main().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
