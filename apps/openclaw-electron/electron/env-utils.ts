import os from 'node:os'
import path from 'node:path'

/**
 * 构造用于启动子进程（特别是 Gateway 或 PTY）的安全隔离环境。
 * 强制注入必要的系统路径，避免因用户本地 PATH 混乱导致找不到基础命令（如 PowerShell）。
 */
export function buildSafeEnvironment(existingEnv: typeof process.env): Record<string, string> {
  // 获取现有的 PATH (Windows 区分 PATH 和 Path)
  let envPath = existingEnv.Path || existingEnv.PATH || ''

  // 1. 对于 Windows 系统，强行补充基础系统路径以作为兜底防护
  if (process.platform === 'win32') {
    const requiredPaths = [
      'C:\\Windows\\System32',
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0', // 确保 PowerShell 永远可用
      'C:\\Windows',
      'C:\\Windows\\System32\\Wbem',
    ]

    // 过滤掉已经在 PATH 中的路径防止无限膨胀
    const currentPaths = envPath.split(';').filter(Boolean)
    // 把必须要的系统路径放在前面，确保基础命令的优先级和可用性
    const finalPaths = [...requiredPaths, ...currentPaths]
    // 去重并按 ; 组合
    envPath = Array.from(new Set(finalPaths)).join(';')
  }

  // 2. 将 OpenClaw 内置的 Node 运行时加到环境变量的最前方
  // 劫持默认调用，实现环境隔离
  // const openClawBin = path.join(os.homedir(), '.openclaw', 'bin');
  // envPath = `${openClawBin}${path.delimiter}${envPath}`;

  return {
    ...existingEnv,
    PATH: envPath,
    Path: envPath,
  } as Record<string, string>
}
