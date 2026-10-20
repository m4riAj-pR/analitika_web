import { useMemo, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import DetailPanel from '../components/DetailPanel'
import { IconBuilding, IconShield, IconArrowRight, IconCheck, IconMinus } from '../components/ui/Icons'
import {
  PageHeader, StatTile, StatGrid, ChartCard, ErrorState, EmptyState, SkeletonRows,
} from '../components/ui'
import { BarList } from '../components/charts'
import { api } from '../services/api'
import useAsync from '../lib/useAsync'
import { fmtInt, roleLabel } from '../lib/format'

const NAV = [
  { id: 'empresas', label: 'Empresas', to: '/admin',       exact: true,  icon: <IconBuilding /> },
  { id: 'roles',    label: 'Roles',    to: '/admin/roles', exact: false, icon: <IconShield /> },
]

export default function AdminPanel({ user, onLogout, onUpdateUser }) {
  return (
    <DashboardShell sidebarItems={NAV} tabs={NAV} user={user} onLogout={onLogout} onUpdateUser={onUpdateUser}>
      <Routes>
        <Route index element={<EmpresasHome />} />
        <Route path="roles" element={<RolesView />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardShell>
  )
}

/* ─── Carga consolidada para Super Admin ───────────────────── */
async function loadPlatform() {
  const [companies, byRole, persons, campaigns] = await Promise.all([
    api.admin.getCompanies(),
    api.admin.getUsersByRole(),
    api.persons.getAll().catch(() => []),
    api.campaigns.getAll().catch(() => []),
  ])
  const nameByEmail = new Map(persons.map(p => [(p.email || '').toLowerCase(), p.name]))
  const withName = (u) => ({ ...u, name: nameByEmail.get((u.email || '').toLowerCase()) || u.email })
  const campaignsByCompany = new Map()
  campaigns.forEach(c => {
    const e = campaignsByCompany.get(c.id_company) || { total: 0, active: 0 }
    e.total += 1
    if (c.status === 'active') e.active += 1
    campaignsByCompany.set(c.id_company, e)
  })
  return {
    companies: companies.map(c => ({
      id: c.id_company,
      name: c.nombre_empresa || c.name || `Empresa ${c.id_company}`,
      owners: Number(c.owners) || 0,
      managers: Number(c.managements) || 0,
      campaigns: campaignsByCompany.get(c.id_company)?.total || 0,
      activeCampaigns: campaignsByCompany.get(c.id_company)?.active || 0,
    })),
    unassigned: (byRole?.unassigned || []).map(withName),
    nameByEmail,
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
  }
}

function EmpresasHome() {
  const { data, loading, error, reload } = useAsync(loadPlatform, [])
  const [selected, setSelected] = useState(null)
  const companies = useMemo(() => data?.companies || [], [data])
  const busy = loading && !data

  const owners = companies.reduce((s, c) => s + c.owners, 0)
  const managers = companies.reduce((s, c) => s + c.managers, 0)
  const byUsers = [...companies].sort((a, b) => (b.owners + b.managers) - (a.owners + a.managers))
  const byCampaigns = [...companies].sort((a, b) => b.campaigns - a.campaigns)

  return (
    <div className="page">
      <PageHeader title="Administración de la plataforma" subtitle="Empresas registradas, sus usuarios y su actividad" />
      {error && <ErrorState message={error.message} onRetry={reload} />}

      <StatGrid>
        <StatTile label="Empresas" value={fmtInt(companies.length)} loading={busy} />
        <StatTile label="Owners" value={fmtInt(owners)} loading={busy} />
        <StatTile label="Managers" value={fmtInt(managers)} loading={busy} />
        <StatTile label="Usuarios sin empresa" value={fmtInt(data?.unassigned.length)} loading={busy} />
        <StatTile label="Campañas activas" value={fmtInt(data?.activeCampaigns)} hint={`de ${fmtInt(data?.totalCampaigns)} registradas`} loading={busy} />
      </StatGrid>

      <div className="grid-2">
        <ChartCard
          title="Usuarios por empresa"
          subtitle="Owners y managers asignados"
          table={{
            columns: [{ key: 'name', label: 'Empresa' }, { key: 'owners', label: 'Owners', align: 'right', format: fmtInt }, { key: 'managers', label: 'Managers', align: 'right', format: fmtInt }],
            rows: byUsers,
          }}
        >
          {busy ? <SkeletonRows rows={4} height={28} /> : companies.length === 0 ? <EmptyState title="Sin empresas registradas" /> : (
            <BarList
              rows={byUsers.map(c => ({ id: c.id, label: c.name, values: { owners: c.owners, managers: c.managers }, company: c }))}
              series={[{ key: 'owners', name: 'Owners', format: fmtInt }, { key: 'managers', name: 'Managers', format: fmtInt }]}
              onSelect={(r) => setSelected(r.company)}
            />
          )}
        </ChartCard>
        <ChartCard
          title="Campañas por empresa"
          subtitle="Total de campañas registradas"
          table={{
            columns: [{ key: 'name', label: 'Empresa' }, { key: 'campaigns', label: 'Campañas', align: 'right', format: fmtInt }, { key: 'activeCampaigns', label: 'Activas', align: 'right', format: fmtInt }],
            rows: byCampaigns,
          }}
        >
          {busy ? <SkeletonRows rows={4} height={28} /> : companies.length === 0 ? <EmptyState title="Sin empresas registradas" /> : (
            <BarList
              rows={byCampaigns.map(c => ({ id: c.id, label: c.name, values: { campaigns: c.campaigns }, company: c }))}
              series={[{ key: 'campaigns', name: 'Campañas', format: fmtInt }]}
              onSelect={(r) => setSelected(r.company)}
            />
          )}
        </ChartCard>
      </div>

      <div className="card card-flush">
        <div className="card-flush-head">
          <h2 className="chart-card-title">Empresas</h2>
          <span className="badge badge-neutral">{fmtInt(companies.length)}</span>
        </div>
        {busy ? <div style={{ padding: 20 }}><SkeletonRows rows={4} /></div> : companies.length === 0 ? <EmptyState title="Sin empresas" /> : (
          <div className="table-scroll">
            <table className="data-table data-table-interactive">
              <thead>
                <tr><th>Empresa</th><th className="num">Owners</th><th className="num">Managers</th><th className="num">Campañas</th><th className="num">Activas</th><th aria-label="Acciones" /></tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} onClick={() => setSelected(c)}>
                    <td>
                      <div className="person-cell">
                        <span className="person-avatar" aria-hidden="true">{c.name[0]?.toUpperCase()}</span>
                        <span className="cell-strong">{c.name}</span>
                      </div>
                    </td>
                    <td className="num">{fmtInt(c.owners)}</td>
                    <td className="num">{fmtInt(c.managers)}</td>
                    <td className="num">{fmtInt(c.campaigns)}</td>
                    <td className="num">{fmtInt(c.activeCampaigns)}</td>
                    <td className="num"><span className="row-link">Usuarios <IconArrowRight size={14} /></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.unassigned.length > 0 && (
        <ChartCard title="Usuarios sin empresa" subtitle="Registrados pero sin empresa asociada">
          <ul className="user-list">
            {data.unassigned.map(u => (
              <li key={u.id_user}>
                <span><strong>{u.name}</strong><span className="cell-muted">{u.email}</span></span>
                <span className="badge badge-neutral">{roleLabel(u.id_role)}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}

      <DetailPanel isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name || 'Empresa'}>
        {selected && <CompanyDetail company={selected} nameByEmail={data?.nameByEmail} onChanged={reload} />}
      </DetailPanel>
    </div>
  )
}

function CompanyDetail({ company, nameByEmail, onChanged }) {
  const { data, loading, error, reload } = useAsync(() => api.admin.getUsersByRole(company.id), [company.id])
  const [savingId, setSavingId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const users = [...(data?.owners || []), ...(data?.managements || [])].map(u => ({
    ...u, name: nameByEmail?.get((u.email || '').toLowerCase()) || u.email,
  }))

  const changeRole = async (u, idRole) => {
    setSavingId(u.id_user)
    setFeedback(null)
    try {
      await api.admin.updateUserRole(u.id_user, idRole)
      setFeedback({ type: 'success', text: `${u.name} ahora es ${roleLabel(idRole)}.` })
      reload()
      onChanged?.()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="panel-stack">
      <div className="detail-kpi-grid">
        <div className="detail-kpi-row"><span className="detail-kpi-label">Owners</span><span className="detail-kpi-value">{fmtInt(company.owners)}</span></div>
        <div className="detail-kpi-row"><span className="detail-kpi-label">Managers</span><span className="detail-kpi-value">{fmtInt(company.managers)}</span></div>
        <div className="detail-kpi-row"><span className="detail-kpi-label">Campañas</span><span className="detail-kpi-value">{fmtInt(company.campaigns)}</span></div>
      </div>
      {feedback && <div className={`alert-message ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>{feedback.text}</div>}
      {error && <ErrorState message={error.message} onRetry={reload} />}
      <h3 className="mini-title">Usuarios asignados</h3>
      {loading && !data ? <SkeletonRows rows={3} /> : users.length === 0 ? <EmptyState title="Sin usuarios asignados" /> : (
        <ul className="user-list">
          {users.map(u => (
            <li key={u.id_user}>
              <span><strong>{u.name}</strong><span className="cell-muted">{u.email}</span></span>
              <select
                className="input-control input-sm"
                value={u.id_role}
                disabled={savingId === u.id_user}
                onChange={(e) => changeRole(u, Number(e.target.value))}
                aria-label={`Rol de ${u.name}`}
              >
                <option value={2}>Owner</option>
                <option value={3}>Manager</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─── Roles y permisos ─────────────────────────────────────── */
const ROLES = [
  { id: 1, name: 'Super Admin', desc: 'Administra la plataforma: empresas, usuarios y roles.' },
  { id: 2, name: 'Owner', desc: 'Acceso completo a campañas, equipo y métricas financieras de su empresa.' },
  { id: 3, name: 'Manager', desc: 'Acceso operativo a campañas: clics y conversiones, sin métricas financieras.' },
]

const MATRIX = [
  ['Resumen y desglose de campañas', false, true, true],
  ['Clics y conversiones', false, true, true],
  ['Métricas financieras (ingresos, ROI, ROAS, CPC, CPA)', false, true, false],
  ['Predicción de ROI', false, true, false],
  ['Crear campañas y links de seguimiento', false, true, true],
  ['Gestión de equipo', false, true, false],
  ['Gestión de empresas y roles', true, false, false],
]

function Perm({ ok }) {
  return ok
    ? <span className="perm perm-yes"><IconCheck size={14} /> Sí</span>
    : <span className="perm perm-no"><IconMinus size={14} /> No</span>
}

function RolesView() {
  return (
    <div className="page">
      <PageHeader title="Roles y permisos" subtitle="Control de acceso aplicado por la API y reflejado en la interfaz" />
      <div className="grid-3">
        {ROLES.map(r => (
          <div key={r.id} className="card role-card">
            <span className="role-code">R{r.id}</span>
            <h2 className="chart-card-title">{r.name}</h2>
            <p className="chart-card-subtitle">{r.desc}</p>
          </div>
        ))}
      </div>
      <div className="card card-flush">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr><th>Funcionalidad</th><th>Super Admin</th><th>Owner</th><th>Manager</th></tr>
            </thead>
            <tbody>
              {MATRIX.map(([feat, a, o, m]) => (
                <tr key={feat}>
                  <td className="cell-strong">{feat}</td>
                  <td><Perm ok={a} /></td>
                  <td><Perm ok={o} /></td>
                  <td><Perm ok={m} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
