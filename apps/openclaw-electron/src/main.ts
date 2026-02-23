// Renderer entry point: polls gateway status and redirects to Control UI when ready
export type GatewayState = 'starting' | 'ready' | 'error' | 'stopped' | 'restarting'

const statusEl = document.getElementById('status')!

function setStatus(text: string) {
  statusEl.textContent = text
}

async function waitForGateway() {
  const electronAPI = (window as unknown as { electronAPI: {
    gateway: {
      getStatus: () => Promise<{ state: GatewayState; port: number }>
      onStateChanged: (cb: (state: GatewayState) => void) => () => void
    }
  } }).electronAPI

  if (!electronAPI) {
    // Dev mode without preload - just redirect
    setStatus('正在连接...')
    setTimeout(() => {
      window.location.href = 'http://127.0.0.1:18789'
    }, 2000)
    return
  }

  // Listen for state changes
  const unsubscribe = electronAPI.gateway.onStateChanged((state) => {
    if (state === 'ready') {
      unsubscribe()
      setStatus('Gateway 已就绪，正在跳转...')
      setTimeout(() => {
        window.location.href = 'http://127.0.0.1:18789'
      }, 500)
    } else if (state === 'error') {
      setStatus('Gateway 启动失败，请检查日志')
    } else if (state === 'starting') {
      setStatus('正在启动 Gateway...')
    } else if (state === 'restarting') {
      setStatus('正在重启 Gateway...')
    }
  })

  // Check current status immediately
  const status = await electronAPI.gateway.getStatus()
  if (status.state === 'ready') {
    unsubscribe()
    setStatus('Gateway 已就绪，正在跳转...')
    setTimeout(() => {
      window.location.href = `http://127.0.0.1:${status.port}`
    }, 300)
  } else if (status.state === 'error') {
    setStatus('Gateway 启动失败，请检查日志')
  }
}

waitForGateway()
