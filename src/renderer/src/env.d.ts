/// <reference types="vite/client" />

/**
 * Declaração de tipos para a API do Electron exposta via preload
 */
interface ElectronAPI {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void
  }
  platform: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
