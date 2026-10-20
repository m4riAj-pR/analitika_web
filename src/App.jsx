import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import ProtectedRoute from './components/ProtectedRoute'
import { api, normalizeUser, onUnauthorized } from './services/api'
import './global.css'

const homeRoute = (user) => (!user ? '/' : user.id_role === 1 ? '/admin' : '/dashboard')

export default function App() {
  const [user, setUser] = useState(() => (api.auth.getToken() ? api.auth.getUser() : null))

  const persistUser = useCallback((u) => {
    const normalized = normalizeUser(u)
    if (normalized) api.auth.saveUser(normalized)
    setUser(normalized)
    return normalized
  }, [])

  const handleLogout = useCallback(() => {
    api.auth.logout()
    setUser(null)
  }, [])

  // Un 401 con token guardado significa sesión vencida: se cierra la sesión.
  useEffect(() => {
    onUnauthorized(handleLogout)
    return () => onUnauthorized(null)
  }, [handleLogout])

  // Al abrir la app con una sesión guardada se refresca el perfil desde /me,
  // que es la fuente de verdad de rol y empresas (nombre de la empresa incluido).
  useEffect(() => {
    if (!api.auth.getToken()) return
    api.auth.me()
      .then(me => setUser(prev => persistUser({ ...prev, ...me })))
      .catch(() => { /* 401 ya se maneja con onUnauthorized; otros errores conservan la sesión local */ })
  }, [persistUser])

  const handleLogin = async (email, password) => {
    const res = await api.auth.login(email, password)
    let next = normalizeUser(res?.user)
    try {
      const me = await api.auth.me()
      next = { ...next, ...me }
    } catch { /* el login ya trae rol y empresas */ }
    persistUser(next)
    return res
  }

  const handleUpdateUser = (updatedData) => persistUser({ ...user, ...updatedData })

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to={homeRoute(user)} replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={homeRoute(user)} replace /> : <Register onLogin={handleLogin} />}
        />

        {/* Owner (2) y Manager (3) */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute user={user} allowedRoles={[2, 3]}>
              <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
            </ProtectedRoute>
          }
        />

        {/* Super Admin (1) */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute user={user} allowedRoles={[1]}>
              <AdminPanel user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={homeRoute(user)} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
