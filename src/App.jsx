import { useState } from 'react'
import Login from './pages/Login'
import { api } from './services/api'
import './index.css'

export default function App() {
  const [user, setUser] = useState(api.auth.getUser())

  const handleLogin = async (email, password) => {
    const res = await api.auth.login(email, password)
    setUser(res.user || { email })
    return res
  }

  const handleLogout = () => {
    api.auth.logout()
    setUser(null)
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  // Placeholder for authenticated view — reemplazar con tu dashboard
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fafafa',
      gap: '1rem',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{ color: '#7c3aed', fontWeight: 700 }}>
        ¡Bienvenid@ a Analitika!
      </h1>
      <p style={{ color: '#555' }}>
        Conectado como: <strong>{user.email || user.name || 'Usuario'}</strong>
      </p>
      <button
        onClick={handleLogout}
        style={{
          background: '#7c3aed', color: '#fff', border: 'none',
          borderRadius: '8px', padding: '0.6rem 1.5rem', cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Cerrar Sesión
      </button>
    </div>
  )
}
