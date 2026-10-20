import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import pantalla from '../assets/pantalla_ejemplo.png'
import logo from '../assets/icon.png'
import { api } from '../services/api'
import './Login.css'

const I18N = {
  ES: {
    langBtn: '▼ ES',
    registerNav: 'Regístrate',
    title: 'Iniciar sesión',
    emailPlaceholder: 'Correo electrónico',
    passwordPlaceholder: 'Contraseña',
    rememberMe: 'Recuérdame',
    forgotPassword: '¿Ha olvidado su contraseña?',
    submitBtn: 'Iniciar sesión',
    noAccount: '¿No tienes cuenta, ',
    registerInline: 'Regístrate?',
    registerModalTitle: 'Crear una Cuenta',
    registerModalSubtitle: 'Únete a Analitika y potencia tus campañas comerciales',
    nameLabel: 'Nombre completo',
    namePlaceholder: 'Ej. Juan Pérez',
    companyLabel: 'Empresa',
    companyPlaceholder: 'Ej. Mi Empresa SAS',
    phoneLabel: 'Teléfono / Móvil (Opcional)',
    btnCancel: 'Cancelar',
    btnRegister: 'Registrarse',
    registerSuccess: '¡Registro exitoso! Ya puedes iniciar sesión con tus credenciales.',
    forgotTitle: 'Recuperar Contraseña',
    forgotSubtitle: 'Ingresa tu correo y te enviaremos las instrucciones de recuperación.',
    btnSendInstructions: 'Enviar Instrucciones',
    forgotSuccessDefault: 'Si el correo está registrado, recibirás las instrucciones en breve.',
  },
  EN: {
    langBtn: '▼ EN',
    registerNav: 'Register',
    title: 'Sign in',
    emailPlaceholder: 'Email address',
    passwordPlaceholder: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot your password?',
    submitBtn: 'Sign in',
    noAccount: "Don't have an account, ",
    registerInline: 'Register?',
    registerModalTitle: 'Create an Account',
    registerModalSubtitle: 'Join Analitika and boost your business campaigns',
    nameLabel: 'Full Name',
    namePlaceholder: 'e.g. John Doe',
    companyLabel: 'Company',
    companyPlaceholder: 'e.g. My Company Inc',
    phoneLabel: 'Phone (Optional)',
    btnCancel: 'Cancel',
    btnRegister: 'Register',
    registerSuccess: 'Registration successful! You can now sign in with your credentials.',
    forgotTitle: 'Reset Password',
    forgotSubtitle: 'Enter your email address and we will send you reset instructions.',
    btnSendInstructions: 'Send Instructions',
    forgotSuccessDefault: 'If your email is registered, you will receive instructions shortly.',
  }
}

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [lang, setLang] = useState('ES')
  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Modales
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)

  // Estado Registro
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    phone: '',
  })
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')

  // Estado Olvido de Contraseña
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')

  const t = I18N[lang]

  const toggleLang = () => {
    setLang((prev) => (prev === 'ES' ? 'EN' : 'ES'))
  }

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

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterSuccess('')
    setRegisterLoading(true)

    try {
      await api.auth.register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        company: registerForm.company.trim() || undefined,
        phone: registerForm.phone.trim() || undefined,
      })
      setRegisterSuccess(t.registerSuccess)
      setForm((prev) => ({ ...prev, email: registerForm.email }))
      setTimeout(() => {
        setShowRegisterModal(false)
        setRegisterSuccess('')
        setRegisterForm({ name: '', email: '', password: '', company: '', phone: '' })
      }, 1600)
    } catch (err) {
      setRegisterError(err.message || 'Error al procesar el registro')
    } finally {
      setRegisterLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)

    try {
      const res = await api.auth.forgotPassword(forgotEmail.trim())
      setForgotSuccess(res?.message || t.forgotSuccessDefault)
      setTimeout(() => {
        setShowForgotModal(false)
        setForgotSuccess('')
        setForgotEmail('')
      }, 2500)
    } catch (err) {
      setForgotError(err.message || 'Error al solicitar restablecimiento de contraseña')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* ── NAVBAR ── */}
      <nav className="login-nav">
        <div className="login-logo">
          <img src={logo} alt="Analitika" className="logo-icon" />
        </div>
        <div className="login-nav-actions">
          <button
            type="button"
            className="btn-register-nav"
            onClick={() => navigate('/register')}
            id="login-nav-register-btn"
          >
            {t.registerNav}
          </button>
          <button
            type="button"
            className="btn-lang"
            onClick={toggleLang}
            title={lang === 'ES' ? 'Cambiar a Inglés' : 'Switch to Spanish'}
            id="login-nav-lang-btn"
          >
            {t.langBtn}
          </button>
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
            <line x1="20" y1="10" x2="20" y2="100" stroke="#a78bfa" strokeWidth="2"/>
            <line x1="20" y1="100" x2="155" y2="100" stroke="#a78bfa" strokeWidth="2"/>
            <rect x="32" y="40" width="22" height="60" rx="4" fill="#7c3aed"/>
            <rect x="62" y="55" width="22" height="45" rx="4" fill="#a78bfa"/>
            <rect x="92" y="70" width="22" height="30" rx="4" fill="#c4b5fd"/>
            <polygon points="155,96 155,104 162,100" fill="#a78bfa"/>
          </svg>

          {/* PIE CHART — bottom center-right */}
          <svg className="deco-pie-chart anim-spin-slow" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M80 80 L80 5 A75 75 0 0 1 155 80 Z" fill="#7c3aed"/>
            <path d="M80 80 L155 80 A75 75 0 0 1 42 145 Z" fill="#a78bfa"/>
            <path d="M80 80 L42 145 A75 75 0 0 1 80 5 Z" fill="#c4b5fd"/>
          </svg>

          {/* PHONE MOCKUP */}
          <div className="deco-phone anim-phone">
            <div className="phone-screen">
              <img src={pantalla} alt="Analitika App Preview" className="phone-screen-img" />
            </div>
          </div>

        </div>

        {/* RIGHT — login form */}
        <div className="login-form-section">
          <div className="login-card">
            <h1 className="login-title login-title--center">{t.title}</h1>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="form-field">
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder={t.emailPlaceholder}
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
                  placeholder={t.passwordPlaceholder}
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
                  <span>{t.rememberMe}</span>
                </label>
                <button
                  type="button"
                  className="btn-forgot"
                  onClick={() => setShowForgotModal(true)}
                  id="login-forgot-btn"
                >
                  {t.forgotPassword}
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
                  t.submitBtn
                )}
              </button>
            </form>

            <p className="form-register-link">
              {t.noAccount}{' '}
              <button
                type="button"
                className="link-inline"
                onClick={() => setShowRegisterModal(true)}
                id="login-inline-register-btn"
              >
                <strong>{t.registerInline}</strong>
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* ── MODAL DE REGISTRO ── */}
      {showRegisterModal && (
        <div className="modal-backdrop" onClick={() => setShowRegisterModal(false)} role="dialog" aria-modal="true">
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{t.registerModalTitle}</h2>
                <p className="modal-subtitle">{t.registerModalSubtitle}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowRegisterModal(false)}>✕</button>
            </div>

            {registerSuccess && (
              <div className="alert-message alert-success">
                {registerSuccess}
              </div>
            )}
            {registerError && (
              <div className="alert-message alert-error">
                {registerError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="account-form">
              <div className="form-group">
                <label htmlFor="reg-name">{t.nameLabel} *</label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  className="input-control"
                  placeholder={t.namePlaceholder}
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="reg-email">{t.emailPlaceholder} *</label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    className="input-control"
                    placeholder="usuario@ejemplo.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-password">{t.passwordPlaceholder} *</label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    className="input-control"
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="reg-company">{t.companyLabel}</label>
                  <input
                    id="reg-company"
                    type="text"
                    className="input-control"
                    placeholder={t.companyPlaceholder}
                    value={registerForm.company}
                    onChange={(e) => setRegisterForm({ ...registerForm, company: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-phone">{t.phoneLabel}</label>
                  <input
                    id="reg-phone"
                    type="tel"
                    className="input-control"
                    placeholder="+57 300 123 4567"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowRegisterModal(false)}
                  disabled={registerLoading}
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={registerLoading}
                  id="btn-confirm-register"
                >
                  {registerLoading ? 'Procesando...' : t.btnRegister}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL RECUPERAR CONTRASEÑA ── */}
      {showForgotModal && (
        <div className="modal-backdrop" onClick={() => setShowForgotModal(false)} role="dialog" aria-modal="true">
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{t.forgotTitle}</h2>
                <p className="modal-subtitle">{t.forgotSubtitle}</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowForgotModal(false)}>✕</button>
            </div>

            {forgotSuccess && (
              <div className="alert-message alert-success">
                {forgotSuccess}
              </div>
            )}
            {forgotError && (
              <div className="alert-message alert-error">
                {forgotError}
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="account-form">
              <div className="form-group">
                <label htmlFor="forgot-email">{t.emailPlaceholder} *</label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="input-control"
                  placeholder="tu-correo@empresa.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowForgotModal(false)}
                  disabled={forgotLoading}
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={forgotLoading}
                  id="btn-confirm-forgot"
                >
                  {forgotLoading ? 'Enviando...' : t.btnSendInstructions}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
