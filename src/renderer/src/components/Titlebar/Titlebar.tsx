import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './Titlebar.module.css'

/**
 * Custom Titlebar — Every Helper for Minecraft
 * 
 * Titlebar frameless com:
 * - Logo pixel art + nome do app
 * - Botões minimizar/maximizar/fechar estilizados
 * - Drag region para mover a janela
 * - Design escuro consistente com tema Minecraft
 */
export function Titlebar() {
  const { t } = useTranslation()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Verificar estado inicial
    window.electronAPI?.window.isMaximized().then(setIsMaximized)
    
    // Ouvir mudanças de maximização
    const cleanup = window.electronAPI?.window.onMaximizedChanged((maximized) => {
      setIsMaximized(maximized)
    })

    return () => cleanup?.()
  }, [])

  const handleMinimize = () => window.electronAPI?.window.minimize()
  const handleMaximize = () => window.electronAPI?.window.maximize()
  const handleClose = () => window.electronAPI?.window.close()

  return (
    <header className={styles.titlebar} id="titlebar">
      {/* Região de drag (mover janela) */}
      <div className={styles.dragRegion}>
        {/* Logo + Título */}
        <div className={styles.appInfo}>
          <div className={styles.logo}>
            {/* Ícone pixel art do Minecraft (bloco de grama estilizado) */}
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="16" height="16" rx="2" fill="#4ecca3"/>
              <rect x="2" y="2" width="4" height="4" fill="#3db88f" opacity="0.8"/>
              <rect x="6" y="2" width="4" height="4" fill="#5dd6ad" opacity="0.6"/>
              <rect x="10" y="2" width="4" height="4" fill="#3db88f" opacity="0.8"/>
              <rect x="2" y="6" width="4" height="4" fill="#8B6914"/>
              <rect x="6" y="6" width="4" height="4" fill="#A0782C"/>
              <rect x="10" y="6" width="4" height="4" fill="#8B6914"/>
              <rect x="2" y="10" width="4" height="4" fill="#7A5B10"/>
              <rect x="6" y="10" width="4" height="4" fill="#8B6914"/>
              <rect x="10" y="10" width="4" height="4" fill="#A0782C"/>
            </svg>
          </div>
          <span className={styles.title}>{t('titlebar.title')}</span>
        </div>
      </div>

      {/* Botões de controle da janela */}
      <div className={styles.controls}>
        <button
          className={styles.controlBtn}
          onClick={handleMinimize}
          aria-label="Minimizar"
          id="btn-minimize"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect x="2" y="5.5" width="8" height="1" fill="currentColor"/>
          </svg>
        </button>

        <button
          className={styles.controlBtn}
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
          id="btn-maximize"
        >
          {isMaximized ? (
            // Ícone "restaurar" (dois retângulos sobrepostos)
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="3.5" y="1" width="7" height="7" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1"/>
              <rect x="1.5" y="3.5" width="7" height="7" rx="0.5" fill="var(--bg-titlebar)" stroke="currentColor" strokeWidth="1"/>
            </svg>
          ) : (
            // Ícone "maximizar" (um retângulo)
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="2" y="2" width="8" height="8" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          )}
        </button>

        <button
          className={`${styles.controlBtn} ${styles.closeBtn}`}
          onClick={handleClose}
          aria-label="Fechar"
          id="btn-close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
