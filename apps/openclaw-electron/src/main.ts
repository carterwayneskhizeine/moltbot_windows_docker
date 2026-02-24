import { TabManager } from './tab-manager'

export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

let tabManager: TabManager | null = null

async function initializeFrontend() {
  const electronAPI = (window as unknown as { electronAPI: any }).electronAPI

  // 初始化 Tab
  tabManager = new TabManager()

  if (!electronAPI || !electronAPI.gateway) {
    console.warn('不在 Electron 环境中')
    return
  }

  // 可在后台查看 Gateway 启动状态日志
  electronAPI.gateway.onStateChanged((state: GatewayState) => {
    console.log('[Frontend Gateway Status]:', state)
  })
}

// Kickoff
initializeFrontend()
