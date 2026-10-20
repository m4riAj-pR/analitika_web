import { useState } from 'react'
import { IconAlert, IconChart, IconInfo, IconTable, IconTrendDown, IconTrendUp, IconRefresh } from './Icons'
import { statusMeta } from '../../lib/format'

/* ─── Encabezado de página ─────────────────────────────────── */
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}

/* ─── Tarjeta de indicador ─────────────────────────────────── */
export function StatTile({ label, value, hint, trend, loading, emphasis = false }) {
  return (
    <div className={`stat-tile${emphasis ? ' stat-tile-emphasis' : ''}`}>
      <span className="stat-label">{label}</span>
      {loading
        ? <span className="skeleton" style={{ height: 30, width: '60%', display: 'block' }} />
        : <span className="stat-value">{value}</span>}
      {!loading && (hint || trend) && (
        <span className={`stat-hint${trend ? ` stat-hint-${trend}` : ''}`}>
          {trend === 'up' && <IconTrendUp size={14} />}
          {trend === 'down' && <IconTrendDown size={14} />}
          {hint}
        </span>
      )}
    </div>
  )
}

export function StatGrid({ children }) {
  return <div className="stat-grid">{children}</div>
}

/* ─── Contenedor de gráfico con vista de tabla accesible ───── */
export function ChartCard({ title, subtitle, actions, table, children, className = '', footer }) {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className={`card chart-card ${className}`}>
      <div className="chart-card-head">
        <div className="chart-card-titles">
          <h2 className="chart-card-title">{title}</h2>
          {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
        </div>
        <div className="chart-card-actions">
          {actions}
          {table && table.rows.length > 0 && (
            <button
              type="button"
              className="icon-toggle"
              onClick={() => setShowTable(v => !v)}
              aria-pressed={showTable}
              title={showTable ? 'Ver gráfico' : 'Ver tabla de datos'}
            >
              {showTable ? <IconChart size={16} /> : <IconTable size={16} />}
              <span>{showTable ? 'Gráfico' : 'Tabla'}</span>
            </button>
          )}
        </div>
      </div>
      <div className="chart-card-body">
        {showTable && table ? <DataTable columns={table.columns} rows={table.rows} /> : children}
      </div>
      {footer && <div className="chart-card-footer">{footer}</div>}
    </section>
  )
}

export function DataTable({ columns, rows }) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} style={{ textAlign: c.align || 'left' }}>
                  {c.format ? c.format(r[c.key], r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Estados ──────────────────────────────────────────────── */
export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><IconInfo size={20} /></span>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-text">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="alert-message alert-error alert-row" role="alert">
      <IconAlert size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button type="button" className="btn-link" onClick={onRetry}>
          <IconRefresh size={14} /> Reintentar
        </button>
      )}
    </div>
  )
}

export function Notice({ tone = 'info', children }) {
  return (
    <div className={`notice notice-${tone}`}>
      {tone === 'info' ? <IconInfo size={16} /> : <IconAlert size={16} />}
      <span>{children}</span>
    </div>
  )
}

export function StatusBadge({ status }) {
  const m = statusMeta(status)
  return (
    <span className={`badge ${m.badge}`}>
      <span className={`status-dot ${m.dot}`} aria-hidden="true" />
      {m.label}
    </span>
  )
}

export function SkeletonRows({ rows = 3, height = 44 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height }} />)}
    </div>
  )
}

/** Selector segmentado (pestañas compactas dentro de una tarjeta). */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`segmented-item${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
