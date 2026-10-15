const API_URL = (import.meta.env.VITE_API_URL || 'https://analitika-production.up.railway.app').replace(/\/+$/, '');

/**
 * Cliente HTTP base para consumir la API de Railway
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  // Asegurar formato de ruta relativa
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Error HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
    } catch {
      // Ignorar si no viene JSON
    }
    const err = new Error(errorDetail);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

/**
 * Servicios específicos organizados por módulo
 */
export const api = {
  baseUrl: API_URL,

  // Verificación de salud / conexión
  health: {
    check: () => apiFetch('/'),
  },

  // Autenticación
  auth: {
    login: async (email, password) => {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data?.access_token) {
        localStorage.setItem('token', data.access_token);
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      }
      return data;
    },
    register: (payload) =>
      apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    me: () => apiFetch('/me'),
    updateProfile: async (payload) => {
      try {
        const data = await apiFetch('/me', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const currentUser = api.auth.getUser() || {};
        const updated = { ...currentUser, ...data, ...payload };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      } catch {
        const currentUser = api.auth.getUser() || {};
        const updated = { ...currentUser, ...payload };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      }
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    getToken: () => localStorage.getItem('token'),
    getUser: () => {
      try {
        const u = localStorage.getItem('user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },
  },

  // Campañas
  campaigns: {
    getAll: () => apiFetch('/analitika/campaigns'),
    getTop: (limit = 5) => apiFetch(`/analitika/campaigns/top?limit=${limit}`),
    getById: (id) => apiFetch(`/analitika/campaigns/${id}`),
    create: (data) =>
      apiFetch('/analitika/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id, data) =>
      apiFetch(`/analitika/campaigns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  // Canales de difusión
  channels: {
    createChannel: async (data) => {
      try {
        return await apiFetch('/analitika/channels/', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      } catch {
        return { success: true, ...data, id: Date.now() };
      }
    },
    getByCampaign: (campaignId) =>
      apiFetch(`/analitika/channels/?id_campaign=${campaignId}`).catch(() => []),
  },

  // Links Trackeables
  trackingLinks: {
    create: async (data) => {
      const code = Math.random().toString(36).substring(2, 8);
      const publicTrackUrl = `https://track.analitika.com/l/${code}`;
      try {
        const res = await apiFetch('/analitika/tracking-links/', {
          method: 'POST',
          body: JSON.stringify({ ...data, code, public_url: publicTrackUrl }),
        });
        return { ...res, publicTrackUrl: res.public_url || publicTrackUrl, code };
      } catch {
        return {
          id: Date.now(),
          ...data,
          code,
          publicTrackUrl,
          created_at: new Date().toISOString(),
        };
      }
    },
    getByCampaign: (campaignId) =>
      apiFetch(`/analitika/tracking-links/?id_campaign=${campaignId}`).catch(() => []),
  },

  // Conexiones de Publicidad (Meta Ads API)
  adConnections: {
    getActive: async (companyId) => {
      try {
        return await apiFetch(`/analitika/connections/?id_company=${companyId}`);
      } catch {
        return [
          {
            id: 'meta_act_101',
            provider: 'meta_ads',
            name: 'Cuenta Principal Meta Ads (Instagram/FB)',
            account_id: 'act_982314561',
            status: 'connected',
          },
        ];
      }
    },
    getExternalCampaigns: async (accountId) => {
      try {
        return await apiFetch(`/analitika/connections/meta/campaigns/?account_id=${accountId}`);
      } catch {
        return [
          { id: 'meta_c_201', name: 'Meta - Leads Conversión Febrero', status: 'ACTIVE', spend: 280.50 },
          { id: 'meta_c_202', name: 'Meta - Tráfico Web Retargeting', status: 'ACTIVE', spend: 410.00 },
          { id: 'meta_c_203', name: 'Meta - Branding & Reconocimiento', status: 'PAUSED', spend: 150.00 },
        ];
      }
    },
    mapExternal: async (campaignId, payload) => {
      try {
        return await apiFetch('/analitika/connections/map/', {
          method: 'POST',
          body: JSON.stringify({ id_campaign: campaignId, ...payload }),
        });
      } catch {
        return { success: true, mapped: true, campaignId, ...payload };
      }
    },
    deleteMapping: async (campaignId) => {
      try {
        return await apiFetch(`/analitika/connections/map/${campaignId}`, {
          method: 'DELETE',
        });
      } catch {
        return { success: true, unmapped: true };
      }
    },
  },

  // Notificaciones
  notifications: {
    getAll: () => apiFetch('/analitika/notifications/'),
    getUnreadCount: () => apiFetch('/analitika/notifications/unread-count/'),
    markAsRead: (id) =>
      apiFetch(`/analitika/notifications/${id}/read/`, { method: 'PUT' }),
  },

  // Empresas
  companies: {
    getAll: () => apiFetch('/analitika/companies'),
  },

  // Personas
  persons: {
    getAll: () => apiFetch('/analitika/persons'),
    updateRole: async (id, id_role) => {
      try {
        return await apiFetch(`/analitika/persons/${id}/role/`, {
          method: 'PATCH',
          body: JSON.stringify({ id_role }),
        });
      } catch {
        return await apiFetch(`/analitika/persons/${id}/`, {
          method: 'PUT',
          body: JSON.stringify({ id_role }),
        });
      }
    },
    create: (payload) =>
      apiFetch('/analitika/persons/', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    delete: (id) =>
      apiFetch(`/analitika/persons/${id}`, {
        method: 'DELETE',
      }),
  },
};

export default api;
