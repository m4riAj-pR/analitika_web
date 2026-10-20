import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, trackingUrl } from '../services/api'
import { PageHeader } from './ui'
import { IconCheck, IconCopy, IconArrowRight } from './ui/Icons'

// Canales de difusión. El nombre se registra en /analitika/channels y el backend
// lo usa para generar utm_source en el link de seguimiento.
const CHANNELS = [
  { id: 'google', name: 'Google Ads', desc: 'Búsqueda, Display y YouTube' },
  { id: 'tiktok', name: 'TikTok Ads', desc: 'Video vertical' },
  { id: 'email', name: 'Email', desc: 'Boletines y secuencias' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Mensajería directa' },
  { id: 'organic', name: 'Orgánico', desc: 'Redes y sitio web' },
]

const STATUSES = [
  { id: 'active', label: 'Activa' },
  { id: 'draft', label: 'Borrador' },
  { id: 'paused', label: 'Pausada' },
]

const STEPS = ['Creando campaña', 'Registrando canal', 'Generando link de seguimiento']

const parseAmount = (v) => {
  if (!String(v).trim()) return 0
  const n = Number(String(v).trim().replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

export default function CrearCampanaForm({ user }) {
  const navigate = useNavigate()
  const isOwner = user?.id_role === 1 || user?.id_role === 2
  const companies = user?.companies || []
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    id_company: companies[0]?.id_company ?? '',
    name: '',
    description: '',
    status: 'active',
    start_date: today,
    end_date: '',
    budget: '',
    spent: '',
    channel: 'google',
    destination: '',
  })
  const [step, setStep] = useState(-1)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }))
  const running = step >= 0 && !result

  const validate = () => {
    const year = new Date().getFullYear()
    if (!form.id_company) return 'Tu usuario no tiene una empresa asignada; no es posible crear campañas.'
    if (!form.name.trim()) return 'El nombre de la campaña es obligatorio.'
    if (!form.start_date) return 'Selecciona la fecha de inicio.'
    const sy = Number(form.start_date.slice(0, 4))
    if (sy < year || sy > year + 1) return `La fecha de inicio debe estar en ${year} o ${year + 1}.`
    if (form.end_date && form.end_date < form.start_date) return 'La fecha de fin no puede ser anterior a la de inicio.'
    if (Number.isNaN(parseAmount(form.budget))) return 'El presupuesto debe ser un número mayor o igual a cero.'
    if (Number.isNaN(parseAmount(form.spent))) return 'La inversión ejecutada debe ser un número mayor o igual a cero.'
    try {
      const u = new URL(form.destination.trim())
      if (!/^https?:$/.test(u.protocol)) throw new Error()
    } catch {
      return 'La URL de destino debe ser una dirección válida que empiece por http:// o https://'
    }
    return null
  }

  /** Busca el canal por nombre; si no existe y el rol lo permite, lo crea. */
  const resolveChannel = async (name) => {
    const find = (list) => list.find(c => (c.name || '').trim().toLowerCase() === name.toLowerCase())
    const existing = find(await api.channels.getAll())
    if (existing) return existing.id_channel
    if (!isOwner) return null
    await api.channels.create({ name, description: `Canal ${name}` })
    return find(await api.channels.getAll())?.id_channel ?? null
  }

  const submit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setError('')

    const channel = CHANNELS.find(c => c.id === form.channel)
    let idCampaign = null
    let current = 0
    const go = (i) => { current = i; setStep(i) }
    try {
      go(0)
      const created = await api.campaigns.create({
        id_company: Number(form.id_company),
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        start_date: form.start_date,
        end_date: form.end_date || null,
        budget: parseAmount(form.budget),
        spent: parseAmount(form.spent),
      })
      idCampaign = created?.id_campaign
      if (!idCampaign) throw new Error('El servidor no devolvió el identificador de la campaña.')

      go(1)
      const idChannel = await resolveChannel(channel.name)

      go(2)
      const link = await api.trackingLinks.create({
        id_campaign: idCampaign,
        id_channel: idChannel,
        destination: form.destination.trim(),
      })

      setResult({
        idCampaign,
        name: form.name.trim(),
        channel: idChannel ? channel.name : null,
        url: link?.id_link ? trackingUrl(link.id_link) : null,
      })
    } catch (err) {
      setStep(-1)
      setError(idCampaign
        ? `La campaña se creó, pero falló el paso “${STEPS[current]}”: ${err.message}`
        : err.message)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* sin acceso al portapapeles */ }
  }

  if (result) {
    return (
      <div className="page">
        <div className="card success-card">
          <span className="success-icon"><IconCheck size={28} /></span>
          <h1 className="page-title">Campaña creada</h1>
          <p className="page-subtitle">“{result.name}” quedó registrada{result.channel ? ` en el canal ${result.channel}` : ''}.</p>

          {result.url && (
            <div className="link-box">
              <span className="mini-title">Link de seguimiento</span>
              <p className="chart-note" style={{ margin: '0 0 10px' }}>Usa este enlace en tus anuncios: cada visita registra un clic y redirige a tu URL de destino.</p>
              <div className="link-cell">
                <input readOnly value={result.url} className="input-control mono" aria-label="Link de seguimiento" onFocus={(e) => e.target.select()} />
                <button type="button" className="btn-primary" onClick={copy}>
                  {copied ? <><IconCheck size={16} /> Copiado</> : <><IconCopy size={16} /> Copiar</>}
                </button>
              </div>
            </div>
          )}

          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate(`/dashboard/desglose?id=${result.idCampaign}`)}>
              Ver desglose <IconArrowRight size={16} />
            </button>
            <button className="btn-cancel" onClick={() => { setResult(null); setStep(-1); setForm(f => ({ ...f, name: '', description: '', destination: '' })) }}>
              Crear otra campaña
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-narrow">
      <PageHeader title="Nueva campaña" subtitle="Registra la campaña y genera su link de seguimiento en un solo paso" />

      {error && <div className="alert-message alert-error" role="alert">{error}</div>}

      <form onSubmit={submit} className="form-stack">
        <fieldset disabled={running} className="card form-section">
          <legend className="form-section-title">Información general</legend>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="camp-company">Empresa</label>
              {companies.length > 1 ? (
                <select id="camp-company" className="input-control" value={form.id_company} onChange={set('id_company')}>
                  {companies.map(c => <option key={c.id_company} value={c.id_company}>{c.name}</option>)}
                </select>
              ) : (
                <input id="camp-company" className="input-control" value={companies[0]?.name || 'Sin empresa asignada'} readOnly />
              )}
            </div>
            <div className="form-group">
              <label htmlFor="camp-name">Nombre <span className="req">*</span></label>
              <input id="camp-name" className="input-control" value={form.name} onChange={set('name')} placeholder="Ej. Lanzamiento colección otoño" maxLength={120} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="camp-desc">Descripción <span className="label-hint">(se muestra en la página de aterrizaje)</span></label>
            <textarea id="camp-desc" className="input-control" rows={2} value={form.description} onChange={set('description')} maxLength={500} />
          </div>
          <div className="form-row-3">
            <div className="form-group">
              <label htmlFor="camp-status">Estado</label>
              <select id="camp-status" className="input-control" value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="camp-start">Inicio <span className="req">*</span></label>
              <input id="camp-start" type="date" className="input-control" value={form.start_date} onChange={set('start_date')} required />
            </div>
            <div className="form-group">
              <label htmlFor="camp-end">Fin <span className="label-hint">(opcional)</span></label>
              <input id="camp-end" type="date" className="input-control" value={form.end_date} min={form.start_date} onChange={set('end_date')} />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="camp-budget">Presupuesto total ($)</label>
              <input id="camp-budget" inputMode="decimal" className="input-control" value={form.budget} onChange={set('budget')} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label htmlFor="camp-spent">Inversión ejecutada ($)</label>
              <input id="camp-spent" inputMode="decimal" className="input-control" value={form.spent} onChange={set('spent')} placeholder="0,00" />
              <span className="field-hint">Se usa para calcular CPC, CPA y ROI.</span>
            </div>
          </div>
        </fieldset>

        <fieldset disabled={running} className="card form-section">
          <legend className="form-section-title">Canal y destino</legend>
          <div className="form-group">
            <span className="label-like" id="channel-label">Canal de difusión</span>
            <div className="choice-grid" role="radiogroup" aria-labelledby="channel-label">
              {CHANNELS.map(c => (
                <label key={c.id} className={`choice${form.channel === c.id ? ' selected' : ''}`}>
                  <input type="radio" name="channel" value={c.id} checked={form.channel === c.id} onChange={set('channel')} />
                  <span className="choice-title">{c.name}</span>
                  <span className="choice-desc">{c.desc}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="camp-dest">URL de destino <span className="req">*</span></label>
            <input id="camp-dest" type="url" className="input-control" value={form.destination} onChange={set('destination')} placeholder="https://tusitio.com/landing" required />
            <span className="field-hint">Si no incluye parámetros UTM, el servidor añade utm_source, utm_medium y utm_campaign automáticamente.</span>
          </div>
        </fieldset>

        {running && (
          <ol className="steps" aria-live="polite">
            {STEPS.map((label, i) => (
              <li key={label} className={i < step ? 'done' : i === step ? 'current' : ''}>
                <span className="step-dot">{i < step ? <IconCheck size={12} /> : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}

        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={() => navigate('/dashboard/campanas')} disabled={running}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={running || companies.length === 0}>
            {running ? 'Creando…' : 'Crear campaña'}
          </button>
        </div>
      </form>
    </div>
  )
}
