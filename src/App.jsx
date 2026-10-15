import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import ProtectedRoute from './components/ProtectedRoute'
import { api } from './services/api'
import './global.css'

export default function App() {
  const [user, setUser] = useState(api.auth.getUser())

  // Sincronizar usuario desde localStorage al cargar (por si hay token guardado)
  useEffect(() => {
    const storedUser = api.auth.getUser()
    if (storedUser && !user) {
      setUser(storedUser)
    }
  }, [])

  const handleLogin = async (email, password) => {
    const res = await api.auth.login(email, password)
    // La respuesta puede venir como { user: {...} } o directamente el usuario
    const userData = res.user || res
    if (userData) {
      // Si el backend no devuelve id_role en el login, intentamos obtenerlo desde /me
      if (userData.id_role == null && userData.email) {
        try {
          const me = await api.auth.me()
          const fullUser = { ...userData, ...me }
          localStorage.setItem('user', JSON.stringify(fullUser))
          setUser(fullUser)
          return res
        } catch {
          // Continuar con lo que tenemos
        }
      }
      setUser(userData)
    }
    return res
  }

  const handleLogout = () => {
    api.auth.logout()
    setUser(null)
  }

  const handleUpdateUser = (updatedData) => {
    const updated = { ...user, ...updatedData }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
  }

  // Determina la ruta home según el rol
  const homeRoute = () => {
    if (!user) return '/'
    if (user.id_role === 1) return '/admin'
    return '/dashboard'
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Ruta de login ── */}
        <Route
          path="/"
          element={
            user
              ? <Navigate to={homeRoute()} replace />
              : <Login onLogin={handleLogin} />
          }
        />

        {/* ── Dashboard — Owner (id_role=2) y Manager (id_role=3) ── */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute user={user} allowedRoles={[2, 3]}>
              <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
            </ProtectedRoute>
          }
        />

        {/* ── Admin Panel — Super Admin (id_role=1) únicamente ── */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} allowedRoles={[1]}>
              <AdminPanel user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
            </ProtectedRoute>
          }
        />

        {/* ── Catch-all: redirige a ruta home del rol ── */}
        <Route path="*" element={<Navigate to={homeRoute()} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
