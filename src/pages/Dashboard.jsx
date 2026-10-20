import { useMemo, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import DashboardShell from '../components/DashboardShell'
import {
  IconDashboard, IconCampaign, IconUsers, IconLink, IconFolderPlus, IconRanking, IconAnalytics,
  IconArrowRight, IconCopy, IconCheck, IconExternal, IconPlus,
} from '../components/ui/Icons'
import EquipoView from '../components/EquipoView'
import CrearCampanaForm from '../components/CrearCampanaForm'
import CampaignBreakdownView from '../components/CampaignBreakdownView'
import {
  PageHeader, StatTile, StatGrid, ChartCard, EmptyState, ErrorState, StatusBadge, SkeletonRows, Segmented, Notice,
} from '../components/ui'
import { LineChart, BarList, Funnel, Distribution } from '../components/charts'
import { api, trackingUrl } from '../services/api'
import useAsync from '../lib/useAsync'
import { aggregate, loadOverview } from '../lib/metrics'
import {
  fmtInt, fmtMoney, fmtMoneyCompact, fmtPct, fmtCompact, fmtDate, fmtDayShort, statusMeta,
} from '../lib/format'

/* ─── Navegación ───────────────────────────────────────────── */
const NAV = [
  { id: 'dashboard', label: 'Resumen',          to: '/dashboard',          exact: true,  icon: <IconDashboard />, tab: true },
  { id: 'desglose',  label: 'Desglose',         to: '/dashboard/desglose', exact: false, icon: <IconAnalytics />, tab: true },
  { id: 'campanas',  label: 'Campañas',         to: '/dashboard/campanas', exact: false, icon: <IconCampaign />,  tab: true },
  { id: 'ranking',   label: 'Ranking',          to: '/dashboard/ranking',  exact: false, icon: <IconRanking />,   tab: true },
  { id: 'links',     label: 'Links',            to: '/dashboard/links',    exact: false, icon: <IconLink />,      tab: true },
  { id: 'equipo',    label: 'Equipo',           to: '/dashboard/equipo',   exact: false, icon: <IconUsers />,     tab: true, ownerOnly: true },
  { id: 'crear',     label: 'Nueva campaña',    to: '/dashboard/crear',    exact: false, icon: <IconFolderPlus />, tab: false },
]

export default function Dashboard({ user, onLogout, onUpdateUser }) {
  const isOwner = user?.id_role === 2
  const nav = NAV.filter(i => !i.ownerOnly || isOwner)

  return (
    <DashboardShell
      sidebarItems={nav}
      tabs={nav.filter(i => i.tab)}
      user={user}
      onLogout={onLogout}
      onUpdateUser={onUpdateUser}
    >
      <Routes>
        <Route index           element={<DashboardHome user={user} />} />
        <Route path="desglose" element={<CampaignBreakdownView user={user} />} />
        <Route path="campanas" element={<CampanasView user={user} />} />
        <Route path="ranking"  element={<RankingView user={user} />} />
        <Route path="links"    element={<LinksView user={user} />} />
        <Route path="equipo"   element={isOwner ? <EquipoView user={user} /> : <Navigate to="/dashboard" replace />} />
        <Route path="crear"    element={<CrearCampanaForm user={user} />} />
        <Route path="*"        element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardShell>
  )
}

const fmtDateNum = (v) => fmtDate(v, { day: '2-digit', month: '2-digit', year: 'numeric' })
const toneOf = (v) => (Number(v) > 0 ? 'text-success' : Number(v) < 0 ? 'text-danger' : '')

const STATUS_COLORS = {
  active: 'var(--color-success)',
  paused: 'var(--color-warn)',
  draft: '#a1a1aa',
  finished: '#52525b',
}

/* ══════════════════════════════════════════════════════════════
   Resumen
   ══════════════════════════════════════════════════════════════ */
function DashboardHome({ user }) {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(loadOverview, [])
  const campaigns = useMemo(() => data?.campaigns || [], [data])
  const daily = data?.daily || []
  const totals = useMemo(() => aggregate(campaigns), [campaigns])
  const fin = user?.id_role === 2 && totals.hasFinancials

  const byClicks = useMemo(() => [...campaigns].sort((a, b) => b.stats.clicks - a.stats.clicks), [campaigns])
  const statusItems = ['active', 'paused', 'draft', 'finished'].map(s => ({
    label: statusMeta(s).label, value: campaigns.filter(c => c.status === s).length, color: STATUS_COLORS[s],
  }))

  const goToCampaign = (row) => navigate(`/dashboard/desglose?id=${row.id}`)

  return (
    <div className="page">
      <PageHeader
        title={user?.company_name ? `Resumen de ${user.company_name}` : 'Resumen general'}
        subtitle={loading && !data ? 'Cargando métricas…' : `${fmtInt(campaigns.length)} campañas · ${fmtInt(totals.active)} activas`}
        actions={(
          <button className="btn-primary" onClick={() => navigate('/dashboard/crear')}>
            <IconPlus size={16} /> Nueva campaña
          </button>
        )}
      />

      {error && <ErrorState message={error.message} onRetry={reload} />}

      <StatGrid>
        <StatTile label="Clics totales" value={fmtInt(totals.clicks)} loading={loading && !data} />
        <StatTile label="Conversiones" value={fmtInt(totals.conversions)} loading={loading && !data} />
        <StatTile label="Tasa de conversión" value={fmtPct(totals.conversionRate)} hint="Conversiones / clics" loading={loading && !data} />
        {fin ? (
          <>
            <StatTile label="Inversión" value={fmtMoney(totals.spent)} loading={loading && !data} />
            <StatTile label="Ingresos" value={fmtMoney(totals.revenue)} loading={loading && !data} />
            <StatTile
              label="ROI global"
              value={fmtPct(totals.roi)}
              hint={totals.roas != null ? `ROAS ${totals.roas.toFixed(2).replace('.', ',')}x` : null}
              trend={totals.roi == null ? null : totals.roi >= 0 ? 'up' : 'down'}
              loading={loading && !data}
              emphasis
            />
          </>
        ) : (
          <StatTile label="Campañas activas" value={fmtInt(totals.active)} hint={`de ${fmtInt(campaigns.length)} registradas`} loading={loading && !data} />
        )}
      </StatGrid>

      {!loading && !error && campaigns.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Aún no hay campañas"
            description="Crea tu primera campaña para generar su link de seguimiento y empezar a medir clics y conversiones."
            action={<button className="btn-primary" onClick={() => navigate('/dashboard/crear')}>Crear campaña</button>}
          />
        </div>
      ) : (
        <>
          <div className="grid-2-1">
            <ChartCard
              title="Clics diarios"
              subtitle="Suma de todas las campañas, según la fecha de cada clic registrado"
              table={{
                columns: [{ key: 'date', label: 'Fecha', format: (v) => fmtDate(v) }, { key: 'clicks', label: 'Clics', align: 'right', format: fmtInt }],
                rows: daily,
              }}
            >
              {loading && !data ? <div className="skeleton" style={{ height: 240 }} />
                : daily.length === 0 ? <EmptyState title="Sin clics registrados" description="La serie aparecerá cuando los links de seguimiento reciban visitas." />
                  : <LineChart data={daily.map(d => ({ label: d.date, value: d.clicks }))} seriesName="clics" valueFormat={(v, axis) => (axis ? fmtCompact(v) : fmtInt(v))} xFormat={fmtDayShort} />}
            </ChartCard>

            <ChartCard title="Embudo de conversión" subtitle="Relación entre clics y conversiones de todas las campañas">
              {loading && !data ? <SkeletonRows rows={2} height={56} /> : (
                <Funnel
                  format={fmtInt}
                  stages={[
                    { label: 'Clics', value: totals.clicks },
                    { label: 'Conversiones', value: totals.conversions },
                  ]}
                />
              )}
              <div className="divider" />
              <h3 className="mini-title">Estado de las campañas</h3>
              <Distribution items={statusItems} format={fmtInt} />
            </ChartCard>
          </div>

          <div className={fin ? 'grid-2' : 'grid-1'}>
            <ChartCard
              title="Clics por campaña"
              subtitle="Selecciona una campaña para ver su desglose"
              table={{
                columns: [
                  { key: 'name', label: 'Campaña' },
                  { key: 'clicks', label: 'Clics', align: 'right', format: fmtInt },
                  { key: 'conversions', label: 'Conversiones', align: 'right', format: fmtInt },
                  { key: 'rate', label: 'Tasa conv.', align: 'right', format: (v) => fmtPct(v) },
                ],
                rows: byClicks.map(c => ({ name: c.name, clicks: c.stats.clicks, conversions: c.stats.conversions, rate: c.stats.conversion_rate })),
              }}
            >
              {loading && !data ? <SkeletonRows rows={4} height={28} /> : (
                <BarList
                  rows={byClicks.map(c => ({ id: c.id, label: c.name, values: { clicks: c.stats.clicks } }))}
                  series={[{ key: 'clicks', name: 'Clics', format: fmtInt }]}
                  onSelect={goToCampaign}
                />
              )}
            </ChartCard>

            {fin && (
              <ChartCard
                title="Inversión frente a ingresos"
                subtitle="Por campaña, en la misma escala monetaria"
                table={{
                  columns: [
                    { key: 'name', label: 'Campaña' },
                    { key: 'spent', label: 'Inversión', align: 'right', format: fmtMoney },
                    { key: 'revenue', label: 'Ingresos', align: 'right', format: fmtMoney },
                    { key: 'roi', label: 'ROI', align: 'right', format: (v) => fmtPct(v) },
                  ],
                  rows: campaigns.map(c => ({ name: c.name, spent: c.stats.spent, revenue: c.stats.revenue, roi: c.stats.roi })),
                }}
              >
                <BarList
                  rows={[...campaigns]
                    .sort((a, b) => (b.stats.revenue || 0) - (a.stats.revenue || 0))
                    .map(c => ({ id: c.id, label: c.name, values: { spent: c.stats.spent || 0, revenue: c.stats.revenue || 0 } }))}
                  series={[
                    { key: 'spent', name: 'Inversión', format: fmtMoneyCompact },
                    { key: 'revenue', name: 'Ingresos', format: fmtMoneyCompact },
                  ]}
                  onSelect={goToCampaign}
                />
              </ChartCard>
            )}
          </div>
        </>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Campañas (tabla)
   ══════════════════════════════════════════════════════════════ */
function CampanasView({ user }) {
  const navigate = useNavigate()
  const isOwner = user?.id_role === 2
  const [filter, setFilter] = useState('all')
  const { data, loading, error, reload } = useAsync(() => api.stats.campaignsWithStats(), [])
  const campaigns = data || []
  const list = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)
  const fin = isOwner && campaigns.some(c => c.stats.revenue != null)

  const counts = (s) => campaigns.filter(c => c.status === s).length
  const options = [
    { value: 'all', label: `Todas (${campaigns.length})` },
    { value: 'active', label: `Activas (${counts('active')})` },
    { value: 'paused', label: `Pausadas (${counts('paused')})` },
    { value: 'draft', label: `Borrador (${counts('draft')})` },
    { value: 'finished', label: `Finalizadas (${counts('finished')})` },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Campañas"
        subtitle="Métricas acumuladas de cada campaña desde su link de seguimiento"
        actions={<button className="btn-primary" onClick={() => navigate('/dashboard/crear')}><IconPlus size={16} /> Nueva campaña</button>}
      />
      {error && <ErrorState message={error.message} onRetry={reload} />}
      <div className="toolbar">
        <Segmented options={options} value={filter} onChange={setFilter} label="Filtrar por estado" />
      </div>
      <div className="card card-flush">
        {loading && !data ? <div style={{ padding: 20 }}><SkeletonRows rows={4} /></div> : list.length === 0 ? (
          <EmptyState title="Sin campañas en este estado" />
        ) : (
          <div className="table-scroll">
            <table className="data-table data-table-interactive">
              <thead>
                <tr>
                  <th>Campaña</th>
                  <th>Estado</th>
                  <th>Vigencia</th>
                  <th className="num">Clics</th>
                  <th className="num">Conversiones</th>
                  <th className="num">Tasa conv.</th>
                  {fin && <th className="num">Inversión</th>}
                  {fin && <th className="num">Ingresos</th>}
                  {fin && <th className="num">ROI</th>}
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {list.map(c => (
                  <tr key={c.id} onClick={() => navigate(`/dashboard/desglose?id=${c.id}`)}>
                    <td className="cell-strong">{c.name}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="cell-muted nowrap">{fmtDateNum(c.start_date)} – {c.end_date ? fmtDateNum(c.end_date) : 'sin fin'}</td>
                    <td className="num">{fmtInt(c.stats.clicks)}</td>
                    <td className="num">{fmtInt(c.stats.conversions)}</td>
                    <td className="num">{fmtPct(c.stats.conversion_rate)}</td>
                    {fin && <td className="num">{fmtMoney(c.stats.spent)}</td>}
                    {fin && <td className="num">{fmtMoney(c.stats.revenue)}</td>}
                    {fin && <td className={`num ${toneOf(c.stats.roi)}`}>{fmtPct(c.stats.roi)}</td>}
                    <td className="num">
                      <span className="row-link">Desglose <IconArrowRight size={14} /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Ranking (GET /analitika/campaigns/top)
   ══════════════════════════════════════════════════════════════ */
function RankingView({ user }) {
  const navigate = useNavigate()
  const isOwner = user?.id_role === 2
  const [metric, setMetric] = useState('clics')
  const { data, loading, error, reload } = useAsync(() => api.campaigns.getTop(10), [])
  const rows = data || []
  const fin = isOwner && rows.some(r => r.ingresos != null)

  const metrics = [
    { value: 'clics', label: 'Clics', format: fmtInt },
    ...(fin ? [{ value: 'ingresos', label: 'Ingresos', format: fmtMoneyCompact }] : []),
  ]
  const current = metrics.find(m => m.value === metric) || metrics[0]
  const sorted = [...rows].sort((a, b) => Number(b[current.value] || 0) - Number(a[current.value] || 0))

  return (
    <div className="page">
      <PageHeader title="Ranking de campañas" subtitle="Las 10 campañas con más clics de tu empresa" />
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {!isOwner && <Notice>Las métricas financieras solo están disponibles para el rol Owner.</Notice>}

      <ChartCard
        title={`Campañas por ${current.label.toLowerCase()}`}
        actions={metrics.length > 1 && <Segmented options={metrics} value={current.value} onChange={setMetric} label="Métrica del ranking" />}
        table={{
          columns: [
            { key: 'pos', label: '#' },
            { key: 'name', label: 'Campaña' },
            { key: 'clics', label: 'Clics', align: 'right', format: fmtInt },
            ...(fin ? [
              { key: 'spent', label: 'Inversión', align: 'right', format: fmtMoney },
              { key: 'ingresos', label: 'Ingresos', align: 'right', format: fmtMoney },
              { key: 'beneficio', label: 'Beneficio', align: 'right', format: fmtMoney },
            ] : []),
          ],
          rows: sorted.map((r, i) => ({ ...r, pos: i + 1 })),
        }}
      >
        {loading && !data ? <SkeletonRows rows={5} height={28} /> : sorted.length === 0 ? (
          <EmptyState title="Sin datos de ranking" description="El ranking se calcula con los clics registrados en los links de seguimiento." />
        ) : (
          <BarList
            rows={sorted.map((r, i) => ({ id: r.id_campaign, label: `${i + 1}. ${r.name}`, values: { v: Number(r[current.value] || 0) } }))}
            series={[{ key: 'v', name: current.label, format: current.format }]}
            onSelect={(r) => navigate(`/dashboard/desglose?id=${r.id}`)}
            labelWidth={220}
          />
        )}
      </ChartCard>

      {fin && sorted.length > 0 && (
        <ChartCard title="Rentabilidad por campaña" subtitle="Beneficio = ingresos atribuidos − inversión">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Campaña</th><th className="num">Inversión</th><th className="num">Ingresos</th><th className="num">Beneficio</th></tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.id_campaign}>
                    <td className="cell-strong">{r.name}</td>
                    <td className="num">{fmtMoney(r.spent)}</td>
                    <td className="num">{fmtMoney(r.ingresos)}</td>
                    <td className={`num ${toneOf(r.beneficio)}`}>{fmtMoney(r.beneficio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Links trackeables
   ══════════════════════════════════════════════════════════════ */
async function loadLinks() {
  const [links, campaigns, channels, clicks] = await Promise.all([
    api.trackingLinks.getAll(),
    api.campaigns.getAll(),
    api.channels.getAll().catch(() => []),
    api.clicks.getAll().catch(() => []),
  ])
  const campName = new Map(campaigns.map(c => [c.id, c.name]))
  const chName = new Map(channels.map(c => [c.id_channel, c.name]))
  const clickCount = new Map()
  clicks.forEach(c => clickCount.set(c.id_link, (clickCount.get(c.id_link) || 0) + 1))
  return links.map(l => ({
    id: l.id_link,
    campaignId: l.id_campaign,
    campaign: campName.get(l.id_campaign) || `Campaña ${l.id_campaign}`,
    channel: chName.get(l.id_channel) || 'Sin canal',
    destination: l.destination,
    url: trackingUrl(l.id_link),
    clicks: clickCount.get(l.id_link) || 0,
  }))
}

function LinksView() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(loadLinks, [])
  const [copied, setCopied] = useState(null)
  const links = data || []

  const copy = async (link) => {
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(link.id)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* el portapapeles puede no estar disponible */ }
  }

  return (
    <div className="page">
      <PageHeader
        title="Links de seguimiento"
        subtitle="Cada visita al enlace público registra un clic y redirige a la campaña"
        actions={<button className="btn-primary" onClick={() => navigate('/dashboard/crear')}><IconPlus size={16} /> Nueva campaña</button>}
      />
      {error && <ErrorState message={error.message} onRetry={reload} />}
      <div className="card card-flush">
        {loading && !data ? <div style={{ padding: 20 }}><SkeletonRows rows={3} /></div> : links.length === 0 ? (
          <EmptyState title="Sin links de seguimiento" description="Los links se generan automáticamente al crear una campaña." />
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Campaña</th><th>Canal</th><th>Enlace público</th><th>Destino</th><th className="num">Clics</th></tr>
              </thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.id}>
                    <td className="cell-strong">{l.campaign}</td>
                    <td><span className="badge badge-neutral">{l.channel}</span></td>
                    <td>
                      <div className="link-cell">
                        <code className="link-code" title={l.url}>{l.url}</code>
                        <button type="button" className="icon-btn" onClick={() => copy(l)} aria-label="Copiar enlace" title="Copiar enlace">
                          {copied === l.id ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <a className="link-dest" href={l.destination} target="_blank" rel="noreferrer noopener" title={l.destination}>
                        <span>{l.destination}</span> <IconExternal size={14} />
                      </a>
                    </td>
                    <td className="num">{fmtInt(l.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
