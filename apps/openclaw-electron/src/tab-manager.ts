import { Terminal } from './components/Terminal'
import { Browser } from './components/Browser'

type TabType = 'gateway' | 'terminal' | 'browser'
const TAB_IDS: TabType[] = ['gateway', 'terminal', 'browser']

export class TabManager {
  private currentTab: TabType = 'gateway'
  
  private terminalInstance: Terminal | null = null
  private browserInstance: Browser | null = null

  // DOM elements
  private btnGateway = document.getElementById('tab-btn-gateway')!
  private btnTerminal = document.getElementById('tab-btn-terminal')!
  private btnBrowser = document.getElementById('tab-btn-browser')!
  
  private contentGateway = document.getElementById('tab-gateway')!
  private contentTerminal = document.getElementById('tab-terminal')!
  private contentBrowser = document.getElementById('tab-browser')!

  constructor(private onGatewayInit: (iframe: HTMLIFrameElement) => void) {
    this.setupEvents()
    
    // 初始化 Gateway iframe 及其事件
    const iframe = this.contentGateway.querySelector('iframe')!
    this.onGatewayInit(iframe)
  }

  private setupEvents() {
    this.btnGateway.addEventListener('click', () => this.switchTab('gateway'))
    this.btnTerminal.addEventListener('click', () => this.switchTab('terminal'))
    this.btnBrowser.addEventListener('click', () => this.switchTab('browser'))
  }

  public switchTab(tab: TabType) {
    if (this.currentTab === tab) return
    this.currentTab = tab

    // 更新按钮高亮 (利用 opacity)
    this.btnGateway.style.opacity = tab === 'gateway' ? '1' : '0.5'
    this.btnTerminal.style.opacity = tab === 'terminal' ? '1' : '0.5'
    this.btnBrowser.style.opacity = tab === 'browser' ? '1' : '0.5'
    
    // 添加边框下划线
    this.btnGateway.style.borderBottom = tab === 'gateway' ? '2px solid #7c3aed' : '2px solid transparent'
    this.btnTerminal.style.borderBottom = tab === 'terminal' ? '2px solid #7c3aed' : '2px solid transparent'
    this.btnBrowser.style.borderBottom = tab === 'browser' ? '2px solid #7c3aed' : '2px solid transparent'

    // 显示/隐藏内容
    this.contentGateway.style.display = tab === 'gateway' ? 'block' : 'none'
    this.contentTerminal.style.display = tab === 'terminal' ? 'block' : 'none'
    this.contentBrowser.style.display = tab === 'browser' ? 'block' : 'none'

    // 懒加载实例化
    this.ensureInitialized(tab)
  }

  private ensureInitialized(tab: TabType) {
    if (tab === 'terminal' && !this.terminalInstance) {
      // 这里清空内容容器（原本的加载提示），换成 terminal
      this.contentTerminal.innerHTML = '<div id="terminal-wrapper" class="terminal-container"></div>'
      const wrapper = document.getElementById('terminal-wrapper')!
      this.terminalInstance = new Terminal(wrapper)
      this.terminalInstance.mount()
    } else if (tab === 'terminal' && this.terminalInstance) {
      // 切换回终端时触发调整尺寸
      this.terminalInstance.resize()
    }
    
    if (tab === 'browser' && !this.browserInstance) {
      this.contentBrowser.innerHTML = '<div id="browser-wrapper" style="width:100%;height:100%;"></div>'
      const wrapper = document.getElementById('browser-wrapper')!
      this.browserInstance = new Browser(wrapper)
      this.browserInstance.mount()
    }
  }
}
