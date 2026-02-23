// Renderer entry point

import { TabManager } from './tab-manager'

export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

const statusEl = document.getElementById('status')!
const loadingBox = document.getElementById('gateway-loading')!
let tabManager: TabManager | null = null

function setStatus(text: string) {
  if (statusEl) statusEl.textContent = text
}

function initGatewayTab(iframe: HTMLIFrameElement, port: number) {
  const url = `http://127.0.0.1:${port}`
  iframe.src = url
  // Wait to hide loading state until iframe starts loading to avoid flash of background
  iframe.onload = () => {
    loadingBox.style.display = 'none'
    iframe.style.display = 'block'
  }
}

async function waitForGateway() {
  const electronAPI = (window as unknown as { electronAPI: any }).electronAPI

  if (!electronAPI || !electronAPI.gateway) {
    // Dev mode without preload / electron context
    setStatus('不在 Electron 环境，直接启动标签页')
    setTimeout(() => {
      tabManager = new TabManager((iframe) => {
        initGatewayTab(iframe, 18789)
      })
    }, 1000)
    return
  }

  // 初始化 Tab 系统
  tabManager = new TabManager((iframe) => {
    // iframe 生命周期交由本函数管理
    const handleReady = (port: number) => {
      setStatus('Gateway 已就绪，加载中...')
      initGatewayTab(iframe, port)
    }

    // 监听状态变化
    const unsubscribe = electronAPI.gateway.onStateChanged((state: GatewayState) => {
        if (state === 'error') {
          setStatus('Gateway 启动失败，请检查日志')
          loadingBox.style.display = 'flex'
          iframe.style.display = 'none'
        } else if (state === 'starting') {
          setStatus('正在启动 Gateway...')
          loadingBox.style.display = 'flex'
          iframe.style.display = 'none'
        } else if (state === 'restarting') {
          setStatus('正在重启 Gateway...')
          loadingBox.style.display = 'flex'
          iframe.style.display = 'none'
        } else if (state === 'ready') {
          electronAPI.gateway.getPort().then(handleReady)
        }
    })

    // 启动时立即检查状态
    electronAPI.gateway.getStatus().then((status: any) => {
      if (status.state === 'ready') {
        handleReady(status.port)
      } else if (status.state === 'error') {
        setStatus('Gateway 启动失败，请检查日志')
      }
    })
  })
}

// Kickoff
waitForGateway()
