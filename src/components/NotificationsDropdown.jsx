import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'
import { fmtRelative } from '../lib/format'
import { IconAlert, IconCheck, IconClose, IconInfo } from './ui/Icons'

const TYPE_META = {
  warning: { cls: 'notif-icon-warn', Icon: IconAlert },
  warn:    { cls: 'notif-icon-warn', Icon: IconAlert },
  error:   { cls: 'notif-icon-danger', Icon: IconAlert },
  success: { cls: 'notif-icon-success', Icon: IconCheck },
  info:    { cls: 'notif-icon-info', Icon: IconInfo },
  system:  { cls: 'notif-icon-info', Icon: IconInfo },
}

const toItem = (n) => ({
  id: n.id_notification,
  title: n.title || 'Notificación',
  message: n.message || '',
  createdAt: n.created_at,
  unread: !Number(n.is_read),
  type: (n.type || 'info').toLowerCase(),
})

export default function NotificationsDropdown({ onClose, onUnreadChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const ref = useRef(null)

  // El componente se monta al abrir el panel: siempre refleja el estado del servidor
  useEffect(() => {
    let alive = true
    api.notifications.getAll()
      .then(data => { if (alive) setItems(data.map(toItem)) })
      .catch(err => { if (alive) setError(err.message) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const unread = items.filter(n => n.unread).length
  useEffect(() => {
    if (!loading && !error) onUnreadChange?.(unread)
  }, [unread, loading, error, onUnreadChange])

  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('.notif-wrapper')) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  const markOne = (id) => {
    const target = items.find(n => n.id === id)
    if (!target?.unread) return
    setItems(prev => prev.map(n => (n.id === id ? { ...n, unread: false } : n)))
    api.notifications.markAsRead(id).catch(() => {
      setItems(prev => prev.map(n => (n.id === id ? { ...n, unread: true } : n)))
    })
  }

  const markAll = () => items.filter(n => n.unread).forEach(n => markOne(n.id))

  const list = filter === 'unread' ? items.filter(n => n.unread) : items

  return (
    <div className="notifications-dropdown" ref={ref} role="region" aria-label="Notificaciones">
      <div className="notif-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 className="notif-header-title">Notificaciones</h3>
          {unread > 0 && <span className="badge badge-primary">{unread} sin leer</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unread > 0 && <button className="notif-btn-link" onClick={markAll}>Marcar leídas</button>}
          <button className="notif-btn-close" onClick={onClose} aria-label="Cerrar notificaciones">
            <IconClose size={16} />
          </button>
        </div>
      </div>

      <div className="notif-tabs" role="tablist">
        <button role="tab" aria-selected={filter === 'all'} className={`notif-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
          Todas ({items.length})
        </button>
        <button role="tab" aria-selected={filter === 'unread'} className={`notif-tab${filter === 'unread' ? ' active' : ''}`} onClick={() => setFilter('unread')}>
          Sin leer ({unread})
        </button>
      </div>

      <div className="notif-body">
        {loading && items.length === 0 ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : error ? (
          <div className="notif-empty-state">
            <p style={{ fontWeight: 600, color: 'var(--color-danger)' }}>No se pudieron cargar las notificaciones</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{error}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="notif-empty-state">
            <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>Sin notificaciones</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {filter === 'unread' ? 'No tienes notificaciones pendientes.' : 'Aquí aparecerán alertas de presupuesto y rendimiento.'}
            </p>
          </div>
        ) : list.map(item => {
          const meta = TYPE_META[item.type] || TYPE_META.info
          return (
            <button
              type="button"
              key={item.id}
              className={`notif-item${item.unread ? ' unread' : ''}`}
              onClick={() => markOne(item.id)}
            >
              <span className={`notif-type-icon ${meta.cls}`}><meta.Icon size={16} /></span>
              <span className="notif-item-content">
                <span className="notif-item-top">
                  <span className="notif-item-title">{item.title}</span>
                  <span className="notif-item-time">{fmtRelative(item.createdAt)}</span>
                </span>
                <span className="notif-item-message">{item.message}</span>
              </span>
              {item.unread && <span className="notif-unread-dot" title="Sin leer" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
