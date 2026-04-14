import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from '../providers/use-session'

export const RequireAuth = () => {
  const { status } = useSession()
  const location = useLocation()

  if (status === 'loading') {
    return null
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
