import { useState, useEffect, useRef } from 'react'
import { api } from '../services/api'

const DEFAULT_NOTIFICATIONS = [
  {
    id: 1,
    title: 'Campaña sincronizada',
    message: 'La campaña "Promoción Primavera 2026" se ha sincronizado correctamente con Meta Ads.',
    time: 'Hace 5 min',
    unread: true,
    type: 'success',
  },
  {
    id: 2,
    title: 'Actualización de equipo',
    message: 'Se actualizó el rol de Carlos Mendoza a Manager en tu organización.',
    time: 'Hace 40 min',
    unread: true,
    type: 'info',
  },
  {
    id: 3,
    title: 'Rendimiento destacado',
    message: 'El ROI de tus campañas activas alcanzó un incremento del +18.4% esta semana.',
    time: 'Hace 2 horas',
    unread: true,
    type: 'kpi',
  },
  {
    id: 4,
    title: 'Consumo de presupuesto',
    message: 'La campaña "Descuentos Flash" ha ejecutado el 85% de la inversión programada.',
    time: 'Ayer',
    unread: false,
    type: 'warn',
  },
]

export default function NotificationsDropdown({ isOpen, onClose, onUnreadChange }) {
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const dropdownRef = useRef(null)

  // Cargar notificaciones del backend si existen
  useEffect(() => {
    let isMounted = true
    api.notifications.getAll()
      .then(data => {
        if (!isMounted) return
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((n, idx) => ({
            id: n.id || idx + 1,
            title: n.title || n.titulo || 'Notificación',
            message: n.message || n.mensaje || n.description || '',
            time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reciente',
            unread: !n.is_read && !n.read,
            type: n.type || 'info',
          }))
          setNotifications(formatted)
        }
      })
      .catch(() => {
        // En caso de fallo de red, conservamos las de demostración
      })
    return () => { isMounted = false }
  }, [])

  // Notificar al componente padre el conteo de no leídas
  const unreadCount = notifications.filter(n => n.unread).length
  useEffect(() => {
    if (onUnreadChange) {
      onUnreadChange(unreadCount)
    }
  }, [unreadCount, onUnreadChange])

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...prev, ...n, unread: false })))
    // Notificar al backend
    notifications.filter(n => n.unread).forEach(n => {
      api.notifications.markAsRead(n.id).catch(() => {})
    })
  }

  const handleMarkOneAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    )
    api.notifications.markAsRead(id).catch(() => {})
  }

  const handleDeleteOne = (e, id) => {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleClearAll = () => {
    setNotifications([])
  }

  const displayedList = filter === 'unread'
    ? notifications.filter(n => n.unread)
    : notifications

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <span className="notif-type-icon notif-icon-success">✓</span>
      case 'warn':
        return <span className="notif-type-icon notif-icon-warn">!</span>
      case 'kpi':
        return <span className="notif-type-icon notif-icon-kpi">📈</span>
      default:
        return <span className="notif-type-icon notif-icon-info">ℹ</span>
    }
  }

  return (
    <div className="notifications-dropdown" ref={dropdownRef} role="region" aria-label="Centro de notificaciones">
      {/* Header */}
      <div className="notif-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 className="notif-header-title">Notificaciones</h3>
          {unreadCount > 0 && (
            <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
              {unreadCount} nuevas
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              className="notif-btn-link"
              onClick={handleMarkAllAsRead}
              title="Marcar todas como leídas"
            >
              Marcar leídas
            </button>
          )}
          <button className="notif-btn-close" onClick={onClose} aria-label="Cerrar notificaciones">
            ✕
          </button>
        </div>
      </div>

      {/* Tabs / Filtros */}
      <div className="notif-tabs">
        <button
          className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({notifications.length})
        </button>
        <button
          className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          No leídas ({unreadCount})
        </button>
      </div>

      {/* Lista de notificaciones */}
      <div className="notif-body">
        {displayedList.length === 0 ? (
          <div className="notif-empty-state">
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 6 }}>🔔</span>
            <p style={{ fontWeight: 600, color: 'var(--color-text)' }}>No hay notificaciones</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {filter === 'unread' ? 'No tienes notificaciones pendientes' : 'Te avisaremos cuando haya actividad importante'}
            </p>
          </div>
        ) : (
          displayedList.map(item => (
            <div
              key={item.id}
              className={`notif-item ${item.unread ? 'unread' : ''}`}
              onClick={() => handleMarkOneAsRead(item.id)}
            >
              <div className="notif-item-icon-box">
                {renderIcon(item.type)}
              </div>
              <div className="notif-item-content">
                <div className="notif-item-top">
                  <span className="notif-item-title">{item.title}</span>
                  <span className="notif-item-time">{item.time}</span>
                </div>
                <p className="notif-item-message">{item.message}</p>
              </div>
              <div className="notif-item-actions">
                {item.unread && <span className="notif-unread-dot" title="No leída" />}
                <button
                  className="notif-item-delete-btn"
                  onClick={(e) => handleDeleteOne(e, item.id)}
                  title="Eliminar notificación"
                  aria-label="Eliminar notificación"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="notif-footer">
          <button className="notif-clear-btn" onClick={handleClearAll}>
            Limpiar todas
          </button>
        </div>
      )}
    </div>
  )
}
