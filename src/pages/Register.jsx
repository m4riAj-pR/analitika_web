import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import pantalla from '../assets/pantalla_ejemplo.png'
import logo from '../assets/icon.png'
import { api } from '../services/api'
import './Register.css'

export default function Register({ onLogin }) {
  const navigate = useNavigate()
  const [lang, setLang] = useState('ES')

  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    password: '',
    terms: true,
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const toggleLang = () => {
    setLang((prev) => (prev === 'ES' ? 'EN' : 'ES'))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.terms) {
      setError(
        lang === 'ES'
          ? 'Debes aceptar la política de tratamiento de datos para continuar.'
          : 'You must accept the data processing policy to continue.'
      )
      return
    }

    setLoading(true)

    try {
      await api.auth.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        company: form.company.trim() || undefined,
      })

      setSuccess(
        lang === 'ES'
          ? '¡Cuenta creada con éxito! Iniciando sesión...'
          : 'Account created successfully! Signing in...'
      )

      // Intentar auto-login si onLogin está disponible
      if (onLogin) {
        setTimeout(async () => {
          try {
            await onLogin(form.email.trim(), form.password)
          } catch {
            navigate('/')
          }
        }, 1200)
      } else {
        setTimeout(() => navigate('/'), 1600)
      }
    } catch (err) {
      setError(err.message || (lang === 'ES' ? 'Error al crear la cuenta' : 'Error creating account'))
    } finally {
      setLoading(false)
    }
  }

  const isES = lang === 'ES'

  return (
    <div className="register-root">
      {/* ── NAVBAR ── */}
      <nav className="register-nav">
        <div className="register-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={logo} alt="Analitika" />
        </div>

        <div className="register-nav-actions">
          <button
            type="button"
            className="btn-login-nav"
            onClick={() => navigate('/')}
            id="register-nav-login-btn"
          >
            {isES ? 'Inicia Sesion' : 'Sign In'}
          </button>
          <button
            type="button"
            className="btn-lang"
            onClick={toggleLang}
            title={isES ? 'Switch to English' : 'Cambiar a Español'}
          >
            ▼ {lang}
          </button>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div className="register-body">

        {/* LEFT — Decorative scene with phone mockup and charts */}
        <div className="register-deco" aria-hidden="true">

          {/* Large pac-man circle */}
          <svg className="deco-circle-large anim-float" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 100 L100 0 A100 100 0 1 1 0 100 Z" fill="#8b5cf6" />
          </svg>

          {/* Medium hollow accent */}
          <div className="deco-circle-mid anim-pulse"></div>

          {/* Tiny floating dots */}
          <div className="deco-dot deco-dot-1 anim-float-slow"></div>
          <div className="deco-dot deco-dot-2 anim-float-reverse"></div>
          <div className="deco-dot deco-dot-3 anim-pulse-fast"></div>
          <div className="deco-dot deco-dot-4 anim-float-slow"></div>

          {/* Bar Chart bottom left */}
          <svg className="deco-bar-chart anim-float-slow" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="10" x2="20" y2="100" stroke="#8b5cf6" strokeWidth="2.5"/>
            <line x1="20" y1="100" x2="155" y2="100" stroke="#8b5cf6" strokeWidth="2.5"/>
            <line x1="20" y1="10" x2="16" y2="18" stroke="#8b5cf6" strokeWidth="2.5"/>
            <line x1="20" y1="10" x2="24" y2="18" stroke="#8b5cf6" strokeWidth="2.5"/>
            <rect x="30" y="30" width="20" height="70" rx="3" fill="#8b5cf6"/>
            <rect x="58" y="55" width="20" height="45" rx="3" fill="#8b5cf6"/>
            <rect x="86" y="70" width="20" height="30" rx="3" fill="#8b5cf6"/>
            <polygon points="155,96 155,104 162,100" fill="#8b5cf6"/>
          </svg>

          {/* Pie Chart bottom center-right */}
          <svg className="deco-pie-chart anim-spin-slow" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M80 80 L80 10 A70 70 0 0 1 150 80 Z" fill="#6d28d9"/>
            <path d="M80 80 L150 80 A70 70 0 0 1 50 145 Z" fill="#8b5cf6"/>
            <path d="M80 80 L50 145 A70 70 0 0 1 80 10 Z" fill="#c4b5fd"/>
          </svg>

          {/* Phone Mockup */}
          <div className="deco-phone anim-phone">
            <div className="phone-screen">
              <img src={pantalla} alt="Analitika App Preview" className="phone-screen-img" />
            </div>
          </div>

        </div>

        {/* RIGHT — Register Form */}
        <div className="register-form-section">
          <div className="register-card">
            <h1 className="register-title">
              {isES ? (
                <>
                  Crea tu cuenta<br />gratis
                </>
              ) : (
                <>
                  Create your free<br />account
                </>
              )}
            </h1>

            {error && (
              <div className="alert-message alert-error" style={{ marginBottom: '1rem' }} role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="alert-message alert-success" style={{ marginBottom: '1rem' }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form" noValidate>
              <div className="register-field">
                <label className="register-label" htmlFor="register-name">
                  {isES ? 'Nombre' : 'Full Name'}
                </label>
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  required
                  className="register-input"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>

              <div className="register-field">
                <label className="register-label" htmlFor="register-company">
                  {isES ? 'Nombre de tu empresa' : 'Company Name'}
                </label>
                <input
                  id="register-company"
                  name="company"
                  type="text"
                  required
                  className="register-input"
                  value={form.company}
                  onChange={handleChange}
                  autoComplete="organization"
                />
              </div>

              <div className="register-field">
                <label className="register-label" htmlFor="register-email">
                  {isES ? 'Correo' : 'Email Address'}
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  required
                  className="register-input"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              <div className="register-field">
                <label className="register-label" htmlFor="register-password">
                  {isES ? 'Contraseña' : 'Password'}
                </label>
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  required
                  className="register-input"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              <label className="register-terms">
                <input
                  type="checkbox"
                  name="terms"
                  checked={form.terms}
                  onChange={handleChange}
                />
                <span>
                  {isES
                    ? 'Acepto la politica de tratamiento de datos'
                    : 'I accept the data processing policy'}
                </span>
              </label>

              <button
                type="submit"
                className="btn-register-submit"
                id="register-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner"></span>
                ) : (
                  isES ? 'Crear cuenta' : 'Create Account'
                )}
              </button>
            </form>

            <p className="register-footer-text">
              {isES ? '¿Ya tienes cuenta, ' : 'Already have an account? '}
              <button
                type="button"
                className="register-login-link"
                onClick={() => navigate('/')}
                id="register-bottom-login-btn"
              >
                {isES ? 'Inicia sesion?' : 'Sign in?'}
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
