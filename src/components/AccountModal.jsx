import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function AccountModal({ isOpen, onClose, user, onUpdateUser }) {
  const [formData, setFormData] = useState({
    name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    newPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.nombre || '',
        last_name: user.last_name || user.apellido || '',
        email: user.email || '',
        phone: user.phone || user.telefono || '',
        company: user.company || user.empresa || '',
        newPassword: '',
      })
      setSuccess('')
      setError('')
    }
  }, [user, isOpen])

  if (!isOpen) return null

  const getRoleLabel = (roleId) => {
    switch (roleId) {
      case 1: return 'Super Admin'
      case 2: return 'Owner (Propietario)'
      case 3: return 'Manager (Gestor)'
      default: return 'Usuario'
    }
  }

  const initials = ((formData.name || formData.email || 'U'))
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const payload = {
        name: formData.name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      }

      if (formData.newPassword) {
        payload.password = formData.newPassword
      }

      const updated = await api.auth.updateProfile(payload)
      if (onUpdateUser) {
        onUpdateUser(updated)
      }
      setSuccess('¡Información personal actualizada con éxito!')
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.message || 'Error al actualizar información personal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-account-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 id="modal-account-title" className="modal-title">Mi Cuenta</h2>
            <p className="modal-subtitle">Edita y actualiza tu información personal</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
            ✕
          </button>
        </div>

        {/* User Card Profile Header */}
        <div className="account-preview-card">
          <div className="account-avatar-large">
            {initials}
          </div>
          <div className="account-preview-info">
            <h3 className="account-preview-name">{formData.name || 'Sin nombre asignado'}</h3>
            <p className="account-preview-email">{formData.email}</p>
            <div className="account-preview-badges">
              <span className="badge badge-primary">
                {getRoleLabel(user?.id_role)}
              </span>
              {formData.company && (
                <span className="badge badge-neutral">
                  {formData.company}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {success && (
          <div className="alert-message alert-success">
            {success}
          </div>
        )}
        {error && (
          <div className="alert-message alert-error">
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="account-form">
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="account-name">Nombre</label>
              <input
                id="account-name"
                name="name"
                type="text"
                className="input-control"
                placeholder="Ej. Juan"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="account-last-name">Apellidos</label>
              <input
                id="account-last-name"
                name="last_name"
                type="text"
                className="input-control"
                placeholder="Ej. Pérez"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="account-email">Correo Electrónico</label>
              <input
                id="account-email"
                name="email"
                type="email"
                className="input-control"
                placeholder="usuario@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="account-phone">Teléfono / Celular</label>
              <input
                id="account-phone"
                name="phone"
                type="tel"
                className="input-control"
                placeholder="+57 300 123 4567"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="account-new-password">
              Nueva Contraseña <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span>
            </label>
            <input
              id="account-new-password"
              name="newPassword"
              type="password"
              className="input-control"
              placeholder="Deja en blanco para conservar tu contraseña actual"
              value={formData.newPassword}
              onChange={handleChange}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="save-account-btn"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
