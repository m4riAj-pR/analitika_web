import { useState } from 'react'
import pantalla from '../assets/pantalla_ejemplo.png'
import './Login.css'

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (onLogin) await onLogin(form.email, form.password, rememberMe)
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* ── NAVBAR ── */}
      <nav className="login-nav">
        <div className="login-logo">
          {/* Sustituir por <img src={logo} alt="Analitika" /> cuando tengas logo.png */}
          <svg className="logo-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="#7c3aed" opacity=".15" />
            <path d="M20 8 a12 12 0 0 1 0 24" stroke="#7c3aed" strokeWidth="3" fill="none" />
            <circle cx="20" cy="20" r="5" fill="#7c3aed" />
          </svg>
          <span className="logo-text">Analitika</span>
        </div>
        <div className="login-nav-actions">
          <button className="btn-register-nav" onClick={() => {}}>Registrate</button>
          <button className="btn-lang">▼ EN</button>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div className="login-body">

        {/* LEFT — decorative scene */}
        <div className="login-deco" aria-hidden="true">

          {/* Large circle top-left (pac-man shape) */}
          <svg className="deco-circle-large anim-float" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 100 L100 0 A100 100 0 1 1 0 100 Z" fill="#a78bfa" />
          </svg>

          {/* Medium circle (hollow accent) */}
          <div className="deco-circle-mid anim-pulse"></div>

          {/* Tiny floating dots */}
          <div className="deco-dot deco-dot-1 anim-float-slow"></div>
          <div className="deco-dot deco-dot-2 anim-float-reverse"></div>
          <div className="deco-dot deco-dot-3 anim-pulse-fast"></div>
          <div className="deco-dot deco-dot-4 anim-float-slow"></div>
          <div className="deco-dot deco-dot-5 anim-float"></div>

          {/* BAR CHART — bottom left */}
          <svg className="deco-bar-chart anim-float-slow" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* axes */}
            <line x1="20" y1="10" x2="20" y2="100" stroke="#a78bfa" strokeWidth="2"/>
            <line x1="20" y1="100" x2="155" y2="100" stroke="#a78bfa" strokeWidth="2"/>
            {/* bars */}
            <rect x="32" y="40" width="22" height="60" rx="4" fill="#7c3aed"/>
            <rect x="62" y="55" width="22" height="45" rx="4" fill="#a78bfa"/>
            <rect x="92" y="70" width="22" height="30" rx="4" fill="#c4b5fd"/>
            {/* arrow tip */}
            <polygon points="155,96 155,104 162,100" fill="#a78bfa"/>
          </svg>

          {/* PIE CHART — bottom center-right */}
          <svg className="deco-pie-chart anim-spin-slow" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* big slice */}
            <path d="M80 80 L80 5 A75 75 0 0 1 155 80 Z" fill="#7c3aed"/>
            {/* medium slice */}
            <path d="M80 80 L155 80 A75 75 0 0 1 42 145 Z" fill="#a78bfa"/>
            {/* small slice */}
            <path d="M80 80 L42 145 A75 75 0 0 1 80 5 Z" fill="#c4b5fd"/>
          </svg>

          {/* ── PHONE MOCKUP ── */}
          <div className="deco-phone anim-phone">
            <div className="phone-frame">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <img src={pantalla} alt="Analitika App Preview" className="phone-screen-img" />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — login form */}
        <div className="login-form-section">
          <div className="login-card">
            <h1 className="login-title">Iniciar sesión</h1>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="form-field">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="Correo electrónico"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="form-field">
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-input"
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="form-options">
                <label className="form-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span>Recuerdame</span>
                </label>
                <button type="button" className="btn-forgot">
                  ¿Ha olvidado su contraseña?
                </button>
              </div>

              {error && (
                <p className="form-error" role="alert">{error}</p>
              )}

              <button
                type="submit"
                className="btn-submit"
                id="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner"></span>
                ) : (
                  'Iniciar sesión'
                )}
              </button>
            </form>

            <p className="form-register-link">
              ¿No tienes cuenta,{' '}
              <button type="button" className="link-inline">
                <strong>Registrate?</strong>
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
