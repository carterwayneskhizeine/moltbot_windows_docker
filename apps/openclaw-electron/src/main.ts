import { TabManager } from './tab-manager'

export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

let tabManager: TabManager | null = null

async function waitForGateway() {
  const electronAPI = (window as unknown as { electronAPI: any }).electronAPI

  // 无论是否启动 Gateway 完毕，都立即初始化 Tab。因为 Gateway 现在是显示在终端里的
  tabManager = new TabManager()

  if (!electronAPI || !electronAPI.gateway) {
    console.warn('不在 Electron 环境中')
    return
  }

  // 监听后续状态变化（仅用于调试或将来扩展底部状态栏，界面现在以终端为主）
  electronAPI.gateway.onStateChanged((state: GatewayState) => {
    console.log('[Frontend Gateway Status]:', state)
  })
}

// Kickoff
waitForGateway()
