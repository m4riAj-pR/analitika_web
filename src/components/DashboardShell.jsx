import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo_web.png'
import AccountModal from './AccountModal'
import NotificationsDropdown from './NotificationsDropdown'

export default function DashboardShell({ sidebarItems, tabs, user, onLogout, onUpdateUser, children }) {
  const navigate = useNavigate()
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(3)

  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      {/* ── SIDEBAR ── */}
      <aside className="app-sidebar" role="navigation" aria-label="Navegación principal">
        {/* Logo */}
        <div className="sidebar-logo">
          <img src={logo} alt="Analitika" />
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `sidebar-item${isActive ? ' active' : ''}`
              }
              data-tooltip={item.label}
              aria-label={item.label}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>

        {/* Logout al fondo */}
        <button
          className="sidebar-item"
          onClick={onLogout}
          data-tooltip="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{ marginTop: 'auto' }}
        >
          <IconLogout />
        </button>
      </aside>

      {/* ── TOPBAR ── */}
      <header className="app-topbar" role="banner">
        {/* Pestañas de navegación */}
        <div className="topbar-tabs" role="tablist">
          {tabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.to}
              end={tab.exact}
              className={({ isActive }) =>
                `topbar-tab${isActive ? ' active' : ''}`
              }
              role="tab"
            >
              {tab.label}
            </NavLink>
          ))}
        </div>

        {/* Acciones derechas */}
        <div className="topbar-actions">
          {/* Búsqueda */}
          <button
            className="topbar-icon-btn"
            aria-label="Buscar"
            id="topbar-search-btn"
          >
            <IconSearch />
          </button>

          {/* Notificaciones */}
          <div className="notif-wrapper" style={{ position: 'relative' }}>
            <button
              className={`topbar-icon-btn ${showNotifications ? 'active' : ''}`}
              aria-label="Notificaciones"
              id="topbar-notif-btn"
              onClick={() => setShowNotifications(prev => !prev)}
              title="Notificaciones"
            >
              <IconBell />
              {unreadCount > 0 && (
                <span className="notif-badge-count" aria-hidden="true">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationsDropdown
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
              onUnreadChange={setUnreadCount}
            />
          </div>

          {/* Perfil / Account */}
          <button
            className="topbar-profile"
            onClick={() => setShowAccountModal(true)}
            id="topbar-profile-btn"
            aria-label={`Perfil de ${user?.name || user?.email}`}
            title="Mi Cuenta — Editar información personal"
          >
            <div className="topbar-avatar" aria-hidden="true">{initials}</div>
            <span className="topbar-username">{user?.name || user?.email || 'Usuario'}</span>
          </button>
        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <main className="app-main" id="main-content">
        {children}
      </main>

      {/* ── MODAL DE CUENTA / INFORMACIÓN PERSONAL ── */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        user={user}
        onUpdateUser={onUpdateUser}
      />
    </div>
  )
}

/* ─── Inline SVG Icons ─────────────────────────────────────── */
// Se usan SVGs inline para evitar dependencias externas.
// Todos los íconos exportados desde aquí para reutilización.

export function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

export function IconCampaign() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18M3 12h18M3 19h18" />
      <circle cx="7" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7" cy="19" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconRanking() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="10" width="4" height="11" rx="1" />
      <rect x="10" y="5" width="4" height="16" rx="1" />
      <rect x="17" y="13" width="4" height="8" rx="1" />
    </svg>
  )
}

export function IconLink() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  )
}

export function IconFolderPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  )
}

export function IconBuilding() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
    </svg>
  )
}

export function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

export function IconConnect() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  )
}

export function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
