/**
 * Gráficos SVG/HTML sin dependencias externas.
 *
 * Convenciones (guía de visualización del proyecto):
 *  - Paleta categórica validada para CVD sobre fondo blanco, en orden fijo:
 *    1 violeta de marca, 2 naranja, 3 aguamarina. Una sola serie usa siempre la 1.
 *  - Un solo eje Y por gráfico: magnitudes distintas van en gráficos separados.
 *  - Líneas de 2px, cuadrícula de línea fina sólida, etiquetas directas selectivas.
 *  - Toda marca tiene tooltip al pasar el cursor / foco; los valores también
 *    están disponibles en la vista de tabla de ChartCard.
 */
import { useMemo, useState } from 'react'
import { SERIES, useElementWidth } from './utils'

/* ─── Escala "bonita" para ejes ────────────────────────────── */
function niceMax(max, ticks = 4) {
  if (!max || max <= 0) return { max: 1, step: 1 / ticks }
  const raw = max / ticks
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * pow
  return { max: step * ticks, step }
}

export function Legend({ items, kind = 'rect' }) {
  if (!items || items.length < 2) return null
  return (
    <ul className="chart-legend">
      {items.map(it => (
        <li key={it.name}>
          <span className={`legend-key legend-key-${kind}`} style={{ background: it.color }} aria-hidden="true" />
          {it.name}
        </li>
      ))}
    </ul>
  )
}

function Tooltip({ x, y, containerWidth, children }) {
  // Se ancla al punto y se desplaza en los bordes para no salir del contenedor
  const shift = x < 90 ? '0%' : x > containerWidth - 90 ? '-100%' : '-50%'
  return (
    <div className="chart-tooltip" style={{ left: x, top: y, transform: `translateX(${shift})` }} role="status">
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Gráfico de línea (serie temporal) con cruz de lectura
   data: [{ label, value }]
   ══════════════════════════════════════════════════════════════ */
export function LineChart({ data, height = 240, color = SERIES[0], valueFormat = (v) => v, seriesName = 'Valor', xFormat = (l) => l }) {
  const [ref, width] = useElementWidth()
  const [hover, setHover] = useState(null)

  const pad = { top: 16, right: 16, bottom: 28, left: 44 }
  const innerW = Math.max(width - pad.left - pad.right, 10)
  const innerH = height - pad.top - pad.bottom
  const values = data.map(d => d.value)
  const { max, step } = niceMax(Math.max(...values, 0))
  const n = data.length
  const xAt = (i) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const yAt = (v) => pad.top + innerH - (v / max) * innerH

  const path = data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(d.value).toFixed(1)}`).join(' ')
  const area = n > 1 ? `${path} L${xAt(n - 1)},${pad.top + innerH} L${xAt(0)},${pad.top + innerH} Z` : ''
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step)

  // Etiquetas del eje X sin solaparse (~70px por etiqueta)
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 70))))
  const peakIdx = values.indexOf(Math.max(...values))

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = n <= 1 ? 0 : Math.round(((px - pad.left) / innerW) * (n - 1))
    setHover(Math.min(Math.max(i, 0), n - 1))
  }

  return (
    <div ref={ref} className="chart-root" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={`${seriesName}: ${n} puntos`}
          onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={yAt(t)} y2={yAt(t)} className="chart-grid" />
              <text x={pad.left - 8} y={yAt(t)} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
                {valueFormat(t, true)}
              </text>
            </g>
          ))}
          {data.map((d, i) => ((i % every === 0 && (n - 1 - i >= every || i === n - 1)) || i === n - 1) && (
            <text key={i} x={xAt(i)} y={height - 8} className="chart-axis-label" textAnchor={i === 0 && n > 1 ? 'start' : i === n - 1 && n > 1 ? 'end' : 'middle'}>
              {xFormat(d.label)}
            </text>
          ))}
          {area && <path d={area} fill={color} opacity="0.08" />}
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {n === 1 && <circle cx={xAt(0)} cy={yAt(values[0])} r="4" fill={color} />}
          {/* Etiqueta directa selectiva: el pico */}
          {n > 1 && hover == null && (
            <g>
              <circle cx={xAt(peakIdx)} cy={yAt(values[peakIdx])} r="4" fill={color} stroke="#fff" strokeWidth="2" />
              <text x={xAt(peakIdx)} y={yAt(values[peakIdx]) - 10} textAnchor={peakIdx > n * 0.8 ? 'end' : peakIdx < n * 0.2 ? 'start' : 'middle'} className="chart-direct-label">
                Máx. {valueFormat(values[peakIdx])}
              </text>
            </g>
          )}
          {hover != null && (
            <g>
              <line x1={xAt(hover)} x2={xAt(hover)} y1={pad.top} y2={pad.top + innerH} className="chart-crosshair" />
              <circle cx={xAt(hover)} cy={yAt(values[hover])} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
            </g>
          )}
        </svg>
      )}
      {hover != null && (
        <Tooltip x={xAt(hover)} y={Math.max(yAt(values[hover]) - 64, 0)} containerWidth={width}>
          <span className="tt-title">{xFormat(data[hover].label)}</span>
          <span className="tt-row"><span className="tt-key" style={{ background: color }} /><strong>{valueFormat(values[hover])}</strong> {seriesName}</span>
        </Tooltip>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Barras horizontales (comparación entre categorías)
   rows:   [{ id, label, values: { key: number } }]
   series: [{ key, name, format }]  — 1 serie o 2 agrupadas (misma unidad)
   ══════════════════════════════════════════════════════════════ */
export function BarList({ rows, series, onSelect, maxRows = 10, labelWidth = 180 }) {
  const [hover, setHover] = useState(null)
  const shown = rows.slice(0, maxRows)
  const max = useMemo(() => Math.max(1, ...shown.flatMap(r => series.map(s => r.values[s.key] || 0))), [shown, series])
  const grouped = series.length > 1

  return (
    <div className="barlist">
      <Legend items={series.map((s, i) => ({ name: s.name, color: SERIES[i] }))} />
      {shown.map(r => (
        <div
          key={r.id ?? r.label}
          className={`barlist-row${onSelect ? ' clickable' : ''}${hover === r.label ? ' hovered' : ''}`}
          style={{ gridTemplateColumns: `minmax(90px, ${labelWidth}px) 1fr` }}
          onClick={onSelect ? () => onSelect(r) : undefined}
          onKeyDown={onSelect ? (e) => { if (e.key === 'Enter') onSelect(r) } : undefined}
          tabIndex={onSelect ? 0 : undefined}
          role={onSelect ? 'button' : undefined}
          onPointerEnter={() => setHover(r.label)}
          onPointerLeave={() => setHover(null)}
          onFocus={() => setHover(r.label)}
          onBlur={() => setHover(null)}
          title={series.map(s => `${s.name}: ${s.format(r.values[s.key] || 0)}`).join(' · ')}
        >
          <span className="barlist-label">{r.label}</span>
          <div className="barlist-bars">
            {series.map((s, i) => {
              const v = r.values[s.key] || 0
              const pct = (v / max) * 100
              return (
                <div key={s.key} className={`barlist-track${grouped ? ' grouped' : ''}`}>
                  <div className="barlist-bar" style={{ width: `${v > 0 ? Math.max(pct, 0.8) : 0}%`, background: SERIES[i] }} />
                  <span className="barlist-value">{s.format(v)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {rows.length > maxRows && (
        <p className="chart-note">Mostrando {maxRows} de {rows.length}. La vista de tabla incluye todas.</p>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Embudo clics → conversiones (relación entre etapas)
   stages: [{ label, value }]
   ══════════════════════════════════════════════════════════════ */
export function Funnel({ stages, format = (v) => v }) {
  const first = stages[0]?.value || 0
  return (
    <div className="funnel">
      {stages.map((s, i) => {
        const pct = first > 0 ? (s.value / first) * 100 : 0
        const prev = i > 0 ? stages[i - 1].value : null
        const stepRate = prev ? (s.value / prev) * 100 : null
        return (
          <div key={s.label} className="funnel-stage">
            <div className="funnel-head">
              <span className="funnel-label">{s.label}</span>
              <span className="funnel-value">{format(s.value)}</span>
            </div>
            <div className="funnel-track" title={`${s.label}: ${format(s.value)}`}>
              <div className="funnel-bar" style={{ width: `${i === 0 ? (first > 0 ? 100 : 0) : Math.max(pct, s.value > 0 ? 1 : 0)}%` }} />
            </div>
            {stepRate != null && (
              <span className="funnel-rate">
                {stepRate.toFixed(1).replace('.', ',')} % de la etapa anterior
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Medidor de consumo (p. ej. presupuesto ejecutado)
   ══════════════════════════════════════════════════════════════ */
export function Meter({ value, max, format = (v) => v, label }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const over = max > 0 && value > max
  const tone = over ? 'danger' : pct >= 80 ? 'warn' : 'ok'
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <strong>{max > 0 ? `${Math.round((value / max) * 100)} %` : 'Sin presupuesto'}</strong>
      </div>
      <div className="meter-track" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
        <div className={`meter-fill meter-${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="meter-foot">
        <span>{format(value)} ejecutado</span>
        <span>{max > 0 ? `de ${format(max)}` : ''}</span>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Distribución parte-todo en una barra segmentada (≤ 4 segmentos)
   items: [{ label, value, color }]
   ══════════════════════════════════════════════════════════════ */
export function Distribution({ items, format = (v) => v }) {
  const total = items.reduce((s, i) => s + i.value, 0)
  const visible = items.filter(i => i.value > 0)
  return (
    <div className="distribution">
      <div className="distribution-bar" role="img" aria-label={items.map(i => `${i.label}: ${i.value}`).join(', ')}>
        {total === 0
          ? <div className="distribution-seg" style={{ flex: 1, background: 'var(--color-surface-border)' }} />
          : visible.map(i => (
            <div key={i.label} className="distribution-seg" style={{ flex: i.value, background: i.color }} title={`${i.label}: ${format(i.value)}`} />
          ))}
      </div>
      <ul className="distribution-legend">
        {items.map(i => (
          <li key={i.label}>
            <span className="legend-key legend-key-rect" style={{ background: i.color }} aria-hidden="true" />
            <span className="distribution-name">{i.label}</span>
            <strong>{format(i.value)}</strong>
            <span className="distribution-pct">{total > 0 ? `${Math.round((i.value / total) * 100)} %` : '0 %'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
