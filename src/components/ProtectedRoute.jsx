import { Navigate } from 'react-router-dom'

/**
 * ProtectedRoute — Guarda de ruta basado en id_role.
 *
 * Props:
 *  - user: objeto de usuario autenticado (null = no autenticado)
 *  - allowedRoles: Array<number> — roles permitidos (ej. [2, 3] para Owner/Manager)
 *  - redirectTo: ruta a la que redirigir si no tiene acceso (default: '/')
 *  - children: ReactNode
 */
export default function ProtectedRoute({ user, allowedRoles, redirectTo = '/', children }) {
  // No autenticado → login
  if (!user) {
    return <Navigate to={redirectTo} replace />
  }

  // Rol no permitido → redirige a su ruta home según su rol
  if (allowedRoles && !allowedRoles.includes(user.id_role)) {
    const homeByRole = {
      1: '/admin',
      2: '/dashboard',
      3: '/dashboard',
    }
    const safeRedirect = homeByRole[user.id_role] || '/'
    return <Navigate to={safeRedirect} replace />
  }

  return children
}
