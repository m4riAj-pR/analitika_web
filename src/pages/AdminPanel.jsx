import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import DashboardShell, {
  IconBuilding, IconUsers, IconConnect, IconShield
} from '../components/DashboardShell'
import DetailPanel from '../components/DetailPanel'
import { api } from '../services/api'

/* ─── Sidebar config Super Admin ─────────────────────────────── */
const ADMIN_SIDEBAR = [
  { id: 'empresas',     label: 'Empresas',    to: '/admin',              exact: true,  icon: <IconBuilding /> },
  { id: 'roles',        label: 'Roles',       to: '/admin/roles',        exact: false, icon: <IconShield /> },
  {
    id: 'conexiones',
    label: 'Conexiones',
    to: '/admin/conexiones',
    exact: false,
    icon: <IconConnect />,
    // DECISIÓN: Incluido como placeholder navegable.
    // Vista muestra conexiones de Meta Ads por empresa (TODO: endpoint agregado).
  },
]

/* ─── Tabs ────────────────────────────────────────────────────── */
const ADMIN_TABS = [
  { id: 'empresas',   label: 'Empresas',   to: '/admin',              exact: true },
  { id: 'roles',      label: 'Roles',      to: '/admin/roles',        exact: false },
  { id: 'conexiones', label: 'Conexiones', to: '/admin/conexiones',   exact: false },
]

/* ─── Main Admin page ─────────────────────────────────────────── */
export default function AdminPanel({ user, onLogout, onUpdateUser }) {
  return (
    <DashboardShell
      sidebarItems={ADMIN_SIDEBAR}
      tabs={ADMIN_TABS}
      user={user}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
    >
      <Routes>
        <Route index              element={<EmpresasHome />} />
        <Route path="roles"       element={<RolesView />} />
        <Route path="conexiones"  element={<ConexionesView />} />
        <Route path="*"           element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardShell>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Empresas Home (pestaña principal Super Admin)
   ══════════════════════════════════════════════════════════════ */
function EmpresasHome() {
  const [companies, setCompanies]             = useState([])
  const [loading, setLoading]                 = useState(true)
  const [persons, setPersons]                 = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [panelOpen, setPanelOpen]             = useState(false)

  useEffect(() => {
    Promise.all([
      api.admin.getCompanies().catch(() => api.companies.getAll().catch(() => [])),
      api.admin.getUsersByRole().catch(() => null),
      api.persons.getAll().catch(() => []),
    ]).then(([co, usersByRole, pe]) => {
      setCompanies(Array.isArray(co) ? co : [])

      const personsList = Array.isArray(pe) ? pe : []
      const mergedPersons = []

      // Consolidar usuarios mapeados por rol desde el backend
      if (usersByRole) {
        const owners = usersByRole.owners || []
        const managers = usersByRole.managements || []
        const allRoleUsers = [...owners, ...managers]

        allRoleUsers.forEach(ru => {
          const personMatch = personsList.find(p => p.email === ru.email) || {}
          const compId = ru.id_company || ru.company_id || personMatch.id_company || personMatch.company_id
          const resolvedName = [personMatch.name || personMatch.nombre, personMatch.last_name || personMatch.apellido].filter(Boolean).join(' ').trim() || ru.email.split('@')[0]
          mergedPersons.push({
            id: ru.id_user,
            id_user: ru.id_user,
            id_person: personMatch.id_person || personMatch.id,
            name: resolvedName,
            email: ru.email,
            id_role: ru.id_role,
            id_company: compId,
          })
        })
      }

      // Si hay personas en personsList que no estaban en usersByRole
      personsList.forEach(p => {
        const alreadyIn = mergedPersons.find(m => m.email === p.email)
        const compId = p.id_company || p.company_id
        if (!alreadyIn) {
          const resolvedName = [p.name || p.nombre, p.last_name || p.apellido].filter(Boolean).join(' ').trim() || p.email.split('@')[0]
          mergedPersons.push({
            id: p.id || p.id_person,
            id_user: p.id_user || p.id || p.id_person,
            id_person: p.id_person || p.id,
            name: resolvedName,
            email: p.email,
            id_role: p.id_role || 3,
            id_company: compId,
          })
        } else if (!alreadyIn.id_company && compId) {
          alreadyIn.id_company = compId
        }
      })

      setPersons(mergedPersons)
    }).finally(() => setLoading(false))
  }, [])

  // Métricas de plataforma
  const totalCompanies = companies.length
  const totalUsers     = persons.length
  const totalCampaigns = companies.reduce((s, c) => s + (c.campaigns_count || c.total_campaigns || 0), 0)

  const openPanel = (company) => {
    setSelectedCompany(company)
    setPanelOpen(true)
  }

  const handleRoleUpdated = (personId, newRole) => {
    setPersons(prev =>
      prev.map(p =>
        p.id === personId || p.id_user === personId
          ? { ...p, id_role: newRole }
          : p
      )
    )
  }

  return (
    <>
      <div className="dashboard-grid">
        {/* ── Columna izquierda — 3 KPIs de plataforma ── */}
        <div className="dashboard-col-left">
          <div className="card card-kpi">
            <span className="card-kpi-label">Empresas registradas</span>
            {loading
              ? <div className="skeleton" style={{ height: 40, width: '60%' }} />
              : <span className="card-kpi-value">{totalCompanies}</span>}
          </div>
          <div className="card card-kpi">
            <span className="card-kpi-label">Usuarios totales</span>
            {loading
              ? <div className="skeleton" style={{ height: 40, width: '60%' }} />
              : <span className="card-kpi-value">{totalUsers}</span>}
          </div>
          <div className="card card-kpi">
            <span className="card-kpi-label">Campañas activas</span>
            {loading
              ? <div className="skeleton" style={{ height: 40, width: '60%' }} />
              : <span className="card-kpi-value">{totalCampaigns}</span>}
          </div>
        </div>

        {/* ── Columna derecha ── */}
        <div className="dashboard-col-right">
          {/* Tarjeta ancha — empresas recientes */}
          <div className="card card-campaigns">
            <div className="card-title">
              <span>Empresas recientes</span>
              <span className="badge badge-neutral">{companies.length} total</span>
            </div>
            {loading ? (
              <div style={{ display: 'flex', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton" style={{ height: 38, width: 120, borderRadius: 999 }} />
                ))}
              </div>
            ) : companies.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Sin empresas registradas</p>
            ) : (
              <div className="campaign-chips">
                {companies.slice(0, 12).map(co => {
                  const compId = co.id_company || co.id
                  const name = co.nombre_empresa || co.name || co.nombre || co.company_name || `Empresa ${compId}`
                  return (
                    <button
                      key={compId}
                      className="campaign-chip"
                      onClick={() => openPanel(co)}
                      id={`company-chip-${compId}`}
                    >
                      <span className="campaign-chip-dot active" />
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tarjeta grande — tabla de empresas con Owners/Managers */}
          <div className="card card-chart" style={{ minHeight: 300 }}>
            <div className="card-title">Empresas — Owners y Managers</div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 40 }} />)}
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Owners</th>
                      <th>Managers</th>
                      <th>Campañas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                          Sin empresas
                        </td>
                      </tr>
                    ) : companies.map(co => {
                      const compId   = co.id_company || co.id
                      const name     = co.nombre_empresa || co.name || co.nombre || co.company_name || `Empresa ${compId}`
                      const owners   = co.owners ?? co.owners_count ?? co.total_owners ?? '—'
                      const managers = co.managements ?? co.managers_count ?? co.total_managers ?? '—'
                      const camps    = co.campaigns_count ?? co.total_campaigns ?? '—'
                      const initial  = name[0]?.toUpperCase() || 'E'
                      return (
                        <tr key={compId} onClick={() => openPanel(co)} id={`company-row-${compId}`}>
                          <td>
                            <div className="company-row">
                              <div className="company-avatar">{initial}</div>
                              <span style={{ fontWeight: 600 }}>{name}</span>
                            </div>
                          </td>
                          <td>{owners}</td>
                          <td>{managers}</td>
                          <td>{camps}</td>
                          <td>
                            <button
                              className="btn-ghost"
                              onClick={(e) => { e.stopPropagation(); openPanel(co) }}
                              aria-label={`Ver detalle de ${name}`}
                            >
                              →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail Panel — empresa ── */}
      <DetailPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={selectedCompany
          ? (selectedCompany.nombre_empresa || selectedCompany.name || selectedCompany.nombre || 'Detalle de empresa')
          : 'Detalle'}
      >
        {selectedCompany && (
          <CompanyDetail
            company={selectedCompany}
            persons={persons}
            onRoleUpdated={handleRoleUpdated}
          />
        )}
      </DetailPanel>
    </>
  )
}

/* ── Detalle empresa en el panel ─────────────────────────────── */
function CompanyDetail({ company, persons, onRoleUpdated }) {
  const companyId = company.id_company || company.id
  const name = company.nombre_empresa || company.name || company.nombre || company.company_name || '—'

  // Usuarios de esta empresa desde el estado global
  const matchedFromPersons = persons.filter(p =>
    (p.id_company != null && String(p.id_company) === String(companyId)) ||
    (p.company_id != null && String(p.company_id) === String(companyId))
  )

  const [extraManagements, setExtraManagements] = useState([])
  const [loadingExtra, setLoadingExtra] = useState(false)

  // Consulta proactiva al endpoint de managements de la empresa
  useEffect(() => {
    if (companyId) {
      setLoadingExtra(true)
      api.companies.getManagements(companyId)
        .then(res => {
          if (Array.isArray(res)) {
            setExtraManagements(res)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingExtra(false))
    }
  }, [companyId])

  // Consolidar usuarios eliminando duplicados por email/id
  const companyPersons = [...matchedFromPersons]
  extraManagements.forEach(em => {
    const email = em.email
    const exists = companyPersons.some(p => p.email === email || (em.id && p.id === em.id))
    if (!exists) {
      companyPersons.push({
        id: em.id || em.id_user || em.id_person || Date.now(),
        id_user: em.id_user || em.id,
        name: [em.name || em.nombre, em.last_name || em.apellido].filter(Boolean).join(' ').trim() || email.split('@')[0],
        email: email,
        id_role: em.id_role || 3,
        id_company: companyId,
      })
    }
  })

  const roleLabel = (role) => {
    if (role === 1 || role === 'super_admin') return 'Super Admin'
    if (role === 2 || role === 'owner')       return 'Owner'
    if (role === 3 || role === 'manager')     return 'Manager'
    return `Rol ${role}` || '—'
  }

  const [editingPersonId, setEditingPersonId] = useState(null)
  const [savingId, setSavingId]               = useState(null)
  const [feedback, setFeedback]               = useState('')

  const handleRoleChange = async (person, newRole) => {
    const targetUserId = person.id_user || person.id || person.id_person
    setSavingId(person.id)
    setFeedback('')

    try {
      await api.admin.updateUserRole(targetUserId, newRole)
      if (onRoleUpdated) {
        onRoleUpdated(person.id, newRole)
      }
      setFeedback(`¡Rol de ${person.name || person.email} actualizado exitosamente a ${roleLabel(newRole)}!`)
      setTimeout(() => setFeedback(''), 3000)
    } catch {
      try {
        await api.persons.updateRole(targetUserId, newRole)
        if (onRoleUpdated) {
          onRoleUpdated(person.id, newRole)
        }
        setFeedback(`¡Rol de ${person.name || person.email} actualizado a ${roleLabel(newRole)}!`)
        setTimeout(() => setFeedback(''), 3000)
      } catch {
        setFeedback('Error al actualizar el rol en la base de datos.')
        setTimeout(() => setFeedback(''), 3500)
      }
    } finally {
      setSavingId(null)
      setEditingPersonId(null)
    }
  }

  const ownersCount = companyPersons.filter(p => Number(p.id_role) === 2).length || (company.owners ?? company.owners_count ?? 0)
  const managersCount = companyPersons.filter(p => Number(p.id_role) === 3).length || (company.managements ?? company.managers_count ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Nombre */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{name}</h2>
        {company.email && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            {company.email}
          </p>
        )}
      </div>

      {/* Alerta de feedback */}
      {feedback && (
        <div className={`alert-message ${feedback.startsWith('Error') ? 'alert-error' : 'alert-success'}`}>
          {feedback}
        </div>
      )}

      {/* Métricas */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-row">
          <span className="detail-kpi-label">Owners</span>
          <span className="detail-kpi-value">{ownersCount}</span>
        </div>
        <div className="detail-kpi-row">
          <span className="detail-kpi-label">Managers</span>
          <span className="detail-kpi-value">{managersCount}</span>
        </div>
      </div>

      {/* Lista de usuarios con edición de rol */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
            Usuarios Asignados ({companyPersons.length})
          </p>
          {loadingExtra && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)' }}>
              Sincronizando managers...
            </span>
          )}
        </div>

        {companyPersons.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            No hay usuarios cargados para esta empresa.
          </p>
        ) : companyPersons.map(person => {
          const fullName = person.name || person.nombre || person.email || '—'
          const isEditing = editingPersonId === person.id
          const isSaving  = savingId === person.id

          return (
            <div
              key={person.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--color-surface-border)'
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fullName}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{person.email}</p>
              </div>

              {isEditing ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    defaultValue={person.id_role}
                    style={{
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-surface-border)',
                      fontSize: '0.8rem', fontFamily: 'inherit',
                      background: 'var(--color-surface)', cursor: 'pointer'
                    }}
                    onChange={(e) => handleRoleChange(person, Number(e.target.value))}
                    disabled={isSaving}
                    id={`role-select-${person.id}`}
                  >
                    <option value={2}>Owner</option>
                    <option value={3}>Manager</option>
                  </select>
                  <button
                    className="btn-ghost"
                    onClick={() => setEditingPersonId(null)}
                    title="Cancelar edición"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge badge-neutral">{roleLabel(person.id_role)}</span>
                  <button
                    className="btn-ghost"
                    onClick={() => setEditingPersonId(person.id)}
                    aria-label={`Editar rol de ${fullName}`}
                    title="Editar rol de este usuario"
                    id={`edit-role-btn-${person.id}`}
                  >
                    ✎
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Roles (Super Admin)
   ══════════════════════════════════════════════════════════════ */
function RolesView() {
  const roleDefinitions = [
    { id: 1, name: 'Super Admin', desc: 'Administra la plataforma completa: empresas, usuarios y roles.', color: 'var(--color-danger)' },
    { id: 2, name: 'Owner',       desc: 'Acceso completo a campañas y KPIs financieros de su empresa.', color: 'var(--color-primary)' },
    { id: 3, name: 'Manager',     desc: 'Acceso operativo: clics y conversiones. Sin métricas financieras.', color: 'var(--color-warn)' },
  ]

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Definición de Roles</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {roleDefinitions.map(role => (
          <div key={role.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 'var(--radius-md)',
              background: `${role.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontWeight: 800, color: role.color, fontSize: '0.85rem'
            }}>
              R{role.id}
            </div>
            <div>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>{role.name}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{role.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla RBAC en capa de presentación */}
      <div className="card" style={{ marginTop: 28 }}>
        <p style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.9rem' }}>
          RBAC — Capa de Presentación (Web + Móvil)
        </p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Funcionalidad</th>
              <th>Super Admin</th>
              <th>Owner</th>
              <th>Manager</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Dashboard de campañas', '✗',  '✓', '✓'],
              ['KPIs de clics/conv.',   '✗',  '✓', '✓'],
              ['KPIs financieros (ROI/ROAS/CPC/CPA)', '✗', '✓', '✗ (backend no los devuelve)'],
              ['Ranking con ROI',       '✗',  '✓', '✗ (sin campo ROI en respuesta)'],
              ['Crear campaña',         '✗',  '✓', '✓'],
              ['Links trackeables',     '✗',  '✓', '✓'],
              ['Gestión de empresas',   '✓',  '✗', '✗'],
              ['Gestión de roles',      '✓',  '✗', '✗'],
              ['Vista Conexiones Meta', '✓',  '✗', '✗'],
            ].map(([feat, sa, ow, mg]) => (
              <tr key={feat}>
                <td style={{ fontWeight: 500 }}>{feat}</td>
                <td style={{ color: sa === '✗' ? 'var(--color-danger)' : 'var(--color-success)' }}>{sa}</td>
                <td style={{ color: ow === '✗' ? 'var(--color-danger)' : 'var(--color-success)' }}>{ow}</td>
                <td style={{
                  color: mg.startsWith('✗') ? 'var(--color-danger)' : 'var(--color-success)',
                  fontSize: mg.length > 3 ? '0.75rem' : 'inherit'
                }}>{mg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Conexiones Meta Ads (placeholder)
   DECISIÓN: Incluido como placeholder. El endpoint de conexiones
   agregadas por empresa aún no está expuesto en la API.
   TODO: conectar con endpoint /analitika/connections cuando esté disponible.
   ══════════════════════════════════════════════════════════════ */
function ConexionesView() {
  return (
    <div className="card" style={{ width: '100%', padding: 32 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary-bg)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)'
        }}>
          <div style={{ width: 24, height: 24 }}>
            <IconConnect />
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Conexiones de Meta Ads</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Vista agregada por empresa</p>
        </div>
      </div>
      <div style={{
        background: 'var(--color-warn-bg)', border: '1px solid var(--color-warn)',
        borderRadius: 'var(--radius-md)', padding: '12px 16px',
        fontSize: '0.85rem', color: 'var(--color-warn)'
      }}>
        <strong>TODO:</strong> Esta vista requiere el endpoint <code>/analitika/connections</code> que
        aún no está expuesto. Una vez disponible, listará las cuentas de Meta Ads vinculadas por empresa.
      </div>
    </div>
  )
}
