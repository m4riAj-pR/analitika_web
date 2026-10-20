import { useState } from 'react'
import { api } from '../services/api'
import useAsync from '../lib/useAsync'
import { fmtMoney, fmtPct } from '../lib/format'
import { ChartCard, ErrorState, Notice, SkeletonRows } from './ui'
import { IconAlert, IconCheck, IconInfo } from './ui/Icons'

// Canales que acepta el modelo, excluyendo Meta (integración retirada del proyecto)
const CHANNELS = [
  { value: 'Google', label: 'Google' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Email', label: 'Email' },
  { value: 'WhatsApp', label: 'WhatsApp' },
]

const RECOMMENDATION = {
  'Escalar presupuesto': { tone: 'success', Icon: IconCheck, text: 'El retorno proyectado supera el umbral de rentabilidad. Considera aumentar el presupuesto de forma gradual.' },
  'Mantener y monitorear': { tone: 'warn', Icon: IconInfo, text: 'El retorno proyectado está dentro del rango esperado. Mantén la inversión y vuelve a evaluar en 48 horas.' },
  'Optimizar o pausar': { tone: 'danger', Icon: IconAlert, text: 'El retorno proyectado indica riesgo de pérdida. Revisa segmentación y creatividades, o pausa la campaña.' },
}

/** El modelo devuelve el ROI como razón (0,35 = 35 %). */
const ratioToPct = (r) => (r == null ? null : Number(r) * 100)

export default function RoiPredictorCard({ campaign, stats }) {
  const model = useAsync(() => api.campaigns.predict(campaign.id), [campaign.id])

  // Variables iniciales del simulador = métricas reales acumuladas de la campaña.
  // El padre remonta el componente (key) al cambiar de campaña.
  const [form, setForm] = useState(() => ({
    channel: 'Google',
    spend_48h: String(stats?.spent ?? campaign.spent ?? 0),
    clicks_48h: String(stats?.clicks ?? 0),
    conversions_48h: String(stats?.conversions ?? 0),
    revenue_48h: String(stats?.revenue ?? 0),
  }))
  const [sim, setSim] = useState(null)
  const [simError, setSimError] = useState('')
  const [simLoading, setSimLoading] = useState(false)

  const onChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  const simulate = async (e) => {
    e.preventDefault()
    setSimLoading(true)
    setSimError('')
    try {
      setSim(await api.campaigns.predictRoi(form))
    } catch (err) {
      setSim(null)
      setSimError(err.message)
    } finally {
      setSimLoading(false)
    }
  }

  const p = model.data
  const rec = sim ? RECOMMENDATION[sim.strategic_recommendation] : null
  const currentRoi = stats?.roi

  return (
    <ChartCard
      title="Proyección de ROI a 7 días"
      subtitle="Modelo de Gradient Boosting entrenado con las primeras 48 horas de cada campaña"
    >
      <div className="predict-grid">
        <div className="predict-block">
          <h3 className="mini-title">Predicción con datos reales</h3>
          {model.loading && !p ? <SkeletonRows rows={2} height={40} /> : model.error ? (
            <ErrorState message={`No fue posible obtener la predicción: ${model.error.message}`} onRetry={model.reload} />
          ) : p && (
            <>
              <div className="compare-pair">
                <div>
                  <span className="stat-label">ROI actual</span>
                  <span className={`stat-value ${currentRoi < 0 ? 'text-danger' : ''}`}>{fmtPct(currentRoi)}</span>
                </div>
                <div>
                  <span className="stat-label">ROI proyectado 7 días</span>
                  <span className={`stat-value text-primary ${p.predicted_roi_7d < 0 ? 'text-danger' : ''}`}>{fmtPct(ratioToPct(p.predicted_roi_7d))}</span>
                </div>
              </div>
              <dl className="kv-list">
                <div><dt>Datos observados</dt><dd>{p.hours_of_data_available} h de {p.observation_window_hours} h</dd></div>
                <div><dt>Modelo</dt><dd>{p.model_artifact}{p.model_version ? ` · v${p.model_version}` : ''}</dd></div>
              </dl>
              {p.low_confidence_warning && <Notice tone="warn">{p.low_confidence_warning}</Notice>}
              {p.dataset_warning && <Notice>{p.dataset_warning}</Notice>}
            </>
          )}
        </div>

        <form className="predict-block" onSubmit={simulate}>
          <h3 className="mini-title">Simulador de escenarios</h3>
          <p className="chart-note" style={{ marginTop: 0 }}>Ajusta las métricas de las primeras 48 h para evaluar un escenario alternativo.</p>
          <div className="form-grid-5">
            <div className="form-group">
              <label htmlFor="sim-channel">Canal</label>
              <select id="sim-channel" name="channel" className="input-control" value={form.channel} onChange={onChange}>
                {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="sim-spend">Inversión ($)</label>
              <input id="sim-spend" name="spend_48h" type="number" min="0" step="any" className="input-control" value={form.spend_48h} onChange={onChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="sim-clicks">Clics</label>
              <input id="sim-clicks" name="clicks_48h" type="number" min="0" step="1" className="input-control" value={form.clicks_48h} onChange={onChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="sim-conv">Conversiones</label>
              <input id="sim-conv" name="conversions_48h" type="number" min="0" step="1" className="input-control" value={form.conversions_48h} onChange={onChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="sim-rev">Ingresos ($)</label>
              <input id="sim-rev" name="revenue_48h" type="number" min="0" step="any" className="input-control" value={form.revenue_48h} onChange={onChange} required />
            </div>
          </div>
          <div>
            <button type="submit" className="btn-primary" disabled={simLoading}>
              {simLoading ? 'Calculando…' : 'Calcular escenario'}
            </button>
          </div>
          {simError && <ErrorState message={simError} />}
          {sim && (
            <div className="sim-result">
              <div className="compare-pair">
                <div>
                  <span className="stat-label">ROI proyectado</span>
                  <span className="stat-value text-primary">{fmtPct(ratioToPct(sim.predicted_roi_7d))}</span>
                </div>
                <div>
                  <span className="stat-label">Ingreso estimado 7 días</span>
                  <span className="stat-value">{fmtMoney(sim.estimated_revenue_7d)}</span>
                </div>
              </div>
              {rec && (
                <div className={`recommendation recommendation-${rec.tone}`}>
                  <rec.Icon size={18} />
                  <div>
                    <strong>{sim.strategic_recommendation}</strong>
                    <p>{rec.text}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </ChartCard>
  )
}
