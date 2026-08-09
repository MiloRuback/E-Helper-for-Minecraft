import { contextBridge, ipcRenderer } from 'electron'

/**
 * Every Helper for Minecraft — Preload Script
 * 
 * Bridge segura entre o renderer (React) e o main process (Electron).
 * Expõe APIs controladas via contextBridge para manter a segurança.
 * 
 * @author Milo Ruback
 */

// ═══════════════════════════════════════════════════
// API exposta ao renderer via window.electronAPI
// ═══════════════════════════════════════════════════

const electronAPI = {
  // --- Controles da Janela (Custom Titlebar) ---
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChanged: (callback: (isMaximized: boolean) => void): (() => void) => {
      const handler = (_event: Electron.IpcRendererEvent, value: boolean): void => callback(value)
      ipcRenderer.on('window:maximized-changed', handler)
      // Retorna função de cleanup
      return () => ipcRenderer.removeListener('window:maximized-changed', handler)
    }
  },

  // --- Informações do Sistema ---
  platform: process.platform,
  
  // --- Versões ---
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}

// Expõe a API de forma segura
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// ═══════════════════════════════════════════════════
// Type declarations para TypeScript
// ═══════════════════════════════════════════════════

export type ElectronAPI = typeof electronAPI
