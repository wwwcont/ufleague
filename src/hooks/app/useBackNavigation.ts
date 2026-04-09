import { useLocation, useNavigate } from 'react-router-dom'
import { backFallback } from '../../lib/router/back-fallback'

export const useBackNavigation = () => {
  const navigate = useNavigate()
  const { pathname, key } = useLocation()

  return () => {
    if (key !== 'default') {
      navigate(-1)
      return
    }
    navigate(backFallback(pathname))
  }
}
