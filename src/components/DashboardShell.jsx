import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo_web.png'
import AccountModal from './AccountModal'
import NotificationsDropdown from './NotificationsDropdown'
import { api } from '../services/api'
import { roleLabel } from '../lib/format'
import { IconBell, IconBuilding, IconClose, IconLogout, IconSearch } from './ui/Icons'

// Re-exportados para compatibilidad con las páginas que los importan desde aquí
export {
  IconDashboard, IconCampaign, IconUsers, IconLink, IconFolderPlus, IconRanking,
  IconAnalytics, IconBuilding, IconShield,
} from './ui/Icons'

export default function DashboardShell({ sidebarItems, tabs, user, onLogout, onUpdateUser, children }) {
  const navigate = useNavigate()
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [query, setQuery] = useState('')
  const [campaigns, setCampaigns] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)

  const isTenantUser = user?.id_role === 2 || user?.id_role === 3
  const companyName = user?.company_name || (user?.id_role === 1 ? 'Administración de plataforma' : null)

  useEffect(() => {
    api.notifications.getUnreadCount().then(setUnreadCount).catch(() => {})
  }, [])

  // Campañas para la búsqueda rápida (Ctrl+K)
  useEffect(() => {
    if (isTenantUser) api.campaigns.getAll().then(setCampaigns).catch(() => {})
  }, [isTenantUser])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowSearch(prev => !prev)
      } else if (e.key === 'Escape') {
        setShowSearch(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const initials = (user?.name || user?.email || 'U')
    .split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const items = [
    ...(sidebarItems || []).map(item => ({ type: 'Sección', title: item.label, subtitle: 'Ir a la sección', to: item.to })),
    ...campaigns.map(c => ({ type: 'Campaña', title: c.name, subtitle: 'Ver desglose de la campaña', to: `/dashboard/desglose?id=${c.id}` })),
  ]
  const q = query.trim().toLowerCase()
  const results = (q ? items.filter(i => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)) : items).slice(0, 8)

  const selectResult = (item) => {
    setShowSearch(false)
    setQuery('')
    setActiveIdx(0)
    if (item?.to) navigate(item.to)
  }

  const closeNotifications = useCallback(() => setShowNotifications(false), [])

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegación principal">
        <div className="sidebar-logo">
          <img src={logo} alt="Analitika" />
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map(item => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              data-tooltip={item.label}
              aria-label={item.label}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>
        <button className="sidebar-item" onClick={onLogout} data-tooltip="Cerrar sesión" aria-label="Cerrar sesión">
          <IconLogout />
        </button>
      </aside>

      <header className="app-topbar">
        <nav className="topbar-tabs" aria-label="Secciones">
          {tabs.map(tab => (
            <NavLink
              key={tab.id}
              to={tab.to}
              end={tab.exact}
              className={({ isActive }) => `topbar-tab${isActive ? ' active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar-actions">
          {companyName && (
            <div className="topbar-company" title={`Empresa: ${companyName}`}>
              <IconBuilding size={16} />
              <span>{companyName}</span>
              {user?.companies?.length > 1 && (
                <span className="topbar-company-more">+{user.companies.length - 1}</span>
              )}
            </div>
          )}

          <button
            className="topbar-icon-btn"
            aria-label="Buscar (Ctrl+K)"
            onClick={() => setShowSearch(true)}
            title="Buscar (Ctrl+K)"
          >
            <IconSearch />
          </button>

          <div className="notif-wrapper">
            <button
              className={`topbar-icon-btn${showNotifications ? ' active' : ''}`}
              aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications(prev => !prev)}
              title="Notificaciones"
            >
              <IconBell />
              {unreadCount > 0 && (
                <span className="notif-badge-count" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <NotificationsDropdown onClose={closeNotifications} onUnreadChange={setUnreadCount} />
            )}
          </div>

          <button
            className="topbar-profile"
            onClick={() => setShowAccountModal(true)}
            aria-label={`Mi cuenta: ${user?.name || user?.email}`}
            title="Mi cuenta"
          >
            <div className="topbar-avatar" aria-hidden="true">{initials}</div>
            <span className="topbar-user-text">
              <span className="topbar-username">{user?.name || user?.email || 'Usuario'}</span>
              <span className="topbar-role">{roleLabel(user?.id_role)}</span>
            </span>
          </button>
        </div>
      </header>

      <main className="app-main" id="main-content">
        {children}
      </main>

      {showSearch && (
        <div className="modal-backdrop" onClick={() => setShowSearch(false)} role="dialog" aria-modal="true" aria-label="Búsqueda rápida">
          <div className="modal-container search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-row">
              <IconSearch size={20} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar secciones o campañas"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
                  if (e.key === 'Enter') selectResult(results[activeIdx])
                }}
                aria-label="Término de búsqueda"
              />
              <button className="modal-close-btn" onClick={() => setShowSearch(false)} aria-label="Cerrar búsqueda">
                <IconClose size={16} />
              </button>
            </div>
            <ul className="search-results">
              {results.length === 0 ? (
                <li className="search-empty">Sin resultados para “{query}”</li>
              ) : results.map((item, idx) => (
                <li key={`${item.type}-${item.title}-${idx}`}>
                  <button
                    type="button"
                    className={`search-result${idx === activeIdx ? ' active' : ''}`}
                    onClick={() => selectResult(item)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span>
                      <span className="search-result-title">{item.title}</span>
                      <span className="search-result-sub">{item.subtitle}</span>
                    </span>
                    <span className="badge badge-neutral">{item.type}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="search-footer">
              <span><kbd>Ctrl</kbd> + <kbd>K</kbd> abrir / cerrar</span>
              <span><kbd>Enter</kbd> seleccionar · <kbd>Esc</kbd> salir</span>
            </div>
          </div>
        </div>
      )}

      {showAccountModal && (
      <AccountModal
        isOpen
        onClose={() => setShowAccountModal(false)}
        user={user}
        onUpdateUser={onUpdateUser}
        onLogout={onLogout}
      />
      )}
    </div>
  )
}
