// Renderer entry point

import { TabManager } from './tab-manager'

export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

const statusEl = document.getElementById('status')!
const loadingBox = document.getElementById('gateway-loading') as HTMLElement
let tabManager: TabManager | null = null

function setStatus(text: string) {
  if (statusEl) statusEl.textContent = text
}

function showGatewayIframe(iframe: HTMLIFrameElement) {
  loadingBox.style.display = 'none'
  iframe.style.display = 'block'
}

function hideGatewayIframe(iframe: HTMLIFrameElement) {
  loadingBox.style.display = 'flex'
  iframe.style.display = 'none'
}

function initGatewayTab(iframe: HTMLIFrameElement, port: number) {
  const url = `http://127.0.0.1:${port}`

  // 先绑定 onload，再赋 src，防止赋值已触发 load 但监听器还没挂上的竞态
  iframe.onload = () => {
    // 防止 about:blank 触发就跳
    if (iframe.src && iframe.src !== 'about:blank') {
      showGatewayIframe(iframe)
    }
  }
  iframe.src = url

  // 兜底：4s 后如果 iframe 还没显示，强制显示（部分情况 onload 不触发）
  setTimeout(() => {
    if (iframe.style.display === 'none') {
      showGatewayIframe(iframe)
    }
  }, 4000)
}

async function waitForGateway() {
  const electronAPI = (window as unknown as { electronAPI: any }).electronAPI

  if (!electronAPI || !electronAPI.gateway) {
    // Dev mode without preload / electron context
    setStatus('不在 Electron 环境，直接连接本地 Gateway')
    tabManager = new TabManager((iframe) => {
      initGatewayTab(iframe, 18789)
    })
    return
  }

  // 初始化 Tab 系统（立即建立，不等 gateway）
  tabManager = new TabManager((iframe) => {
    const handleReady = (port: number) => {
      setStatus('Gateway 已就绪，加载中...')
      initGatewayTab(iframe, port)
    }

    // 监听后续状态变化
    electronAPI.gateway.onStateChanged((state: GatewayState) => {
      if (state === 'error') {
        setStatus('Gateway 启动失败，请检查日志')
        hideGatewayIframe(iframe)
      } else if (state === 'starting') {
        setStatus('正在启动 Gateway...')
        hideGatewayIframe(iframe)
      } else if (state === 'restarting') {
        setStatus('正在重启 Gateway...')
        hideGatewayIframe(iframe)
      } else if (state === 'ready') {
        electronAPI.gateway.getPort().then(handleReady)
      }
    })

    // 立即检查当前状态（启动时 Gateway 可能已经是 ready 了）
    electronAPI.gateway.getStatus().then((status: any) => {
      if (status.state === 'ready') {
        handleReady(status.port)
      } else if (status.state === 'error') {
        setStatus('Gateway 启动失败，请检查日志')
      } else if (status.state === 'starting') {
        setStatus('正在启动 Gateway...')
      }
    })
  })
}

// Kickoff
waitForGateway()
