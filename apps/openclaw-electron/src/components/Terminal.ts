import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import '../styles/terminal.css'

export class Terminal {
  private term: XTerm
  private fitAddon: FitAddon
  private id: string | null = null
  private container: HTMLElement
  private unsubs: Array<() => void> = []

  constructor(container: HTMLElement) {
    this.container = container
    
    this.term = new XTerm({
      cursorBlink: true,
      theme: {
        background: '#141414',
        foreground: '#e5e5e5',
        cursor: '#ffffff',
      },
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
    })

    this.fitAddon = new FitAddon()
    this.term.loadAddon(this.fitAddon)
  }

  public async mount(providedId?: string) {
    this.term.open(this.container)
    
    // 等待一小段时间确保 DOM 元素具备尺寸后再 fit
    setTimeout(() => {
      this.fitAddon.fit()
    }, 50)

    const electronAPI = (window as any).electronAPI
    if (!electronAPI || !electronAPI.pty) {
      this.term.write('PTY is not available in current environment.\r\n')
      return
    }

    try {
      if (providedId) {
        this.id = providedId
      } else {
        this.id = await electronAPI.pty.create()
      }
      
      this.term.onData((data) => {
        if (this.id) {
          electronAPI.pty.write(this.id, data)
        }
      })

      this.term.onResize(({ cols, rows }) => {
        if (this.id) {
          electronAPI.pty.resize(this.id, cols, rows)
        }
      })

      const unsubData = electronAPI.pty.onData((ptyId: string, data: string) => {
        if (ptyId === this.id) {
          this.term.write(data)
        }
      })
      this.unsubs.push(unsubData)

      const unsubExit = electronAPI.pty.onExit((ptyId: string, info: any) => {
        if (ptyId === this.id) {
          this.term.write(`\r\n\x1b[33mProcess exited with code ${info.exitCode}\x1b[0m\r\n`)
          if (!providedId) {
            this.id = null
          }
        }
      })
      this.unsubs.push(unsubExit)

      window.addEventListener('resize', this.onWindowResize)
    } catch (err) {
      console.error('Failed to create PTY:', err)
      this.term.write('Failed to create PTY process.\r\n')
    }
  }

  private onWindowResize = () => {
    // 防抖可以使用，但 xterm 的 fit 通常执行够快
    this.fitAddon.fit()
  }

  public resize() {
    this.fitAddon.fit()
  }

  public dispose() {
    if (this.id) {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.pty) {
        electronAPI.pty.destroy(this.id)
      }
    }
    
    for (const unsub of this.unsubs) {
      unsub()
    }
    this.unsubs = []
    
    window.removeEventListener('resize', this.onWindowResize)
    this.term.dispose()
  }
}
