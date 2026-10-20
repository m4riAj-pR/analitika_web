import { api } from '../services/api'

/** Suma las métricas de varias campañas. Los campos financieros quedan null si el rol no los recibe. */
export function aggregate(campaigns) {
  const fin = campaigns.some(c => c.stats?.revenue != null)
  const sum = (k) => campaigns.reduce((s, c) => s + (Number(c.stats?.[k]) || 0), 0)
  const clicks = sum('clicks')
  const conversions = sum('conversions')
  const spent = fin ? sum('spent') : null
  const revenue = fin ? sum('revenue') : null
  return {
    clicks,
    conversions,
    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    spent,
    revenue,
    profit: fin ? revenue - spent : null,
    roi: fin && spent > 0 ? ((revenue - spent) / spent) * 100 : null,
    roas: fin && spent > 0 ? revenue / spent : null,
    active: campaigns.filter(c => c.status === 'active').length,
    hasFinancials: fin,
  }
}

/** Serie diaria de clics sumando todas las campañas, con días sin actividad rellenados en 0. */
export function mergeDaily(seriesList) {
  const map = new Map()
  seriesList.flat().forEach(d => map.set(d.date, (map.get(d.date) || 0) + d.clicks))
  return fillDays([...map.entries()].map(([date, clicks]) => ({ date, clicks })))
}

export function fillDays(points) {
  if (points.length === 0) return []
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date))
  const byDate = new Map(sorted.map(p => [p.date, p.clicks]))
  const out = []
  const d = new Date(`${sorted[0].date}T00:00:00Z`)
  const end = new Date(`${sorted[sorted.length - 1].date}T00:00:00Z`)
  while (d <= end && out.length < 400) {
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, clicks: byDate.get(key) || 0 })
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

/** Carga campañas con métricas y la serie diaria agregada. */
export async function loadOverview() {
  const campaigns = await api.stats.campaignsWithStats()
  const daily = await Promise.all(
    campaigns.filter(c => c.stats.clicks > 0).map(c => api.stats.clicksByDay(c.id).catch(() => [])),
  )
  return { campaigns, daily: mergeDaily(daily) }
}
