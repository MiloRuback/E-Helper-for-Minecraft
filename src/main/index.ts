import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

/**
 * Every Helper for Minecraft — Main Process
 * 
 * Configuração principal do Electron:
 * - Janela frameless com custom titlebar
 * - Tamanho padrão: 1280×720 | Mínimo: 800×500
 * - IPC handlers para controles de janela
 * 
 * @author Milo Ruback
 * @version 1.0.0
 */

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 500,
    frame: false, // Frameless window para custom titlebar
    titleBarStyle: 'hidden',
    show: false, // Mostra apenas quando estiver pronta (evita flash branco)
    backgroundColor: '#1a1a2e', // Fundo escuro enquanto carrega
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Mostra a janela quando o renderer estiver pronto
  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Abrir links externos no navegador padrão
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Carregar o app (dev ou produção)
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ═══════════════════════════════════════════════════
// IPC Handlers — Controles da Janela (Custom Titlebar)
// ═══════════════════════════════════════════════════

ipcMain.on('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() ?? false
})

// Notificar o renderer quando o estado de maximização mudar
function setupMaximizeListeners(): void {
  mainWindow?.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', true)
  })
  mainWindow?.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-changed', false)
  })
}

// ═══════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════

app.whenReady().then(() => {
  createWindow()
  setupMaximizeListeners()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
