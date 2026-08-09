import { useTranslation } from 'react-i18next'
import styles from './Sidebar.module.css'

/**
 * Sidebar — Every Helper for Minecraft
 * 
 * Menu lateral de navegação com:
 * - Ícones SVG pixel art para cada módulo
 * - Labels traduzíveis (PT-BR / EN-US)
 * - Indicador de aba ativa com glow
 * - Hover effects animados
 * - Divisor visual entre funcionalidades e sistema
 */

export type PageId = 
  | 'home' 
  | 'skinEditor' 
  | 'blueprints' 
  | 'seedMap' 
  | 'worldImporter' 
  | 'modpacks' 
  | 'profile' 
  | 'settings'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

interface NavItem {
  id: PageId
  icon: React.ReactNode
  labelKey: string
}

// ═══════════════════════════════════════════════════
// Ícones SVG pixel art inline (16x16 grid style)
// ═══════════════════════════════════════════════════

const icons: Record<PageId, React.ReactNode> = {
  home: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L1 7h2v7h4v-4h2v4h4V7h2L8 1z" fill="currentColor" opacity="0.9"/>
      <rect x="6" y="10" width="4" height="4" fill="var(--bg-sidebar)" opacity="0.3"/>
    </svg>
  ),
  skinEditor: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Cabeça de Steve estilizada */}
      <rect x="3" y="1" width="10" height="10" rx="1" fill="currentColor" opacity="0.3"/>
      <rect x="4" y="2" width="3" height="3" fill="currentColor" opacity="0.8"/>
      <rect x="9" y="2" width="3" height="3" fill="currentColor" opacity="0.8"/>
      <rect x="6" y="5" width="4" height="2" fill="currentColor" opacity="0.5"/>
      <rect x="5" y="7" width="6" height="3" fill="currentColor" opacity="0.6"/>
      {/* Pincel */}
      <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="14" cy="14" r="1" fill="currentColor"/>
    </svg>
  ),
  blueprints: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Cubo 3D estilizado */}
      <path d="M8 1L2 4.5V11.5L8 15L14 11.5V4.5L8 1Z" fill="currentColor" opacity="0.2"/>
      <path d="M8 1L2 4.5L8 8L14 4.5L8 1Z" fill="currentColor" opacity="0.5"/>
      <path d="M8 8L2 4.5V11.5L8 15V8Z" fill="currentColor" opacity="0.35"/>
      <path d="M8 8L14 4.5V11.5L8 15V8Z" fill="currentColor" opacity="0.65"/>
    </svg>
  ),
  seedMap: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Mapa com pin */}
      <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" opacity="0.2"/>
      <rect x="3" y="3" width="4" height="4" fill="currentColor" opacity="0.35"/>
      <rect x="7" y="3" width="6" height="4" fill="currentColor" opacity="0.5"/>
      <rect x="3" y="7" width="6" height="6" fill="currentColor" opacity="0.45"/>
      <rect x="9" y="7" width="4" height="6" fill="currentColor" opacity="0.3"/>
      {/* Pin de localização */}
      <circle cx="10" cy="6" r="2" fill="currentColor" opacity="0.9"/>
      <circle cx="10" cy="6" r="1" fill="var(--bg-sidebar)"/>
    </svg>
  ),
  worldImporter: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Globo/Mundo */}
      <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5"/>
      <ellipse cx="8" cy="8" rx="3" ry="6" fill="none" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.5"/>
      <line x1="2" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4"/>
      <line x1="2" y1="10" x2="14" y2="10" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.4"/>
      {/* Seta de importação */}
      <path d="M8 12V15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M6 13.5L8 15.5L10 13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  modpacks: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Caixa/Package */}
      <rect x="2" y="4" width="12" height="10" rx="1" fill="currentColor" opacity="0.25"/>
      <rect x="2" y="4" width="12" height="3" rx="1" fill="currentColor" opacity="0.5"/>
      <rect x="6" y="3" width="4" height="5" fill="currentColor" opacity="0.4"/>
      {/* Ícone de play */}
      <path d="M6.5 9L6.5 13L10.5 11L6.5 9Z" fill="currentColor" opacity="0.8"/>
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Avatar de usuário */}
      <circle cx="8" cy="5" r="3" fill="currentColor" opacity="0.6"/>
      <path d="M2 14C2 11 4.5 9 8 9C11.5 9 14 11 14 14" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
      {/* Engrenagem */}
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.7"/>
      <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 2.5"/>
      <circle cx="8" cy="2" r="1" fill="currentColor" opacity="0.5"/>
      <circle cx="8" cy="14" r="1" fill="currentColor" opacity="0.5"/>
      <circle cx="2" cy="8" r="1" fill="currentColor" opacity="0.5"/>
      <circle cx="14" cy="8" r="1" fill="currentColor" opacity="0.5"/>
    </svg>
  )
}

// ═══════════════════════════════════════════════════
// Itens de navegação organizados
// ═══════════════════════════════════════════════════

const mainNavItems: NavItem[] = [
  { id: 'home', icon: icons.home, labelKey: 'sidebar.home' },
  { id: 'skinEditor', icon: icons.skinEditor, labelKey: 'sidebar.skinEditor' },
  { id: 'blueprints', icon: icons.blueprints, labelKey: 'sidebar.blueprints' },
  { id: 'seedMap', icon: icons.seedMap, labelKey: 'sidebar.seedMap' },
  { id: 'worldImporter', icon: icons.worldImporter, labelKey: 'sidebar.worldImporter' },
  { id: 'modpacks', icon: icons.modpacks, labelKey: 'sidebar.modpacks' },
]

const bottomNavItems: NavItem[] = [
  { id: 'profile', icon: icons.profile, labelKey: 'sidebar.profile' },
  { id: 'settings', icon: icons.settings, labelKey: 'sidebar.settings' },
]

// ═══════════════════════════════════════════════════
// Componente Sidebar
// ═══════════════════════════════════════════════════

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { t } = useTranslation()

  const renderNavItem = (item: NavItem, index: number) => {
    const isActive = activePage === item.id
    
    return (
      <button
        key={item.id}
        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        onClick={() => onNavigate(item.id)}
        aria-label={t(item.labelKey)}
        id={`nav-${item.id}`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <span className={styles.icon}>{item.icon}</span>
        <span className={styles.label}>{t(item.labelKey)}</span>
        {isActive && <span className={styles.activeIndicator} />}
      </button>
    )
  }

  return (
    <nav className={styles.sidebar} id="sidebar">
      {/* Logo */}
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
            <rect width="16" height="16" rx="3" fill="#4ecca3"/>
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
        <span className={styles.logoText}>E-Helper</span>
      </div>

      {/* Navegação principal */}
      <div className={styles.mainNav}>
        {mainNavItems.map((item, i) => renderNavItem(item, i))}
      </div>

      {/* Separador */}
      <div className={styles.divider} />

      {/* Navegação inferior (perfil + config) */}
      <div className={styles.bottomNav}>
        {bottomNavItems.map((item, i) => renderNavItem(item, mainNavItems.length + i))}
      </div>

      {/* Versão */}
      <div className={styles.version}>
        <span>{t('app.version')}</span>
      </div>
    </nav>
  )
}
