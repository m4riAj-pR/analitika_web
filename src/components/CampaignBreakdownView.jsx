import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import useAsync from '../lib/useAsync'
import { fillDays } from '../lib/metrics'
import {
  fmtInt, fmtMoney, fmtPct, fmtRatio, fmtCompact, fmtDate, fmtDayShort, countBy, deviceFromUA,
} from '../lib/format'
import {
  PageHeader, StatTile, StatGrid, ChartCard, EmptyState, ErrorState, StatusBadge, SkeletonRows, DataTable,
} from './ui'
import { LineChart, BarList, Funnel, Meter } from './charts'
import RoiPredictorCard from './RoiPredictorCard'
import { IconChevronDown } from './ui/Icons'

async function loadCampaignDetail(id) {
  const [stats, daily, table] = await Promise.all([
    api.stats.get(id),
    api.stats.clicksByDay(id).catch(() => []),
    api.stats.clicksTable(id).catch(() => []),
  ])
  return { stats, daily: fillDays(daily), table }
}

export default function CampaignBreakdownView({ user }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const isOwner = user?.id_role === 2

  const list = useAsync(() => api.campaigns.getAll(), [])
  const campaigns = useMemo(() => list.data || [], [list.data])

  const requested = Number(params.get('id'))
  const campaign = campaigns.find(c => c.id === requested) || campaigns[0] || null

  // Si la URL no trae una campaña válida, se fija la primera para que el enlace sea compartible
  useEffect(() => {
    if (campaign && campaign.id !== requested) setParams({ id: String(campaign.id) }, { replace: true })
  }, [campaign, requested, setParams])

  const detail = useAsync(
    () => (campaign ? loadCampaignDetail(campaign.id) : Promise.resolve(null)),
    [campaign?.id],
  )

  if (list.loading && !list.data) {
    return <div className="page"><SkeletonRows rows={1} height={56} /><SkeletonRows rows={2} height={220} /></div>
  }
  if (list.error) return <div className="page"><ErrorState message={list.error.message} onRetry={list.reload} /></div>
  if (!campaign) {
    return (
      <div className="page">
        <div className="card">
          <EmptyState
            title="No hay campañas para desglosar"
            action={<button className="btn-primary" onClick={() => navigate('/dashboard/crear')}>Crear campaña</button>}
          />
        </div>
      </div>
    )
  }

  const d = detail.data
  const s = d?.stats
  const busy = detail.loading && !d
  const fin = isOwner && s?.revenue != null
  const table = d?.table || []

  const breakdowns = [
    { key: 'pais', title: 'Por país', rows: countBy(table, r => r.pais) },
    { key: 'src', title: 'Por fuente (utm_source)', rows: countBy(table, r => (r.utm_source === 'N/A' ? 'Directo' : r.utm_source)) },
    { key: 'dev', title: 'Por dispositivo', rows: countBy(table, r => deviceFromUA(r.user_agent)) },
  ]

  return (
    <div className="page">
      <PageHeader
        title="Desglose de campaña"
        subtitle={campaign.description || 'Rendimiento, tráfico y proyección de la campaña seleccionada'}
        actions={(
          <label className="select-wrap" aria-label="Campaña">
            <select
              value={campaign.id}
              onChange={(e) => setParams({ id: e.target.value })}
              className="select-control"
            >
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <IconChevronDown size={16} />
          </label>
        )}
      >
        <div className="meta-row">
          <strong className="meta-name">{campaign.name}</strong>
          <StatusBadge status={campaign.status} />
          <span className="cell-muted">{fmtDate(campaign.start_date)} – {campaign.end_date ? fmtDate(campaign.end_date) : 'sin fecha fin'}</span>
        </div>
      </PageHeader>

      {detail.error && <ErrorState message={detail.error.message} onRetry={detail.reload} />}

      <StatGrid>
        <StatTile label="Clics" value={fmtInt(s?.clicks)} loading={busy} />
        <StatTile label="Conversiones" value={fmtInt(s?.conversions)} loading={busy} />
        <StatTile label="Tasa de conversión" value={fmtPct(s?.conversion_rate)} loading={busy} />
        {s?.impressions > 0 && <StatTile label="CTR" value={fmtPct(s.ctr, 2)} hint={`${fmtInt(s.impressions)} impresiones`} loading={busy} />}
        {fin && (
          <>
            <StatTile label="Ingresos" value={fmtMoney(s.revenue)} hint={`Ticket medio ${fmtMoney(s.aov)}`} loading={busy} />
            <StatTile label="CPC" value={fmtMoney(s.cpc)} hint="Costo por clic" loading={busy} />
            <StatTile label="CPA" value={fmtMoney(s.cpa)} hint="Costo por conversión" loading={busy} />
            <StatTile
              label="ROI"
              value={fmtPct(s.roi)}
              hint={`ROAS ${fmtRatio(s.roas)}`}
              trend={s.roi >= 0 ? 'up' : 'down'}
              loading={busy}
              emphasis
            />
          </>
        )}
      </StatGrid>

      <div className="grid-2-1">
        <ChartCard
          title="Clics por día"
          subtitle="Fecha en que se registró cada clic del link de seguimiento"
          table={{
            columns: [{ key: 'date', label: 'Fecha', format: (v) => fmtDate(v) }, { key: 'clicks', label: 'Clics', align: 'right', format: fmtInt }],
            rows: d?.daily || [],
          }}
        >
          {busy ? <div className="skeleton" style={{ height: 240 }} />
            : (d?.daily || []).length === 0
              ? <EmptyState title="Sin clics registrados" description="Comparte el link de seguimiento para empezar a recibir tráfico." />
              : <LineChart data={d.daily.map(p => ({ label: p.date, value: p.clicks }))} seriesName="clics" valueFormat={(v, axis) => (axis ? fmtCompact(v) : fmtInt(v))} xFormat={fmtDayShort} />}
        </ChartCard>

        <ChartCard title="Conversión" subtitle="Cuántos clics terminaron en conversión">
          {busy ? <SkeletonRows rows={2} height={56} /> : (
            <Funnel format={fmtInt} stages={[{ label: 'Clics', value: s?.clicks || 0 }, { label: 'Conversiones', value: s?.conversions || 0 }]} />
          )}
          {isOwner && (
            <>
              <div className="divider" />
              <Meter label="Presupuesto ejecutado" value={s?.spent ?? campaign.spent ?? 0} max={campaign.budget || 0} format={fmtMoney} />
              {s?.data_source && s.data_source !== 'manual' && (
                <p className="chart-note">Inversión tomada de la fuente “{s.data_source}”.</p>
              )}
            </>
          )}
        </ChartCard>
      </div>

      <div className="grid-3">
        {breakdowns.map(b => (
          <ChartCard
            key={b.key}
            title={b.title}
            subtitle={table.length ? `Últimos ${fmtInt(table.length)} clics` : undefined}
            table={{ columns: [{ key: 'label', label: 'Categoría' }, { key: 'value', label: 'Clics', align: 'right', format: fmtInt }], rows: b.rows }}
          >
            {busy ? <SkeletonRows rows={3} height={24} /> : b.rows.length === 0
              ? <EmptyState title="Sin datos" />
              : <BarList rows={b.rows.map(r => ({ label: r.label, values: { v: r.value } }))} series={[{ key: 'v', name: 'Clics', format: fmtInt }]} labelWidth={110} />}
          </ChartCard>
        ))}
      </div>

      {isOwner && s && <RoiPredictorCard key={campaign.id} campaign={campaign} stats={s} />}

      <ChartCard title="Clics recientes" subtitle="Registro detallado de los últimos clics con parámetros UTM">
        {busy ? <SkeletonRows rows={4} height={32} /> : table.length === 0 ? <EmptyState title="Sin clics registrados" /> : (
          <DataTable
            columns={[
              { key: 'fecha', label: 'Fecha', format: (v) => fmtDate(v) },
              { key: 'hora', label: 'Hora' },
              { key: 'pais', label: 'País' },
              { key: 'user_agent', label: 'Dispositivo', format: (v) => deviceFromUA(v) },
              { key: 'utm_source', label: 'Fuente', format: (v) => (v === 'N/A' ? 'Directo' : v) },
              { key: 'utm_medium', label: 'Medio', format: (v) => (v === 'N/A' ? '—' : v) },
            ]}
            rows={table.slice(0, 10)}
          />
        )}
      </ChartCard>
    </div>
  )
}
