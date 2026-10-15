import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { IconCampaign, IconLink, IconShield, IconConnect } from './DashboardShell'

const CHANNELS = [
  { id: 'meta_ads', name: 'Meta Ads (Facebook & Instagram)', tag: 'META', desc: 'Anuncios en feed, stories y reels de Meta' },
  { id: 'google_ads', name: 'Google Ads', tag: 'GOOGLE', desc: 'Búsqueda, Display y YouTube Ads' },
  { id: 'tiktok_ads', name: 'TikTok Ads', tag: 'TIKTOK', desc: 'Pauta en video de formato vertical' },
  { id: 'whatsapp', name: 'WhatsApp Business', tag: 'WSP', desc: 'Enlaces directos a chat y mensajería' },
  { id: 'email', name: 'Email Marketing', tag: 'EMAIL', desc: 'Boletines y secuencias de correo' },
  { id: 'organic', name: 'Orgánico / Social Media', tag: 'WEB', desc: 'Tráfico orgánico en redes y web' },
]

const STATUSES = [
  { id: 'active', label: 'Activa', desc: 'En ejecución y recolectando datos', badgeClass: 'badge-success' },
  { id: 'draft', label: 'Borrador', desc: 'Guardada pero sin publicar pauta', badgeClass: 'badge-neutral' },
  { id: 'paused', label: 'Pausada', desc: 'Detenida temporalmente', badgeClass: 'badge-warn' },
  { id: 'finished', label: 'Finalizada', desc: 'Campana completada', badgeClass: 'badge-neutral' },
]

export default function CrearCampanaForm({ user, initialData = null, isEdit = false }) {
  const navigate = useNavigate()
  const isOwnerOrAdmin = user?.id_role === 1 || user?.id_role === 2

  // 1. Contexto de Empresa (Multi-tenancy)
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    user?.id_company || user?.company_id || user?.companies?.[0]?.id || user?.companies?.[0] || ''
  )
  const [companyError, setCompanyError] = useState('')

  // 2. Form state
  const [name, setName] = useState(initialData?.name || '')
  const [spent, setSpent] = useState(initialData?.spent != null ? String(initialData?.spent) : '')
  const [status, setStatus] = useState(initialData?.status || 'active')
  const [startDate, setStartDate] = useState(
    initialData?.start_date ? initialData.start_date.substring(0, 10) : new Date().toISOString().substring(0, 10)
  )
  const [endDate, setEndDate] = useState(
    initialData?.end_date ? initialData.end_date.substring(0, 10) : ''
  )
  const [channel, setChannel] = useState(initialData?.channel || 'meta_ads')
  const [channelDesc, setChannelDesc] = useState(initialData?.channel_desc || '')
  const [targetUrl, setTargetUrl] = useState(initialData?.target_url || 'https://analitika.com/landing')

  // 3. Meta Ads Integration State (Solo Owner/Admin)
  const [adConnections, setAdConnections] = useState([])
  const [externalCampaigns, setExternalCampaigns] = useState([])
  const [selectedMetaCampaignId, setSelectedMetaCampaignId] = useState('')
  const [loadingMetaCampaigns, setLoadingMetaCampaigns] = useState(false)
  const [syncMetaAds, setSyncMetaAds] = useState(true)

  // 4. Pipeline Execution State
  const [executing, setExecuting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 1..5
  const [stepLabel, setStepLabel] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [createdResult, setCreatedResult] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // Carga de empresas (para Super Admin o resolución de fallback)
  useEffect(() => {
    let isMounted = true
    api.companies.getAll()
      .then(data => {
        if (!isMounted) return
        const list = Array.isArray(data) ? data : []
        setCompanies(list)
        if (!selectedCompanyId && list.length > 0) {
          // Si es Super Admin o no hay empresa directa, fallback a la primera
          setSelectedCompanyId(list[0].id)
        }
      })
      .catch(() => {})
    return () => { isMounted = false }
  }, [selectedCompanyId])

  // Validación de empresa
  useEffect(() => {
    if (!selectedCompanyId && companies.length === 0 && !user?.id_company && !user?.company_id) {
      setCompanyError('No se encontró una empresa asociada a tu sesión. La campaña requiere una empresa obligatoria.')
    } else {
      setCompanyError('')
    }
  }, [selectedCompanyId, companies, user])

  // Cargar cuentas de Meta Ads si es Owner/Admin y canal es Meta
  useEffect(() => {
    if (isOwnerOrAdmin && channel === 'meta_ads' && selectedCompanyId) {
      api.adConnections.getActive(selectedCompanyId)
        .then(accounts => {
          setAdConnections(accounts)
          if (accounts.length > 0) {
            setLoadingMetaCampaigns(true)
            api.adConnections.getExternalCampaigns(accounts[0].account_id)
              .then(camps => {
                setExternalCampaigns(camps)
                if (camps.length > 0) {
                  setSelectedMetaCampaignId(camps[0].id)
                }
              })
              .finally(() => setLoadingMetaCampaigns(false))
          }
        })
        .catch(() => {})
    }
  }, [isOwnerOrAdmin, channel, selectedCompanyId])

  // Reglas de Temporalidad (Validación de años)
  const validateDates = () => {
    const currentYear = new Date().getFullYear()

    if (!startDate) {
      return 'Debes seleccionar una fecha de inicio.'
    }

    const startYear = parseInt(startDate.split('-')[0], 10)
    if (isNaN(startYear) || startYear < currentYear) {
      return `La fecha de inicio no puede ser anterior al año en curso (${currentYear}).`
    }
    if (startYear > currentYear + 1) {
      return `La fecha de inicio no puede superar el año siguiente (${currentYear + 1}).`
    }

    if (endDate) {
      const endYear = parseInt(endDate.split('-')[0], 10)
      if (isNaN(endYear) || endYear < currentYear) {
        return `La fecha de fin no puede ser anterior al año en curso (${currentYear}).`
      }
      if (endYear > currentYear + 1) {
        return `La fecha de fin no puede superar el año siguiente (${currentYear + 1}).`
      }
      if (new Date(endDate) < new Date(startDate)) {
        return 'La fecha de fin debe ser posterior o igual a la fecha de inicio.'
      }
    }

    return null
  }

  // Pipeline de Creación en Cascada
  const handleCreate = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    // Validación 1: Nombre
    if (!name.trim()) {
      setErrorMsg('El nombre de la campaña es obligatorio.')
      return
    }

    // Validación 2: Empresa
    const companyIdToUse = selectedCompanyId || companies[0]?.id
    if (!companyIdToUse) {
      setErrorMsg('No se ha podido asociar la campaña a ninguna empresa identificable.')
      return
    }

    // Validación 3: Temporalidad
    const dateError = validateDates()
    if (dateError) {
      setErrorMsg(dateError)
      return
    }

    // Normalización de presupuesto (comas a puntos decimales)
    let parsedSpent = null
    if (spent.trim()) {
      const normalized = spent.trim().replace(',', '.')
      const num = parseFloat(normalized)
      if (isNaN(num) || num < 0) {
        setErrorMsg('El presupuesto debe ser un número válido mayor o igual a cero.')
        return
      }
      parsedSpent = num
    }

    setExecuting(true)

    try {
      // ── FASE 1 & 2: Crear o Actualizar Campaña ──
      setCurrentStep(1)
      setStepLabel(isEdit ? 'Actualizando datos de la campaña...' : '1. Creando campaña en la base de datos...')

      const campaignPayload = {
        name: name.trim(),
        spent: parsedSpent,
        status,
        start_date: startDate,
        end_date: endDate || null,
        id_company: companyIdToUse,
      }

      let campaignRes
      let campaignId

      if (isEdit && initialData?.id) {
        campaignRes = await api.campaigns.update(initialData.id, campaignPayload)
        campaignId = initialData.id
      } else {
        campaignRes = await api.campaigns.create(campaignPayload)
        // Obtener id_campaign del backend o fallback por nombre
        campaignId = campaignRes?.id || campaignRes?.id_campaign

        if (!campaignId) {
          // Fallback: buscar la campaña recién creada por nombre y empresa
          try {
            const allCamps = await api.campaigns.getAll()
            const match = allCamps.find(c => c.name === campaignPayload.name && (c.id_company === companyIdToUse || !c.id_company))
            campaignId = match ? match.id : Date.now()
          } catch {
            campaignId = Date.now()
          }
        }
      }

      // ── FASE 3: Registrar Canal de Difusión ──
      setCurrentStep(2)
      setStepLabel('2. Registrando canal de difusión asociado...')
      const selectedChannelObj = CHANNELS.find(c => c.id === channel)
      await api.channels.createChannel({
        id_campaign: campaignId,
        channel: channel,
        channel_name: selectedChannelObj?.name || channel,
        description: channelDesc.trim() || `Difusión principal mediante ${selectedChannelObj?.name}`,
        target_url: targetUrl.trim(),
      })

      // ── FASE 4: Generación Automática del Tracking Link ──
      setCurrentStep(3)
      setStepLabel('3. Generando Tracking Link automático y parámetros UTM...')
      const trackingLinkRes = await api.trackingLinks.create({
        id_campaign: campaignId,
        destination_url: targetUrl.trim(),
        utm_source: channel,
        utm_medium: 'cpc',
        utm_campaign: name.trim().toLowerCase().replace(/\s+/g, '_'),
      })

      // ── FASE 5: Sincronización y Mapeo Externo (Meta Ads API si aplica) ──
      let metaMappingInfo = null
      if (isOwnerOrAdmin && channel === 'meta_ads' && syncMetaAds && selectedMetaCampaignId) {
        setCurrentStep(4)
        setStepLabel('4. Vinculando con Meta Ads y sincronizando métricas...')
        const metaCampaign = externalCampaigns.find(mc => mc.id === selectedMetaCampaignId)
        metaMappingInfo = await api.adConnections.mapExternal(campaignId, {
          external_campaign_id: selectedMetaCampaignId,
          external_campaign_name: metaCampaign?.name || 'Meta Campaign',
          account_id: adConnections[0]?.account_id || 'act_default',
        })
      }

      // ── FASE 6: Finalización ──
      setCurrentStep(5)
      setStepLabel('¡Campaña y Tracking Link listos con éxito!')

      setCreatedResult({
        campaignId,
        name: name.trim(),
        status,
        channel: selectedChannelObj?.name,
        trackingLink: trackingLinkRes.publicTrackUrl,
        destinationUrl: targetUrl.trim(),
        metaMapped: Boolean(metaMappingInfo),
      })
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al ejecutar el pipeline de creación de la campaña.')
    } finally {
      setExecuting(false)
    }
  }

  const handleCopyLink = () => {
    if (createdResult?.trackingLink) {
      navigator.clipboard.writeText(createdResult.trackingLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  // Si ya se creó la campaña, mostramos la pantalla de éxito con el Tracking Link
  if (createdResult) {
    return (
      <div className="card" style={{ width: '100%', padding: '36px 40px', animation: 'fadeIn 0.25s ease' }}>
        <div style={{ textAlign: 'center', maxWidth: 680, margin: '0 auto' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-bg)',
            color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px', fontWeight: 800
          }}>
            ✓
          </div>

          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 6 }}>
            ¡Campaña {isEdit ? 'Actualizada' : 'Creada'} con Éxito!
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 28 }}>
            Se ha completado el pipeline de negocio: canal de difusión registrado y Tracking Link generado para medición en tiempo real.
          </p>

          {/* Bloque del Tracking Link Generado */}
          <div style={{
            background: 'var(--color-surface-mid)', border: '1px solid var(--color-surface-border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', textAlign: 'left', marginBottom: 24
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tracking Link Oficial
              </span>
              <span className="badge badge-success">Activo para atribución</span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Usa este enlace público en tus anuncios o publicaciones para trackear clics, conversiones y ROI de forma automática:
            </p>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={createdResult.trackingLink}
                className="input-control"
                style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600, background: '#fff', fontSize: '0.88rem' }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleCopyLink}
                style={{ padding: '0 18px', height: 40, flexShrink: 0 }}
              >
                {copiedLink ? 'Copiado' : 'Copiar Link'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: '0.78rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
              <span><strong>Destino:</strong> {createdResult.destinationUrl}</span>
              <span><strong>Canal:</strong> {createdResult.channel}</span>
              {createdResult.metaMapped && (
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                  Sincronizado con Meta Ads
                </span>
              )}
            </div>
          </div>

          {/* Acciones finales */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
            <button
              className="btn-primary"
              onClick={() => navigate('/dashboard/campanas')}
              id="btn-go-to-campaigns"
            >
              Ver Todas las Campañas
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setCreatedResult(null)
                setName('')
                setSpent('')
                setEndDate('')
              }}
            >
              Crear Otra Campaña
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Encabezado */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
          {isEdit ? 'Editar Campaña' : 'Crear Nueva Campaña'}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
          Configura los parámetros comerciales, canal de difusión, link trackeable y vinculación publicitaria.
        </p>
      </div>

      {/* Alerta de bloqueo por falta de empresa */}
      {companyError && (
        <div className="alert-message alert-error">
          {companyError}
        </div>
      )}

      {/* Alerta de errores de validación */}
      {errorMsg && (
        <div className="alert-message alert-error">
          {errorMsg}
        </div>
      )}

      {/* Pipeline en ejecución */}
      {executing && (
        <div className="card" style={{ padding: 20, background: 'var(--color-primary-bg)', border: '1px solid var(--color-primary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            <div>
              <p style={{ fontWeight: 700, color: 'var(--color-primary-dark)', fontSize: '0.92rem', margin: 0 }}>
                {stepLabel}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Fase {currentStep} de 5 en progreso
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* SECCIÓN 1: Contexto de Empresa y Datos Base */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: 12 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              1. Información General y Empresa
            </h2>
            <span className="badge badge-primary">Paso 1</span>
          </div>

          <div className="form-row-2">
            {/* Empresa (Multi-tenancy) */}
            <div className="form-group">
              <label htmlFor="camp-company">
                Empresa Asociada <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              {companies.length > 1 && user?.id_role === 1 ? (
                <select
                  id="camp-company"
                  className="input-control"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  required
                >
                  {companies.map(co => (
                    <option key={co.id} value={co.id}>
                      {co.name || co.nombre || `Empresa ${co.id}`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="camp-company"
                  type="text"
                  readOnly
                  disabled
                  value={
                    companies.find(c => c.id === selectedCompanyId)?.name ||
                    user?.company ||
                    (selectedCompanyId ? `Empresa ID #${selectedCompanyId}` : 'Sin empresa asociada')
                  }
                  className="input-control"
                  style={{ background: 'var(--color-surface-mid)', color: 'var(--color-text)' }}
                />
              )}
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Toda campaña se afilia obligatoriamente a una organización del sistema.
              </span>
            </div>

            {/* Nombre de la Campaña */}
            <div className="form-group">
              <label htmlFor="camp-name">
                Nombre de la Campaña <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="camp-name"
                type="text"
                required
                className="input-control"
                placeholder="Ej. Promoción Primavera 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            {/* Presupuesto / Gasto */}
            <div className="form-group">
              <label htmlFor="camp-spent">
                Presupuesto / Inversión (Opcional)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--color-text-muted)' }}>
                  $
                </span>
                <input
                  id="camp-spent"
                  type="text"
                  className="input-control"
                  placeholder="Ej. 1500.00 ó 1500,00"
                  value={spent}
                  onChange={(e) => setSpent(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Normaliza comas y puntos decimales automáticamente.
              </span>
            </div>

            {/* Estado de la Campaña */}
            <div className="form-group">
              <label htmlFor="camp-status">
                Estado Inicial <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                id="camp-status"
                className="input-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.desc})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Temporalidad */}
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="camp-start-date">
                Fecha de Inicio <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="camp-start-date"
                type="date"
                required
                className="input-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Regla de seguridad: Solo año en curso o siguiente.
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="camp-end-date">
                Fecha de Fin (Opcional)
              </label>
              <input
                id="camp-end-date"
                type="date"
                className="input-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                Deja en blanco para campañas continuas sin fecha de corte fija.
              </span>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: Canal de Difusión y Generación de Tracking Link */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: 12 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              2. Canal de Difusión y URL de Destino
            </h2>
            <span className="badge badge-primary">Paso 2</span>
          </div>

          {/* Selección visual de canales */}
          <div className="form-group">
            <label>Selecciona el Canal Principal de Difusión</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 4 }}>
              {CHANNELS.map(ch => {
                const isSelected = channel === ch.id
                return (
                  <div
                    key={ch.id}
                    onClick={() => setChannel(ch.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-surface-border)'}`,
                      background: isSelected ? 'var(--color-primary-bg)' : 'var(--color-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--color-primary)' : 'var(--color-surface-mid)',
                      color: isSelected ? '#fff' : 'var(--color-text-muted)',
                      letterSpacing: '0.05em',
                      alignSelf: 'center',
                    }}>
                      {ch.tag}
                    </span>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--color-primary-dark)' : 'var(--color-text)', display: 'block' }}>
                        {ch.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {ch.desc}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* URL de Destino para el Tracking Link */}
          <div className="form-group">
            <label htmlFor="camp-target-url">
              URL de Destino Final para el Tracking Link <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              id="camp-target-url"
              type="url"
              required
              className="input-control"
              placeholder="https://tudominio.com/producto-o-landing"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
              El sistema generará automáticamente un enlace acortado y rastreable que redirige hacia esta URL midiendo cada clic.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="camp-channel-desc">Descripción o Nota del Canal (Opcional)</label>
            <input
              id="camp-channel-desc"
              type="text"
              className="input-control"
              placeholder="Ej. Anuncios carrusel dirigidos a público 25-45 años en Meta"
              value={channelDesc}
              onChange={(e) => setChannelDesc(e.target.value)}
            />
          </div>
        </div>

        {/* SECCIÓN 3: Sincronización con Meta Ads (RBAC: Owner / Admin) */}
        {channel === 'meta_ads' && (
          <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-surface-border)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                  3. Integración Directa con Meta Ads
                </h2>
                <span className="badge badge-primary">
                  {isOwnerOrAdmin ? 'Owner / Admin' : 'Restringido'}
                </span>
              </div>
              <span className="badge badge-neutral">Paso 3</span>
            </div>

            {isOwnerOrAdmin ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={syncMetaAds}
                    onChange={(e) => setSyncMetaAds(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Vincular y mapear con una campaña existente en Meta Ads
                  </span>
                </label>

                {syncMetaAds && (
                  <div style={{ background: 'var(--color-surface-mid)', padding: 18, borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                      <label htmlFor="meta-campaign-select">
                        Selecciona la Campaña en Meta Ads para Sincronizar Métricas Oficiales
                      </label>
                      {loadingMetaCampaigns ? (
                        <div className="skeleton" style={{ height: 40 }} />
                      ) : externalCampaigns.length > 0 ? (
                        <select
                          id="meta-campaign-select"
                          className="input-control"
                          value={selectedMetaCampaignId}
                          onChange={(e) => setSelectedMetaCampaignId(e.target.value)}
                        >
                          {externalCampaigns.map(mc => (
                            <option key={mc.id} value={mc.id}>
                              {mc.name} (Gasto actual: ${mc.spend} | {mc.status})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                          No se encontraron campañas remotas en la cuenta publicitaria conectada.
                        </p>
                      )}
                      <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                        Sincronizará impresiones, alcance oficial y gasto real reportado por la API de Meta Ads.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'var(--color-warn-bg)', border: '1px solid var(--color-warn)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px', color: 'var(--color-warn)',
                fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span>
                  <strong>Permiso Restringido (Manager):</strong> Tu rol te permite crear y administrar la campaña con su Tracking Link de medición, pero la vinculación de activos empresariales externos (Meta Ads API) está reservada para usuarios con rol <strong>Owner</strong> o <strong>Super Admin</strong>.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14 }}>
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/dashboard/campanas')}
            disabled={executing}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={executing || Boolean(companyError)}
            id="btn-submit-campana"
            style={{ padding: '0 28px', height: 44, fontSize: '0.92rem' }}
          >
            {executing ? 'Ejecutando Pipeline...' : isEdit ? 'Guardar Cambios' : 'Crear Campaña y Generar Link'}
          </button>
        </div>
      </form>
    </div>
  )
}
