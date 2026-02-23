import '../styles/browser.css'

const SVG_BACK = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>'
const SVG_FORWARD = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>'
const SVG_RELOAD = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>'

export class Browser {
  private container: HTMLElement
  private input!: HTMLInputElement
  private backBtn!: HTMLButtonElement
  private fwdBtn!: HTMLButtonElement
  private reloadBtn!: HTMLButtonElement
  private webview!: any // The <webview> DOM element

  constructor(container: HTMLElement) {
    this.container = container
  }

  public mount() {
    this.container.innerHTML = `
      <div class="browser-container">
        <div class="browser-header">
          <button class="browser-btn" id="btn-back" disabled>${SVG_BACK}</button>
          <button class="browser-btn" id="btn-forward" disabled>${SVG_FORWARD}</button>
          <button class="browser-btn" id="btn-reload">${SVG_RELOAD}</button>
          <div class="browser-url-bar">
            <input type="text" id="url-input" class="browser-url-input" placeholder="输入 URL 或搜索内容..." />
          </div>
        </div>
        <div class="browser-content" id="webview-container">
          <!-- webview will be inserted here -->
        </div>
      </div>
    `

    this.input = this.container.querySelector('#url-input')!
    this.backBtn = this.container.querySelector('#btn-back')!
    this.fwdBtn = this.container.querySelector('#btn-forward')!
    this.reloadBtn = this.container.querySelector('#btn-reload')!

    this.createWebview()
    this.setupEvents()
  }

  private createWebview() {
    // 动态创建 webview 标签，而不是写死在 HTML
    // 因为 Electron 中有时直接写 <webview> 会被 React/Vue 或某些情况拦截导致初始化失败
    this.webview = document.createElement('webview')
    this.webview.setAttribute('src', 'https://www.google.com') // 初始页面
    this.webview.setAttribute('allowpopups', 'true')
    
    // 把 webview 加入到 DOM 中
    const container = this.container.querySelector('#webview-container')!
    container.appendChild(this.webview)

    this.webview.addEventListener('did-start-loading', () => {
      this.updateUrlBar()
      this.updateNavButtons()
    })

    this.webview.addEventListener('did-stop-loading', () => {
      this.updateUrlBar()
      this.updateNavButtons()
    })

    this.webview.addEventListener('did-navigate', (e: any) => {
      this.input.value = e.url
    })
    
    // 如果想要跟随重定向，也可以监听:
    this.webview.addEventListener('will-navigate', (e: any) => {
      this.input.value = e.url
    })
  }

  private setupEvents() {
    this.backBtn.addEventListener('click', () => {
      if (this.webview.canGoBack()) this.webview.goBack()
    })

    this.fwdBtn.addEventListener('click', () => {
      if (this.webview.canGoForward()) this.webview.goForward()
    })

    this.reloadBtn.addEventListener('click', () => {
      this.webview.reload()
    })

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = this.input.value.trim()
        if (val) this.navigate(val)
      }
    })
  }

  public navigate(url: string) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // 简单判断是否是纯网址，如果不是就跳转搜索引擎
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url
      } else {
        url = 'https://www.google.com/search?q=' + encodeURIComponent(url)
      }
    }
    this.input.value = url
    try {
      this.webview.loadURL(url)
    } catch(err) {
      console.error(err)
    }
  }

  private updateUrlBar() {
    try {
      if (this.webview.getURL()) {
        this.input.value = this.webview.getURL()
      }
    } catch { /* ignore */ }
  }

  private updateNavButtons() {
    try {
      this.backBtn.disabled = !this.webview.canGoBack()
      this.fwdBtn.disabled = !this.webview.canGoForward()
    } catch { /* ignore */ }
  }
}
