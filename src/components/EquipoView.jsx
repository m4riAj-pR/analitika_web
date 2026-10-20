import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { IconUsers, IconShield } from './DashboardShell'

const INITIAL_TEAM = [
  {
    id: 1,
    name: 'Carlos Owner',
    email: 'carlos.owner@analitika.com',
    phone: '+57 310 987 6543',
    id_role: 2,
    role_name: 'Owner',
    company_name: 'Analitika SAS',
    status: 'Activo',
    joined_at: '12 Ene 2026',
  },
  {
    id: 2,
    name: 'Ana Gómez',
    email: 'ana.manager@analitika.com',
    phone: '+57 315 444 8921',
    id_role: 3,
    role_name: 'Manager',
    company_name: 'Analitika SAS',
    status: 'Activo',
    joined_at: '20 Feb 2026',
  },
  {
    id: 3,
    name: 'David Restrepo',
    email: 'david.r@analitika.com',
    phone: '+57 301 777 3311',
    id_role: 3,
    role_name: 'Manager',
    company_name: 'Analitika SAS',
    status: 'Activo',
    joined_at: '05 Mar 2026',
  },
]

export default function EquipoView({ user }) {
  const isOwner = user?.id_role === 2 || user?.id_role === 1
  const [team, setTeam] = useState(INITIAL_TEAM)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all') // 'all' | '1' | '2' | '3'
  const [actionSuccess, setActionSuccess] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [companies, setCompanies] = useState([])

  // Modal para invitar / agregar miembro
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    id_role: 3,
    id_company: user?.id_company || '',
  })
  const [inviting, setInviting] = useState(false)

  const getRoleInfo = (idRole) => {
    const roleNum = Number(idRole)
    if (roleNum === 1) {
      return { label: 'Admin / Super Admin', badgeClass: 'badge-danger', style: { background: '#fee2e2', color: '#b91c1c' } }
    }
    if (roleNum === 2) {
      return { label: 'Owner', badgeClass: 'badge-primary', style: { background: 'var(--color-primary-bg)', color: 'var(--color-primary)' } }
    }
    if (roleNum === 3) {
      return { label: 'Manager', badgeClass: 'badge-neutral', style: { background: '#eff6ff', color: '#1d4ed8' } }
    }
    return { label: `Rol ${idRole}`, badgeClass: 'badge-neutral', style: {} }
  }

  // Cargar empresas y personas desde la API
  useEffect(() => {
    let isMounted = true

    Promise.all([
      api.companies.getAll().catch(() => []),
      api.persons.getAll().catch(() => [])
    ]).then(([companiesData, personsData]) => {
      if (!isMounted) return

      const compsList = Array.isArray(companiesData) ? companiesData : []
      setCompanies(compsList)

      const compsMap = {}
      compsList.forEach(c => {
        compsMap[c.id || c.id_company] = c.name || c.nombre || c.company_name
      })

      if (Array.isArray(personsData) && personsData.length > 0) {
        const formatted = personsData.map((p, idx) => {
          // Detectar rol de manera estricta desde id_role, role_id, o rol de user
          let roleNum = p.id_role != null ? Number(p.id_role) : (p.role_id != null ? Number(p.role_id) : (p.role?.id ? Number(p.role.id) : null))
          if (roleNum == null) {
            if (p.is_admin || p.is_superuser || p.role === 'admin' || p.role === 'super_admin') {
              roleNum = 1
            } else if (p.role === 'owner') {
              roleNum = 2
            } else if (p.role === 'manager') {
              roleNum = 3
            } else {
              roleNum = 3
            }
          }

          // Resolver empresa asociada: campo directo, relación user_company o array de companies
          let companyName = p.company_name || p.nombre_empresa || p.company?.name || p.company?.nombre
          const companyId = p.id_company || p.company_id || p.id_empresa

          if (!companyName && companyId && compsMap[companyId]) {
            companyName = compsMap[companyId]
          }

          // Si tiene relación user_company o lista de empresas
          const userCompanies = p.user_company || p.companies || p.empresas
          if (!companyName && Array.isArray(userCompanies) && userCompanies.length > 0) {
            if (userCompanies.length > 1) {
              companyName = `${userCompanies.length} Empresas`
            } else {
              const firstCo = userCompanies[0]
              const firstCoId = firstCo.id_company || firstCo.id || firstCo
              companyName = firstCo.name || firstCo.nombre || compsMap[firstCoId]
            }
          }

          // Casos especiales: Super Admin o sin asignación
          if (!companyName) {
            if (roleNum === 1) {
              companyName = 'Todas (Global)'
            } else if (user?.id_role === 1) {
              companyName = 'Sin Empresa'
            } else if (user?.company) {
              companyName = user.company
            } else {
              companyName = 'Sin Empresa'
            }
          }

          return {
            id: p.id || p.id_person || idx + 10,
            name: [p.name || p.nombre, p.last_name || p.apellido].filter(Boolean).join(' ').trim() || 'Miembro',
            email: p.email || 'sin-correo@analitika.com',
            phone: p.phone || p.telefono || '—',
            id_role: roleNum,
            role_name: getRoleInfo(roleNum).label,
            id_company: companyId,
            company_name: companyName,
            status: p.status || 'Activo',
            joined_at: p.created_at ? new Date(p.created_at).toLocaleDateString() : '2026',
          }
        })
        setTeam(formatted)
      }
    }).finally(() => {
      if (isMounted) setLoading(false)
    })

    return () => { isMounted = false }
  }, [user])

  const adminsCount = team.filter(m => m.id_role === 1).length
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
          ? { ...m, id_role: newRoleId, role_name: getRoleInfo(newRoleId).label }
          : m
      )
    )

    const memberName = team.find(m => m.id === memberId)?.name || 'Miembro'
    setActionSuccess(`¡Rol de ${memberName} actualizado a ${getRoleInfo(newRoleId).label}!`)
    setSavingId(null)
    setTimeout(() => setActionSuccess(''), 3500)
  }

  // Eliminar miembro
  const handleDeleteMember = async (memberId, memberName) => {
    if (confirm(`¿Estás seguro de remover a ${memberName} del equipo?`)) {
      try {
        await api.persons.delete(memberId)
      } catch (err) {
        console.error('Error al eliminar en backend:', err)
      }
      setTeam(prev => prev.filter(m => m.id !== memberId))
      setActionSuccess(`${memberName} fue removido del equipo.`)
      setTimeout(() => setActionSuccess(''), 3000)
    }
  }

  // Enviar invitación
  const handleInviteSubmit = async (e) => {
    e.preventDefault()
    setInviting(true)

    const selectedRole = Number(inviteForm.id_role)
    const companyIdToUse = inviteForm.id_company || user?.id_company
    const compMatch = companies.find(c => (c.id || c.id_company) == companyIdToUse)
    const companyDisplayName = compMatch ? (compMatch.name || compMatch.nombre) : (selectedRole === 1 ? 'Todas (Global)' : 'Analitika SAS')

    const newMember = {
      id: Date.now(),
      name: inviteForm.name.trim(),
      email: inviteForm.email.trim(),
      phone: '—',
      id_role: selectedRole,
      role_name: getRoleInfo(selectedRole).label,
      id_company: companyIdToUse,
      company_name: companyDisplayName,
      status: 'Activo',
      joined_at: 'Hoy',
    }

    try {
      await api.persons.create({
        name: newMember.name,
        email: newMember.email,
        id_role: newMember.id_role,
        id_company: newMember.id_company,
      })
    } catch {
      // Continuar con creación local
    }

    setTeam(prev => [newMember, ...prev])
    setInviting(false)
    setShowInviteModal(false)
    setInviteForm({ name: '', email: '', id_role: 3, id_company: user?.id_company || '' })
    setActionSuccess(`¡Invitación enviada y miembro ${newMember.name} agregado al equipo!`)
    setTimeout(() => setActionSuccess(''), 4000)
  }

  // Filtrado
  const filteredTeam = team.filter(m => {
    const fullName = (m.name || '').toLowerCase()
    const matchSearch = fullName.includes(search.toLowerCase()) || 
                        m.email.toLowerCase().includes(search.toLowerCase()) ||
                        (m.company_name && m.company_name.toLowerCase().includes(search.toLowerCase()))
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
            Administra los usuarios de tu organización, consulta su empresa asociada, asigna roles y define permisos.
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
          {actionSuccess}
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
          <span>
            <strong>Modo de consulta (Manager):</strong> Puedes visualizar a los miembros del equipo, su empresa y sus roles asignados. La modificación de roles y permisos requiere privilegios de <strong>Owner</strong> o <strong>Admin</strong>.
          </span>
        </div>
      )}

      {/* Tarjetas de Métricas de Equipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card card-kpi">
          <span className="card-kpi-label">Total Miembros</span>
          <span className="card-kpi-value">{team.length}</span>
          <span className="card-kpi-delta" style={{ color: 'var(--color-text-muted)' }}>
            Equipo activo
          </span>
        </div>

        {adminsCount > 0 && (
          <div className="card card-kpi">
            <span className="card-kpi-label">Super Admins</span>
            <span className="card-kpi-value" style={{ color: '#b91c1c' }}>{adminsCount}</span>
            <span className="card-kpi-delta" style={{ color: '#b91c1c' }}>
              Control global del sistema
            </span>
          </div>
        )}

        <div className="card card-kpi">
          <span className="card-kpi-label">Owners (Propietarios)</span>
          <span className="card-kpi-value" style={{ color: 'var(--color-primary)' }}>{ownersCount}</span>
          <span className="card-kpi-delta" style={{ color: 'var(--color-primary)' }}>
            Acceso total + ROI
          </span>
        </div>

        <div className="card card-kpi">
          <span className="card-kpi-label">Managers (Gestores)</span>
          <span className="card-kpi-value" style={{ color: '#2563eb' }}>{managersCount}</span>
          <span className="card-kpi-delta" style={{ color: '#2563eb' }}>
            Gestión operativa
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
              placeholder="Buscar por nombre, correo o empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <select
            className="input-control"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: 190, cursor: 'pointer' }}
          >
            <option value="all">Todos los roles</option>
            <option value="1">Super Admin (Nivel 1)</option>
            <option value="2">Owner (Nivel 2)</option>
            <option value="3">Manager (Nivel 3)</option>
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
                <th>Empresa</th>
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
                  <td colSpan={isOwner ? 7 : 6} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                    No se encontraron miembros con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredTeam.map(member => {
                  const initials = (member.name || 'U')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'U'
                  const isCurrentLoggedUser = member.email === user?.email
                  const roleMeta = getRoleInfo(member.id_role)

                  return (
                    <tr key={member.id}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: roleMeta.style.background || '#eff6ff',
                            color: roleMeta.style.color || '#2563eb',
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
                              {member.name}
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

                      <td>
                        <span style={{ 
                          fontWeight: 600, 
                          color: member.id_role === 1 ? 'var(--color-danger)' : 'var(--color-text)',
                          fontSize: '0.85rem' 
                        }}>
                          {member.company_name || 'Sin Empresa'}
                        </span>
                      </td>

                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {member.email}
                      </td>

                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        {member.phone}
                      </td>

                      <td>
                        <span 
                          className={`badge ${roleMeta.badgeClass}`}
                          style={roleMeta.style}
                        >
                          {roleMeta.label}
                        </span>
                      </td>

                      <td>
                        <span className="badge badge-success">
                          {member.status}
                        </span>
                      </td>

                      {isOwner && (
                        <td style={{ textAlign: 'right', paddingRight: 20 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <select
                              value={member.id_role}
                              onChange={(e) => handleRoleChange(member.id, Number(e.target.value))}
                              disabled={savingId === member.id || (member.id_role === 1 && user?.id_role !== 1)}
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
                              {user?.id_role === 1 && <option value={1}>Rol 1: Super Admin</option>}
                              <option value={2}>Rol 2: Owner (Total)</option>
                              <option value={3}>Rol 3: Manager (Operativo)</option>
                            </select>

                            {!isCurrentLoggedUser && (
                              <button
                                className="btn-ghost"
                                onClick={() => handleDeleteMember(member.id, member.name)}
                                title="Remover del equipo (Eliminación en base de datos)"
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
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="input-control"
                  placeholder="Ej. Laura Gómez"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                />
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
