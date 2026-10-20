import { useState } from 'react'
import { api } from '../services/api'
import { roleLabel } from '../lib/format'
import { IconBuilding, IconClose } from './ui/Icons'

export default function AccountModal({ isOpen, onClose, user, onUpdateUser, onLogout }) {
  // El modal se monta al abrirse (ver DashboardShell), así el formulario parte de los datos actuales
  const [form, setForm] = useState(() => ({
    name: user?.name || '', email: user?.email || '', phone: user?.phone || '', newPassword: '', confirmPassword: '',
  }))
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // El backend solo permite editar persons y users a Owner (2) y Super Admin (1)
  const canEdit = user?.id_role === 1 || user?.id_role === 2

  if (!isOpen) return null

  const companies = user?.companies || []
  const initials = (form.name || form.email || 'U').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.newPassword && form.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!user?.id_person) {
      setError('No se encontró el identificador de tu perfil. Cierra sesión y vuelve a ingresar.')
      return
    }
    setLoading(true)
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() }
      await api.auth.updateProfile(user.id_person, payload)
      if (form.newPassword) await api.users.changePassword(user, form.newPassword)
      onUpdateUser?.(payload)
      setSuccess(form.newPassword ? 'Perfil y contraseña actualizados.' : 'Perfil actualizado.')
      setForm(prev => ({ ...prev, newPassword: '', confirmPassword: '' }))
    } catch (err) {
      setError(err.message || 'No fue posible actualizar el perfil.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-account-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="modal-account-title" className="modal-title">Mi cuenta</h2>
            <p className="modal-subtitle">Información personal y empresa asociada</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <IconClose size={16} />
          </button>
        </div>

        <div className="account-preview-card">
          <div className="account-avatar-large">{initials}</div>
          <div className="account-preview-info">
            <h3 className="account-preview-name">{form.name || 'Sin nombre'}</h3>
            <p className="account-preview-email">{form.email}</p>
            <div className="account-preview-badges">
              <span className="badge badge-primary">{roleLabel(user?.id_role)}</span>
            </div>
          </div>
        </div>

        <div className="account-companies">
          <span className="account-section-label">Empresa{companies.length > 1 ? 's' : ''}</span>
          {companies.length === 0 ? (
            <p className="account-company-empty">
              {user?.id_role === 1 ? 'Acceso global a todas las empresas.' : 'Tu usuario no tiene una empresa asignada.'}
            </p>
          ) : (
            <ul>
              {companies.map(c => (
                <li key={c.id_company}>
                  <IconBuilding size={16} />
                  <span>{c.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {success && <div className="alert-message alert-success" role="status">{success}</div>}
        {error && <div className="alert-message alert-error" role="alert">{error}</div>}
        {!canEdit && (
          <div className="alert-message alert-info">
            Tu rol no tiene permiso para editar el perfil. Solicita los cambios al Owner de tu empresa.
          </div>
        )}

        <form onSubmit={handleSubmit} className="account-form">
          <fieldset disabled={!canEdit || loading} style={{ border: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label htmlFor="account-name">Nombre completo</label>
              <input id="account-name" name="name" className="input-control" value={form.name} onChange={onChange} required />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="account-email">Correo electrónico</label>
                <input id="account-email" name="email" type="email" className="input-control" value={form.email} onChange={onChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="account-phone">Teléfono</label>
                <input id="account-phone" name="phone" type="tel" className="input-control" value={form.phone} onChange={onChange} />
              </div>
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="account-new-password">Nueva contraseña <span className="label-hint">(opcional)</span></label>
                <input id="account-new-password" name="newPassword" type="password" className="input-control" value={form.newPassword} onChange={onChange} autoComplete="new-password" />
              </div>
              <div className="form-group">
                <label htmlFor="account-confirm-password">Confirmar contraseña</label>
                <input id="account-confirm-password" name="confirmPassword" type="password" className="input-control" value={form.confirmPassword} onChange={onChange} autoComplete="new-password" />
              </div>
            </div>
          </fieldset>

          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="btn-cancel btn-danger-outline" onClick={() => { onClose(); onLogout?.() }}>
              Cerrar sesión
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cerrar</button>
              {canEdit && (
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Guardando…' : 'Guardar cambios'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
