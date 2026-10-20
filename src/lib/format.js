/** Formateadores con locale es-CO para que cifras y fechas sean consistentes en toda la app. */
const LOCALE = 'es-CO'

const intFmt = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })
const decFmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const moneyFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 })
const moneyCompactFmt = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol', notation: 'compact', maximumFractionDigits: 1 })
const compactFmt = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })

const isNum = (v) => v != null && Number.isFinite(Number(v))

export const fmtInt = (v) => (isNum(v) ? intFmt.format(Number(v)) : '—')
export const fmtDec = (v) => (isNum(v) ? decFmt.format(Number(v)) : '—')
export const fmtMoney = (v) => (isNum(v) ? moneyFmt.format(Number(v)) : '—')
export const fmtMoneyCompact = (v) => (isNum(v) ? moneyCompactFmt.format(Number(v)) : '—')
export const fmtCompact = (v) => (isNum(v) ? compactFmt.format(Number(v)) : '—')
export const fmtPct = (v, digits = 1) => (isNum(v) ? `${Number(v).toFixed(digits).replace('.', ',')} %` : '—')
export const fmtRatio = (v) => (isNum(v) ? `${Number(v).toFixed(2).replace('.', ',')}x` : '—')

export function fmtDate(value, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  if (!value) return '—'
  const s = String(value)
  // Fechas "YYYY-MM-DD" se interpretan como locales para evitar el desfase de un día por UTC
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(LOCALE, opts)
}

export const fmtDayShort = (value) => fmtDate(value, { day: '2-digit', month: 'short' })

export function fmtRelative(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  if (diff < 172800) return 'Ayer'
  return fmtDate(value)
}

export const STATUS_META = {
  active:   { label: 'Activa',     badge: 'badge-success', dot: 'active' },
  paused:   { label: 'Pausada',    badge: 'badge-warn',    dot: 'paused' },
  draft:    { label: 'Borrador',   badge: 'badge-neutral', dot: 'inactive' },
  finished: { label: 'Finalizada', badge: 'badge-neutral', dot: 'inactive' },
}
export const statusMeta = (s) => STATUS_META[s] || { label: s || '—', badge: 'badge-neutral', dot: 'inactive' }

export const ROLE_LABELS = { 1: 'Super Admin', 2: 'Owner', 3: 'Manager' }
export const roleLabel = (id) => ROLE_LABELS[Number(id)] || 'Usuario'

/** Dispositivo a partir del user-agent registrado en el clic. */
export function deviceFromUA(ua = '') {
  const s = ua.toLowerCase()
  if (!s || s === 'n/a') return 'Desconocido'
  if (/ipad|tablet/.test(s)) return 'Tablet'
  if (/mobi|iphone|android/.test(s)) return 'Móvil'
  return 'Escritorio'
}

/** Cuenta ocurrencias por clave y devuelve [{label, value}] ordenado desc. */
export function countBy(rows, keyFn, { top = 6, otherLabel = 'Otros' } = {}) {
  const map = new Map()
  rows.forEach(r => {
    const k = keyFn(r) || 'Desconocido'
    map.set(k, (map.get(k) || 0) + 1)
  })
  const sorted = [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  if (sorted.length <= top) return sorted
  const head = sorted.slice(0, top - 1)
  const rest = sorted.slice(top - 1).reduce((s, x) => s + x.value, 0)
  return [...head, { label: otherLabel, value: rest }]
}
