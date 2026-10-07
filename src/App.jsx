import { useEffect, useState } from 'react'
import { api } from './services/api'

export default function App() {
  const [healthStatus, setHealthStatus] = useState({
    loading: true,
    data: null,
    error: null,
  })

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginState, setLoginState] = useState({ loading: false, data: null, error: null })
  const [currentUser, setCurrentUser] = useState(api.auth.getUser())

  // Comprobar la conexión con la API en Railway al cargar
  const checkHealth = async () => {
    setHealthStatus({ loading: true, data: null, error: null })
    try {
      const res = await api.health.check()
      setHealthStatus({ loading: false, data: res, error: null })
    } catch (err) {
      setHealthStatus({
        loading: false,
        data: null,
        error: err.message || 'No se pudo conectar a la API en Railway',
      })
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginState({ loading: true, data: null, error: null })
    try {
      const res = await api.auth.login(loginForm.email, loginForm.password)
      setLoginState({ loading: false, data: res, error: null })
      setCurrentUser(res.user || { email: loginForm.email })
    } catch (err) {
      setLoginState({
        loading: false,
        data: null,
        error: err.message || 'Error al iniciar sesión',
      })
    }
  }

  const handleLogout = () => {
    api.auth.logout()
    setCurrentUser(null)
    setLoginState({ loading: false, data: null, error: null })
  }

  return (
    <div className="app-container">
      {/* Encabezado */}
      <header className="header">
        <div className="brand">
          <span className="brand-badge">Railway Connected</span>
        </div>
        <h1 className="title">Analitika Web</h1>
        <p className="subtitle">
          Frontend conectado a la API:{' '}
          <code style={{ color: '#818cf8' }}>{api.baseUrl}</code>
        </p>
      </header>

      {/* Cuadrícula de módulos */}
      <div className="grid">
        {/* Tarjeta: Estado de Conexión */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Estado de la API</h2>
            {healthStatus.loading ? (
              <span className="status-pill loading">
                <span className="status-dot"></span> Verificando...
              </span>
            ) : healthStatus.error ? (
              <span className="status-pill offline">
                <span className="status-dot"></span> Desconectado
              </span>
            ) : (
              <span className="status-pill online">
                <span className="status-dot"></span> En línea
              </span>
            )}
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Prueba de conexión en vivo con el endpoint raíz (<code>GET /</code>).
          </p>

          <div className="code-box">
            {healthStatus.loading
              ? '// Esperando respuesta de Railway...'
              : healthStatus.error
              ? `// Error:\n${healthStatus.error}`
              : `// Respuesta 200 OK:\n${JSON.stringify(healthStatus.data, null, 2)}`}
          </div>

          <button
            className="btn btn-secondary"
            onClick={checkHealth}
            disabled={healthStatus.loading}
          >
            {healthStatus.loading ? 'Comprobando...' : 'Reintentar Conexión'}
          </button>
        </section>

        {/* Tarjeta: Autenticación / Test de Endpoints */}
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Prueba de Autenticación</h2>
            {currentUser && (
              <span className="status-pill online">
                <span className="status-dot"></span> Sesión activa
              </span>
            )}
          </div>

          {currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="result-message success">
                <strong>Conectado como:</strong> {currentUser.email || currentUser.name || 'Usuario autenticado'}
              </div>
              <div className="code-box">
                {JSON.stringify(currentUser, null, 2)}
              </div>
              <button className="btn btn-secondary" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder="admin@analitika.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="password">
                  Contraseña
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </div>

              {loginState.error && (
                <div className="result-message error">
                  {loginState.error}
                </div>
              )}

              {loginState.data && (
                <div className="result-message success">
                  ¡Inicio de sesión exitoso! Token guardado.
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loginState.loading}
              >
                {loginState.loading ? 'Autenticando...' : 'Iniciar Sesión (POST /login)'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
