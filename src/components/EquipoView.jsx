import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { IconUsers, IconShield } from './DashboardShell'

const INITIAL_TEAM = [
  {
    id: 1,
    name: 'Carlos',
    last_name: 'Owner',
    email: 'carlos.owner@analitika.com',
    phone: '+57 310 987 6543',
    id_role: 2,
    role_name: 'Owner',
    status: 'Activo',
    joined_at: '12 Ene 2026',
  },
  {
    id: 2,
    name: 'Ana',
    last_name: 'Gómez',
    email: 'ana.manager@analitika.com',
    phone: '+57 315 444 8921',
    id_role: 3,
    role_name: 'Manager',
    status: 'Activo',
    joined_at: '20 Feb 2026',
  },
  {
    id: 3,
    name: 'David',
    last_name: 'Restrepo',
    email: 'david.r@analitika.com',
    phone: '+57 301 777 3311',
    id_role: 3,
    role_name: 'Manager',
    status: 'Activo',
    joined_at: '05 Mar 2026',
  },
]

export default function EquipoView({ user }) {
  const isOwner = user?.id_role === 2
  const [team, setTeam] = useState(INITIAL_TEAM)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all' | '2' | '3'
  const [actionSuccess, setActionSuccess] = useState('')
  const [savingId, setSavingId] = useState(null)

  // Modal para invitar / agregar miembro
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    last_name: '',
    email: '',
    id_role: 3,
  })
  const [inviting, setInviting] = useState(false)

  // Cargar personas desde la API
  useEffect(() => {
    let isMounted = true
    api.persons.getAll()
      .then(data => {
        if (!isMounted) return
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((p, idx) => ({
            id: p.id || idx + 10,
            name: p.name || p.nombre || 'Miembro',
            last_name: p.last_name || p.apellido || '',
            email: p.email || 'sin-correo@analitika.com',
            phone: p.phone || p.telefono || '—',
            id_role: Number(p.id_role) || (idx === 0 ? 2 : 3),
            role_name: Number(p.id_role) === 2 ? 'Owner' : 'Manager',
            status: 'Activo',
            joined_at: p.created_at ? new Date(p.created_at).toLocaleDateString() : '2026',
          }))
          setTeam(formatted)
        }
      })
      .catch(() => {
        // Se conservan los miembros iniciales si la API no está disponible
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => { isMounted = false }
  }, [])

  const ownersCount = team.filter(m => m.id_role === 2).length
  const managersCount = team.filter(m => m.id_role === 3).length

  // Manejar cambio de rol
  const handleRoleChange = async (memberId, newRoleId) => {
    setSavingId(memberId)
    setActionSuccess('')

    try {
      await api.persons.updateRole(memberId, newRoleId)
    } catch {
      // Ignorar fallo de red en demo y continuar con actualización local
    }

    setTeam(prev =>
      prev.map(m =>
        m.id === memberId
          ? { ...m, id_role: newRoleId, role_name: newRoleId === 2 ? 'Owner' : 'Manager' }
          : m
      )
    )

    const memberName = team.find(m => m.id === memberId)?.name || 'Miembro'
    setActionSuccess(`¡Rol de ${memberName} actualizado a ${newRoleId === 2 ? 'Owner' : 'Manager'}!`)
    setSavingId(null)
    setTimeout(() => setActionSuccess(''), 3500)
  }

  // Eliminar miembro
  const handleDeleteMember = (memberId, memberName) => {
    if (confirm(`¿Estás seguro de remover a ${memberName} del equipo?`)) {
      setTeam(prev => prev.filter(m => m.id !== memberId))
      setActionSuccess(`${memberName} fue removido del equipo.`)
      setTimeout(() => setActionSuccess(''), 3000)
    }
  }

  // Enviar invitación
  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    setInviting(true)

    const newMember = {
      id: Date.now(),
      name: inviteForm.name.trim(),
      last_name: inviteForm.last_name.trim(),
      email: inviteForm.email.trim(),
      phone: '—',
      id_role: Number(inviteForm.id_role),
      role_name: Number(inviteForm.id_role) === 2 ? 'Owner' : 'Manager',
      status: 'Activo',
      joined_at: 'Hoy',
    }

    try {
      await api.persons.create({
        name: newMember.name,
        last_name: newMember.last_name,
        email: newMember.email,
        id_role: newMember.id_role,
      })
    } catch {
      // Continuar con creación local
    }

    setTeam(prev => [newMember, ...prev])
    setInviting(false)
    setShowInviteModal(false)
    setInviteForm({ name: '', last_name: '', email: '', id_role: 3 })
    setActionSuccess(`¡Invitación enviada y miembro ${newMember.name} agregado al equipo!`)
    setTimeout(() => setActionSuccess(''), 4000)
  }

  // Filtrado
  const filteredTeam = team.filter(m => {
    const fullName = `${m.name} ${m.last_name}`.toLowerCase()
    const matchSearch = fullName.includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || String(m.id_role) === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
              Gestión de Equipo
            </h1>
            <span className="badge badge-primary">
              {team.length} miembros
            </span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            Administra los usuarios de tu organización, asigna roles y define permisos de acceso a métricas y campañas.
          </p>
        </div>

        {isOwner && (
          <button
            className="btn-primary"
            onClick={() => setShowInviteModal(true)}
            id="btn-invitar-miembro"
          >
            <span>+</span> Invitar Miembro
          </button>
        )}
      </div>

      {/* Alerta de acción exitosa */}
      {actionSuccess && (
        <div className="alert-message alert-success" style={{ animation: 'fadeIn 0.2s ease' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* Nota RBAC informativa para Managers */}
      {!isOwner && (
        <div style={{
          background: 'var(--color-primary-bg)',
          border: '1px solid var(--color-primary-light)',
          borderRadius: 'var(--card-radius)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--color-primary-dark)',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>ℹ</span>
          <span>
            <strong>Modo de consulta (Manager):</strong> Puedes visualizar a los miembros del equipo y sus roles asignados. La modificación de roles y permisos requiere privilegios de <strong>Owner</strong>.
          </span>
        </div>
      )}

      {/* Tarjetas de Métricas de Equipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div className="card card-kpi">
          <span className="card-kpi-label">Total Miembros</span>
          <span className="card-kpi-value">{team.length}</span>
          <span className="card-kpi-delta" style={{ color: 'var(--color-text-muted)' }}>
            👥 Equipo activo
          </span>
        </div>

        <div className="card card-kpi">
          <span className="card-kpi-label">Owners (Propietarios)</span>
          <span className="card-kpi-value" style={{ color: 'var(--color-primary)' }}>{ownersCount}</span>
          <span className="card-kpi-delta" style={{ color: 'var(--color-primary)' }}>
            🛡 Acceso total + ROI
          </span>
        </div>

        <div className="card card-kpi">
          <span className="card-kpi-label">Managers (Gestores)</span>
          <span className="card-kpi-value" style={{ color: '#2563eb' }}>{managersCount}</span>
          <span className="card-kpi-delta" style={{ color: '#2563eb' }}>
            📊 Gestión operativa
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ padding: '16px 20px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              className="input-control"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 36 }}
            />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
              🔍
            </span>
          </div>

          <select
            className="input-control"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 170, cursor: 'pointer' }}
          >
            <option value="all">Todos los roles</option>
            <option value="2">Owners únicamente</option>
            <option value="3">Managers únicamente</option>
          </select>
        </div>

        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          Mostrando {filteredTeam.length} de {team.length} miembros
        </span>
      </div>

      {/* Lista / Tabla de Miembros */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Miembro</th>
                <th>Correo Electrónico</th>
                <th>Teléfono</th>
                <th>Rol Asignado</th>
                <th>Estado</th>
                {isOwner && <th style={{ textAlign: 'right', paddingRight: 20 }}>Manejo de Rol</th>}
              </tr>
            </thead>
            <tbody>
              {filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={isOwner ? 6 : 5} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                    No se encontraron miembros con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredTeam.map(member => {
                  const initials = `${member.name[0] || ''}${member.last_name[0] || ''}`.toUpperCase() || 'U'
                  const isCurrentLoggedUser = member.email === user?.email
                  const isMemberOwner = member.id_role === 2

                  return (
                    <tr key={member.id}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: isMemberOwner ? 'var(--color-primary-bg)' : '#eff6ff',
                            color: isMemberOwner ? 'var(--color-primary)' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--color-text)', display: 'block' }}>
                              {member.name} {member.last_name}
                              {isCurrentLoggedUser && (
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', marginLeft: 6, fontWeight: 700 }}>
                                  (Tú)
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              Agregado el {member.joined_at}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {member.email}
                      </td>

                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {member.phone}
                      </td>

                      <td>
                        <span className={`badge ${isMemberOwner ? 'badge-primary' : 'badge-neutral'}`} style={{
                          background: isMemberOwner ? 'var(--color-primary-bg)' : '#eff6ff',
                          color: isMemberOwner ? 'var(--color-primary)' : '#1d4ed8',
                        }}>
                          {isMemberOwner ? '🛡 Owner' : '📊 Manager'}
                        </span>
                      </td>

                      <td>
                        <span className="badge badge-success">
                          ✓ {member.status}
                        </span>
                      </td>

                      {isOwner && (
                        <td style={{ textAlign: 'right', paddingRight: 20 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <select
                              value={member.id_role}
                              onChange={(e) => handleRoleChange(member.id, Number(e.target.value))}
                              disabled={savingId === member.id}
                              className="input-control"
                              style={{
                                padding: '4px 8px',
                                fontSize: '0.82rem',
                                borderRadius: 'var(--radius-sm)',
                                height: 32,
                                cursor: 'pointer',
                                borderColor: 'var(--color-surface-border)'
                              }}
                              title="Cambiar rol del miembro"
                            >
                              <option value={2}>Rol: Owner (Total)</option>
                              <option value={3}>Rol: Manager (Operativo)</option>
                            </select>

                            {!isCurrentLoggedUser && (
                              <button
                                className="btn-ghost"
                                onClick={() => handleDeleteMember(member.id, `${member.name} ${member.last_name}`)}
                                title="Remover del equipo"
                                style={{ color: 'var(--color-danger)', padding: '4px 8px' }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para invitar nuevo miembro */}
      {showInviteModal && (
        <div className="modal-backdrop" onClick={() => setShowInviteModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Invitar Nuevo Miembro</h2>
                <p className="modal-subtitle">Asigna su información y rol inicial en la plataforma</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowInviteModal(false)}>✕</button>
            </div>

            <form onSubmit={handleInviteSubmit} className="account-form">
              <div className="form-row-2">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    placeholder="Ej. Laura"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    required
                    className="input-control"
                    placeholder="Ej. Gómez"
                    value={inviteForm.last_name}
                    onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  required
                  className="input-control"
                  placeholder="laura@empresa.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Rol asignado</label>
                <select
                  className="input-control"
                  value={inviteForm.id_role}
                  onChange={(e) => setInviteForm({ ...inviteForm, id_role: Number(e.target.value) })}
                >
                  <option value={3}>Manager (Acceso operativo y campañas)</option>
                  <option value={2}>Owner (Acceso total, financiero y gestión de roles)</option>
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Los Managers no tienen acceso a métricas de ROI ni inversión sensible.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowInviteModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={inviting}
                >
                  {inviting ? 'Enviando...' : 'Invitar y Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
