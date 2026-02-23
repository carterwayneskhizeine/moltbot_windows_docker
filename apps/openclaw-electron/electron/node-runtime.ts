import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

/**
 * 获取内嵌的 Node.js 运行时路径
 *
 * 生产环境：使用 bundled/node/node.exe
 * 开发环境：优先 bundled 目录，再回退到系统 node
 */
export function getNodePath(): string {
  if (app.isPackaged) {
    const nodeBin = process.platform === 'win32' ? 'node.exe' : 'node'
    return path.join(process.resourcesPath, 'bundled', 'node', nodeBin)
  }

  // 开发环境：检查 bundled 目录
  const devBundled = path.join(
    __dirname,
    '..',
    'bundled',
    'node',
    process.platform === 'win32' ? 'node.exe' : 'node',
  )
  if (fs.existsSync(devBundled)) {
    return devBundled
  }

  // 回退到系统 node
  return process.execPath.includes('electron') ? 'node' : process.execPath
}

/**
 * 获取 openclaw 安装目录路径
 *
 * 生产环境：process.resourcesPath/bundled/openclaw
 * 开发环境：优先 bundled/openclaw，再回退到仓库根目录
 */
export function getOpenclawPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bundled', 'openclaw')
  }

  // 开发环境：
  // 1. 本地 bundled/openclaw 目录（prepare-openclaw.js 生成）
  const devBundled = path.join(__dirname, '..', 'bundled', 'openclaw')
  if (fs.existsSync(path.join(devBundled, 'package.json'))) {
    return devBundled
  }

  // 2. 仓库根目录（直接使用 monorepo 源码的构建产物）
  //    __dirname in dev = apps/openclaw-electron/dist-electron/
  const repoRoot = path.resolve(__dirname, '..', '..', '..')
  if (fs.existsSync(path.join(repoRoot, 'dist', 'entry.js'))) {
    return repoRoot
  }

  // 3. 回退
  return devBundled
}

/**
 * 检查 Node.js 运行时是否存在
 */
export function isNodeRuntimeAvailable(): boolean {
  const nodePath = getNodePath()
  if (nodePath === 'node') return true
  return fs.existsSync(nodePath)
}

/**
 * 检查 openclaw 是否已安装
 */
export function isOpenclawInstalled(): boolean {
  const openclawPath = getOpenclawPath()
  return fs.existsSync(path.join(openclawPath, 'package.json'))
}
