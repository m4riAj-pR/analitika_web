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
    create: (data) =>
      apiFetch('/analitika/campaigns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
  },
};

export default api;
