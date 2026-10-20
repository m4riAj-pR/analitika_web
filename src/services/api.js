/**
 * Cliente de la API de Analitika (FastAPI desplegada en Railway).
 *
 * Todas las rutas de este archivo están verificadas contra el backend
 * (app/routers/*.py). No hay respuestas simuladas: si el backend falla,
 * el error se propaga a la vista para que lo muestre al usuario.
 */
const API_URL = (import.meta.env.VITE_API_URL || 'https://analitika-production.up.railway.app').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Convierte el `detail` de FastAPI (string | array de validaciones) en texto legible. */
function readDetail(data) {
  if (!data) return null
  const d = data.detail ?? data.message
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d.map(e => {
      const field = Array.isArray(e.loc) ? e.loc.filter(x => x !== 'body').join('.') : ''
      return field ? `${field}: ${e.msg}` : e.msg
    }).join(' · ')
  }
  return null
}

let unauthorizedHandler = null
/** Permite a App reaccionar ante un token vencido (401) cerrando la sesión. */
export function onUnauthorized(fn) {
  unauthorizedHandler = fn
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new ApiError('No fue posible conectar con el servidor. Verifica tu conexión.', 0)
  }

  if (!response.ok) {
    let message = `Error HTTP ${response.status}`
    try {
      message = readDetail(await response.json()) || message
    } catch { /* respuesta sin JSON */ }
    if (response.status === 401 && token && unauthorizedHandler) unauthorizedHandler()
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return null
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}

const json = (method, body) => ({ method, body: JSON.stringify(body) })
const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/* ─── Normalizadores ──────────────────────────────────────────── */

/**
 * Unifica la forma de un usuario: el backend devuelve `companies: [{id_company, name}]`
 * pero no `id_company` ni `company`. Se derivan aquí para toda la app.
 */
export function normalizeUser(raw) {
  if (!raw) return null
  const companies = Array.isArray(raw.companies)
    ? raw.companies.filter(Boolean).map(c => ({ id_company: c.id_company, name: c.name }))
    : []
  const primary = companies[0] || null
  return {
    ...raw,
    companies,
    id_company: raw.id_company ?? primary?.id_company ?? null,
    company_name: primary?.name || raw.company_name || null,
  }
}

/** Campaña tal como sale de `GET /analitika/campaigns` (tabla campaigns). */
export function normalizeCampaign(raw) {
  return {
    id: raw.id_campaign,
    id_campaign: raw.id_campaign,
    id_company: raw.id_company,
    name: raw.name || `Campaña ${raw.id_campaign}`,
    description: raw.description || '',
    status: raw.status || 'draft',
    start_date: raw.start_date ? String(raw.start_date).slice(0, 10) : null,
    end_date: raw.end_date ? String(raw.end_date).slice(0, 10) : null,
    spent: raw.spent != null ? num(raw.spent) : null,
    budget: raw.budget != null ? num(raw.budget) : null,
  }
}

/**
 * Métricas de `GET /stats/{id}`. Para Managers el backend elimina los campos
 * financieros, por eso se conservan como `null` (no 0) cuando no llegan.
 */
export function normalizeStats(raw = {}) {
  const has = (k) => Object.prototype.hasOwnProperty.call(raw, k)
  return {
    clicks: num(raw.clics),
    conversions: num(raw.conversiones),
    impressions: num(raw.impressions),
    ctr: num(raw.ctr_real),
    conversion_rate: num(raw.conversion_rate),
    aov: num(raw.aov),
    data_source: raw.data_source || 'manual',
    revenue: has('ingresos') ? num(raw.ingresos) : null,
    spent: has('spent') ? num(raw.spent) : null,
    roi: has('roi') ? num(raw.roi) : null,
    roas: has('roas') ? num(raw.roas) : null,
    cpc: has('cpc') ? num(raw.cpc) : null,
    cpa: has('cpa') ? num(raw.cpa) : null,
  }
}

/** Enlace público que registra el clic: `GET /c/{id_link}` del backend. */
export const trackingUrl = (idLink) => `${API_URL}/c/${idLink}`

/* ─── Servicios ───────────────────────────────────────────────── */

export const api = {
  baseUrl: API_URL,

  health: {
    check: () => apiFetch('/'),
  },

  auth: {
    login: async (email, password) => {
      const data = await apiFetch('/login', json('POST', { email, password }))
      if (data?.access_token) {
        localStorage.setItem('token', data.access_token)
        if (data.user) localStorage.setItem('user', JSON.stringify(normalizeUser(data.user)))
      }
      return data
    },
    register: (payload) => apiFetch('/register', json('POST', payload)),
    forgotPassword: (email) => apiFetch('/forgot-password', json('POST', { email })),
    /** Perfil completo del usuario autenticado, con sus empresas. */
    me: async () => normalizeUser(await apiFetch('/me')),
    /**
     * El backend no expone `PUT /me`; el perfil vive en la tabla persons.
     * `PUT /analitika/persons/{id_person}` requiere rol Owner o Super Admin.
     */
    updateProfile: (idPerson, { name, email, phone }) =>
      apiFetch(`/analitika/persons/${idPerson}`, json('PUT', { name, email, phone: phone || null })),
    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    getToken: () => localStorage.getItem('token'),
    getUser: () => {
      try {
        const u = localStorage.getItem('user')
        return u ? normalizeUser(JSON.parse(u)) : null
      } catch {
        return null
      }
    },
    saveUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  },

  campaigns: {
    getAll: async () => {
      const data = await apiFetch('/analitika/campaigns')
      return Array.isArray(data) ? data.map(normalizeCampaign) : []
    },
    getTop: async (limit = 5) => {
      const data = await apiFetch(`/analitika/campaigns/top?limit=${limit}`)
      return Array.isArray(data) ? data : []
    },
    create: (data) => apiFetch('/analitika/campaigns', json('POST', data)),
    update: (id, data) => apiFetch(`/analitika/campaigns/${id}`, json('PUT', data)),
    remove: (id) => apiFetch(`/analitika/campaigns/${id}`, { method: 'DELETE' }),
    /** Predicción del modelo con los datos reales de la campaña (Owner / Super Admin). */
    predict: (id) => apiFetch(`/analitika/campaigns/${id}/predict`),
    /** Simulador: inferencia con variables de 48h introducidas manualmente. */
    predictRoi: (data) =>
      apiFetch('/api/v1/campaigns/predict-roi', json('POST', {
        channel: data.channel,
        spend_48h: num(data.spend_48h),
        clicks_48h: Math.round(num(data.clicks_48h)),
        conversions_48h: Math.round(num(data.conversions_48h)),
        revenue_48h: num(data.revenue_48h),
      })),
  },

  stats: {
    get: async (id) => normalizeStats(await apiFetch(`/stats/${id}`)),
    clicksByDay: async (id) => {
      const res = await apiFetch(`/stats/${id}/clics-por-dia`)
      return (res?.data || []).map(d => ({ date: d.fecha, clicks: num(d.clics) }))
    },
    clicksTable: async (id) => {
      const res = await apiFetch(`/stats/${id}/tabla-clics`)
      return res?.data || []
    },
    /** Campañas + métricas por campaña en paralelo. Una campaña sin acceso a stats queda con métricas en 0. */
    campaignsWithStats: async () => {
      const list = await api.campaigns.getAll()
      const stats = await Promise.all(list.map(c => api.stats.get(c.id).catch(() => normalizeStats())))
      return list.map((c, i) => ({ ...c, stats: stats[i] }))
    },
  },

  channels: {
    getAll: async () => {
      const data = await apiFetch('/analitika/channels')
      return Array.isArray(data) ? data : []
    },
    /** Solo Owner / Super Admin. Body: { name, description }. */
    create: (data) => apiFetch('/analitika/channels', json('POST', data)),
  },

  trackingLinks: {
    getAll: async (campaignId) => {
      const q = campaignId != null ? `?campaign_id=${campaignId}` : ''
      const data = await apiFetch(`/analitika/tracking-links${q}`)
      return Array.isArray(data) ? data : []
    },
    /** Body: { id_campaign, id_channel?, destination }. Devuelve { ok, id_link }. */
    create: (data) => apiFetch('/analitika/tracking-links', json('POST', data)),
    remove: (id) => apiFetch(`/analitika/tracking-links/${id}`, { method: 'DELETE' }),
  },

  clicks: {
    getAll: async () => {
      const data = await apiFetch('/analitika/clicks')
      return Array.isArray(data) ? data : []
    },
  },

  notifications: {
    getAll: async () => {
      const data = await apiFetch('/analitika/notifications')
      return Array.isArray(data) ? data : []
    },
    getUnreadCount: async () => {
      const res = await apiFetch('/analitika/notifications/unread-count')
      return num(res?.count)
    },
    markAsRead: (id) => apiFetch(`/analitika/notifications/${id}/read`, { method: 'PUT' }),
  },

  companies: {
    getAll: async () => {
      const data = await apiFetch('/analitika/companies')
      return Array.isArray(data) ? data : []
    },
  },

  persons: {
    getAll: async () => {
      const data = await apiFetch('/analitika/persons')
      return Array.isArray(data) ? data : []
    },
    /** Body: { name, email, phone? }. Devuelve { ok, id_person }. */
    create: (payload) => apiFetch('/analitika/persons', json('POST', payload)),
  },

  users: {
    /** Usuarios de las empresas del usuario actual (incluye name, email, id_role). */
    getAll: async () => {
      const data = await apiFetch('/analitika/users')
      return Array.isArray(data) ? data : []
    },
    /** Body: { id_person, id_company, id_role, password_hash } — el backend hashea la contraseña. */
    create: (payload) => apiFetch('/analitika/users', json('POST', payload)),
    remove: (id) => apiFetch(`/analitika/users/${id}`, { method: 'DELETE' }),
    /**
     * Cambio de contraseña (Owner / Super Admin). El backend exige el registro completo
     * de users; `password_hash` recibe la contraseña en claro y el servicio la hashea con bcrypt.
     */
    changePassword: (user, newPassword) =>
      apiFetch(`/analitika/users/${user.id_user}`, json('PUT', {
        id_person: user.id_person,
        id_role: user.id_role,
        password_hash: newPassword,
      })),
  },

  admin: {
    getCompanies: async () => {
      const data = await apiFetch('/analitika/admin/companies')
      return Array.isArray(data) ? data : []
    },
    getUsersByRole: (idCompany) =>
      apiFetch(`/analitika/admin/users-by-role${idCompany != null ? `?id_company=${idCompany}` : ''}`),
    updateUserRole: (idUser, idRole) =>
      apiFetch(`/analitika/admin/users/${idUser}/role`, json('PUT', { id_role: idRole })),
  },
}

export default api
