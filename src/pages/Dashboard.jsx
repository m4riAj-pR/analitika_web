import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import DashboardShell, {
  IconDashboard, IconCampaign, IconUsers, IconLink, IconFolderPlus
} from '../components/DashboardShell'
import DetailPanel from '../components/DetailPanel'
import EquipoView from '../components/EquipoView'
import CrearCampanaForm from '../components/CrearCampanaForm'
import { api } from '../services/api'

/* ─── Sidebar config ─────────────────────────── */
const OWNER_SIDEBAR = [
  { id: 'dashboard', label: 'Dashboard',         to: '/dashboard',          exact: true,  icon: <IconDashboard /> },
  { id: 'campanas',  label: 'Campañas',          to: '/dashboard/campanas', exact: false, icon: <IconCampaign /> },
  { id: 'equipo',    label: 'Gestión de equipo', to: '/dashboard/equipo',   exact: false, icon: <IconUsers /> },
  { id: 'links',     label: 'Links Trackeables', to: '/dashboard/links',    exact: false, icon: <IconLink /> },
  { id: 'crear',     label: 'Crear Campaña',     to: '/dashboard/crear',    exact: false, icon: <IconFolderPlus /> },
]

const MANAGER_SIDEBAR = [
  { id: 'dashboard', label: 'Dashboard',         to: '/dashboard',          exact: true,  icon: <IconDashboard /> },
  { id: 'campanas',  label: 'Campañas',          to: '/dashboard/campanas', exact: false, icon: <IconCampaign /> },
  { id: 'equipo',    label: 'Gestión de equipo', to: '/dashboard/equipo',   exact: false, icon: <IconUsers /> },
  { id: 'links',     label: 'Links Trackeables', to: '/dashboard/links',    exact: false, icon: <IconLink /> },
  { id: 'crear',     label: 'Crear Campaña',     to: '/dashboard/crear',    exact: false, icon: <IconFolderPlus /> },
]

/* ─── Tab configs ────────────────────────────── */
const OWNER_TABS = [
  { id: 'dashboard', label: 'Dashboard',         to: '/dashboard',          exact: true },
  { id: 'campanas',  label: 'Campañas',          to: '/dashboard/campanas', exact: false },
  { id: 'equipo',    label: 'Gestión de equipo', to: '/dashboard/equipo',   exact: false },
]

const MANAGER_TABS = [
  { id: 'dashboard', label: 'Dashboard',         to: '/dashboard',          exact: true },
  { id: 'campanas',  label: 'Campañas',          to: '/dashboard/campanas', exact: false },
  { id: 'equipo',    label: 'Gestión de equipo', to: '/dashboard/equipo',   exact: false },
]

/* ─── Main Dashboard page ────────────────────── */
export default function Dashboard({ user, onLogout, onUpdateUser }) {
  const isOwner   = user?.id_role === 2
  const isManager = user?.id_role === 3

  const sidebarItems = isOwner ? OWNER_SIDEBAR : MANAGER_SIDEBAR
  const tabs         = isOwner ? OWNER_TABS   : MANAGER_TABS

  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      tabs={tabs}
      user={user}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
    >
      <Routes>
        <Route index          element={<DashboardHome user={user} />} />
        <Route path="campanas" element={<CampanasView user={user} />} />
        <Route path="equipo"   element={<EquipoView user={user} />} />
        <Route path="ranking"  element={<Navigate to="/dashboard/equipo" replace />} />
        <Route path="links"    element={<LinksView />} />
        <Route path="crear"    element={<CrearCampanaForm user={user} />} />
        <Route path="*"        element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardShell>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Dashboard Home (pestaña principal)
   ══════════════════════════════════════════════════════════════ */
function DashboardHome({ user }) {
  const isOwner = user?.id_role === 2

  const [campaigns, setCampaigns]           = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [panelOpen, setPanelOpen]           = useState(false)

  useEffect(() => {
    api.campaigns.getAll()
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoadingCampaigns(false))
  }, [])

  // KPIs agregados calculados desde la lista de campañas (el backend ya filtra financieros para Manager)
  const totalClics       = campaigns.reduce((s, c) => s + (c.clicks || c.clics || 0), 0)
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || c.conversiones || 0), 0)
  const activeCampaigns  = campaigns.filter(c => c.status === 'active' || c.estado === 'activa').length

  // ROI promedio — solo presente si el backend lo devuelve (Owner únicamente)
  const roiValues = campaigns.map(c => c.roi).filter(v => v != null)
  const avgRoi    = roiValues.length > 0
    ? (roiValues.reduce((s, v) => s + v, 0) / roiValues.length).toFixed(1)
    : null

  const openPanel = (campaign) => {
    setSelectedCampaign(campaign)
    setPanelOpen(true)
  }

  // Tarjetas KPI — Owner ve ROI; Manager ve campañas activas en su lugar
  const kpiCards = isOwner
    ? [
        { id: 'clics',     label: 'Clics totales',       value: totalClics.toLocaleString(),       delta: null },
        { id: 'conv',      label: 'Conversiones totales', value: totalConversions.toLocaleString(), delta: null },
        { id: 'roi',       label: 'ROI promedio',         value: avgRoi != null ? `${avgRoi}%` : '—', delta: null },
      ]
    : [
        { id: 'clics',    label: 'Clics totales',       value: totalClics.toLocaleString(),        delta: null },
        { id: 'conv',     label: 'Conversiones totales', value: totalConversions.toLocaleString(), delta: null },
        { id: 'activas',  label: 'Campañas activas',    value: activeCampaigns,                    delta: null },
      ]

  return (
    <>
      <div className="dashboard-grid">
        {/* ── Columna izquierda — 3 KPIs pequeños ── */}
        <div className="dashboard-col-left">
          {kpiCards.map(kpi => (
            <div key={kpi.id} className="card card-kpi">
              <span className="card-kpi-label">{kpi.label}</span>
              {loadingCampaigns
                ? <div className="skeleton" style={{ height: 40, width: '70%' }} />
                : <span className="card-kpi-value">{kpi.value}</span>
              }
              {kpi.delta && (
                <span className={`card-kpi-delta ${kpi.delta > 0 ? 'positive' : 'negative'}`}>
                  {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}% vs. semana anterior
                </span>
              )}
            </div>
          ))}
        </div>

        {/* ── Columna derecha ── */}
        <div className="dashboard-col-right">
          {/* Tarjeta ancha — campañas activas */}
          <div className="card card-campaigns">
            <div className="card-title">
              <span>Campañas activas</span>
              <span className="badge badge-neutral">{campaigns.length} total</span>
            </div>

            {loadingCampaigns ? (
              <div style={{ display: 'flex', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="skeleton" style={{ height: 38, width: 120, borderRadius: 999 }} />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                Sin campañas disponibles
              </p>
            ) : (
              <div className="campaign-chips">
                {campaigns.map(c => {
                  const name   = c.name || c.nombre || c.campaign_name || `Campaña ${c.id}`
                  const status = c.status || c.estado || 'active'
                  const dotClass = status === 'active' || status === 'activa' ? 'active'
                                 : status === 'paused' || status === 'pausada' ? 'paused'
                                 : 'inactive'
                  return (
                    <button
                      key={c.id}
                      className="campaign-chip"
                      onClick={() => openPanel(c)}
                      id={`campaign-chip-${c.id}`}
                    >
                      <span className={`campaign-chip-dot ${dotClass}`} />
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tarjeta grande — gráfico principal */}
          <div className="card card-chart">
            <div className="card-title">
              {isOwner ? 'Rendimiento comparativo de campañas' : 'Clics y Conversiones en el tiempo'}
            </div>
            {/* TODO: Integrar componente EDA real cuando esté disponible */}
            <ChartPlaceholder isOwner={isOwner} campaigns={campaigns} />
          </div>
        </div>
      </div>

      {/* ── Detail Panel ── */}
      <DetailPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={selectedCampaign
          ? (selectedCampaign.name || selectedCampaign.nombre || 'Detalle de campaña')
          : 'Detalle'}
      >
        {selectedCampaign && (
          <CampaignDetail campaign={selectedCampaign} isOwner={isOwner} />
        )}
      </DetailPanel>
    </>
  )
}

/* ── Gráfico placeholder ──────────────────────── */
function ChartPlaceholder({ isOwner, campaigns }) {
  // Alturas de barras simuladas para el placeholder visual
  const bars = [60, 90, 45, 110, 75, 130, 55, 100, 80, 95, 65, 120]

  return (
    <div className="chart-placeholder">
      <div className="chart-placeholder-bars">
        {bars.map((h, i) => (
          <div
            key={i}
            className="chart-bar"
            style={{
              height: `${h}px`,
              opacity: 0.4 + (i % 3) * 0.2,
              background: i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-primary-light)',
            }}
          />
        ))}
      </div>
      <p className="chart-placeholder-label">
        {isOwner
          ? '📊 Gráfico EDA de rendimiento comparativo — TODO: integrar componente'
          : '📈 Gráfico Clics/Conversiones — TODO: integrar componente'}
      </p>
    </div>
  )
}

/* ── Detalle de campaña en el panel ──────────── */
function CampaignDetail({ campaign, isOwner }) {
  const name        = campaign.name     || campaign.nombre        || '—'
  const status      = campaign.status   || campaign.estado        || '—'
  const clicks      = campaign.clicks   || campaign.clics         || 0
  const conversions = campaign.conversions || campaign.conversiones || 0
  const startDate   = campaign.start_date  || campaign.fecha_inicio || '—'
  const endDate     = campaign.end_date    || campaign.fecha_fin    || '—'

  // Campos financieros — solo presentes si el backend los devolvió (Owner)
  // NO se ocultan con CSS; directamente no se renderizan si no existen en la respuesta
  const hasFinancials = campaign.revenue != null
                     || campaign.roi     != null
                     || campaign.roas    != null
                     || campaign.cpc     != null
                     || campaign.cpa     != null

  const statusBadge = status === 'active' || status === 'activa'   ? 'badge-success'
                    : status === 'paused' || status === 'pausada'   ? 'badge-warn'
                    : 'badge-neutral'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-text)' }}>{name}</h2>
        <span className={`badge ${statusBadge}`}>{status}</span>
      </div>

      {/* Fechas */}
      <div style={{ display: 'flex', gap: 8, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        <span>Inicio: <strong>{startDate}</strong></span>
        <span>·</span>
        <span>Fin: <strong>{endDate}</strong></span>
      </div>

      {/* KPIs operativos — disponibles para todos los roles */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-row">
          <span className="detail-kpi-label">Clics</span>
          <span className="detail-kpi-value">{clicks.toLocaleString()}</span>
        </div>
        <div className="detail-kpi-row">
          <span className="detail-kpi-label">Conversiones</span>
          <span className="detail-kpi-value">{conversions.toLocaleString()}</span>
        </div>
        {campaign.impressions != null && (
          <div className="detail-kpi-row">
            <span className="detail-kpi-label">Impresiones</span>
            <span className="detail-kpi-value">{campaign.impressions.toLocaleString()}</span>
          </div>
        )}
        {campaign.ctr != null && (
          <div className="detail-kpi-row">
            <span className="detail-kpi-label">CTR</span>
            <span className="detail-kpi-value">{campaign.ctr}%</span>
          </div>
        )}
      </div>

      {/* KPIs financieros — SOLO si el backend los devolvió (Owner).
          Manager: el backend no envía estos campos, por lo tanto hasFinancials === false
          y este bloque NO se monta en el DOM. */}
      {hasFinancials && (
        <>
          <div style={{
            height: 1,
            background: 'var(--color-surface-border)',
            margin: '4px 0'
          }} />
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Métricas financieras
          </p>
          <div className="detail-kpi-grid">
            {campaign.revenue != null && (
              <div className="detail-kpi-row">
                <span className="detail-kpi-label">Ingresos</span>
                <span className="detail-kpi-value">${campaign.revenue?.toLocaleString()}</span>
              </div>
            )}
            {campaign.roi != null && (
              <div className="detail-kpi-row">
                <span className="detail-kpi-label">ROI</span>
                <span className="detail-kpi-value">{campaign.roi}%</span>
              </div>
            )}
            {campaign.roas != null && (
              <div className="detail-kpi-row">
                <span className="detail-kpi-label">ROAS</span>
                <span className="detail-kpi-value">{campaign.roas}x</span>
              </div>
            )}
            {campaign.cpc != null && (
              <div className="detail-kpi-row">
                <span className="detail-kpi-label">CPC</span>
                <span className="detail-kpi-value">${campaign.cpc}</span>
              </div>
            )}
            {campaign.cpa != null && (
              <div className="detail-kpi-row">
                <span className="detail-kpi-label">CPA</span>
                <span className="detail-kpi-value">${campaign.cpa}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Campañas
   ══════════════════════════════════════════════════════════════ */
function CampanasView({ user }) {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const isOwner = user?.id_role === 2

  useEffect(() => {
    api.campaigns.getAll()
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Todas las campañas
          </h2>
          <button
            className="btn-primary"
            onClick={() => navigate('/dashboard/crear')}
            id="btn-nueva-campana-list"
          >
            <span>+</span> Nueva Campaña
          </button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Clics</th>
                  <th>Conversiones</th>
                  {isOwner && <th>ROI</th>}
                  <th>Inicio</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={isOwner ? 6 : 5} style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>Sin campañas</td></tr>
                ) : campaigns.map(c => {
                  const name   = c.name || c.nombre || `Campaña ${c.id}`
                  const status = c.status || c.estado || '—'
                  const dotCls = status === 'active' || status === 'activa' ? 'badge-success'
                               : status === 'paused' || status === 'pausada' ? 'badge-warn'
                               : 'badge-neutral'
                  return (
                    <tr key={c.id} onClick={() => { setSelected(c); setPanelOpen(true) }}>
                      <td style={{ fontWeight: 600 }}>{name}</td>
                      <td><span className={`badge ${dotCls}`}>{status}</span></td>
                      <td>{(c.clicks || c.clics || 0).toLocaleString()}</td>
                      <td>{(c.conversions || c.conversiones || 0).toLocaleString()}</td>
                      {isOwner && <td>{c.roi != null ? `${c.roi}%` : '—'}</td>}
                      <td style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                        {c.start_date || c.fecha_inicio || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <DetailPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={selected ? (selected.name || selected.nombre || 'Detalle') : 'Detalle'}
      >
        {selected && <CampaignDetail campaign={selected} isOwner={isOwner} />}
      </DetailPanel>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Ranking
   Manager: visible pero sin ROI/ROAS — el backend no los devuelve.
   Owner: todos los KPIs disponibles.
   ══════════════════════════════════════════════════════════════ */
function RankingView({ user }) {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const isOwner = user?.id_role === 2

  useEffect(() => {
    api.campaigns.getTop(10)
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' }}>
          Ranking de Campañas
        </h2>
        {!isOwner && (
          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
            Métricas financieras no disponibles para este rol
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, borderRadius: 14 }} />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 40 }}>
          Sin datos de ranking disponibles
        </div>
      ) : campaigns.map((c, idx) => {
        const name   = c.name || c.nombre || `Campaña ${c.id}`
        const clicks = c.clicks || c.clics || 0
        const conv   = c.conversions || c.conversiones || 0
        // roi solo presente si el backend lo devuelve (Owner)
        const roi    = c.roi

        return (
          <div
            key={c.id}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, padding: '14px 20px' }}
          >
            {/* Posición */}
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              background: idx < 3 ? 'var(--color-primary-bg)' : 'var(--color-surface-mid)',
              color: idx < 3 ? 'var(--color-primary)' : 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.85rem', flexShrink: 0
            }}>
              {idx + 1}
            </span>

            {/* Nombre */}
            <div style={{ flex: 1, fontWeight: 600 }}>{name}</div>

            {/* Métricas */}
            <div style={{ display: 'flex', gap: 20, fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              <span><strong style={{ color: 'var(--color-text)' }}>{clicks.toLocaleString()}</strong> clics</span>
              <span><strong style={{ color: 'var(--color-text)' }}>{conv.toLocaleString()}</strong> conv.</span>
              {/* ROI solo si el backend lo devolvió — no se renderiza para Manager */}
              {roi != null && (
                <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  ROI {roi}%
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   VISTA: Links Trackeables (placeholder)
   ══════════════════════════════════════════════════════════════ */
function LinksView() {
  return (
    <div className="card" style={{ width: '100%', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Links Trackeables</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
        Vista de links activos — generados automáticamente al crear cada campaña
      </p>
    </div>
  )
}
