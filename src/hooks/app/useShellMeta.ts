import { useLocation } from 'react-router-dom'

export const useShellMeta = () => {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const title = (() => {
    if (pathname === '/') return 'UFL Cup'
    if (pathname.startsWith('/matches/')) return 'Match Details'
    if (pathname === '/matches') return 'Matches'
    if (pathname.startsWith('/teams/')) return 'Team Details'
    if (pathname === '/teams') return 'Teams'
    if (pathname.startsWith('/players/')) return 'Player Details'
    if (pathname === '/players') return 'Players'
    if (pathname === '/table') return 'Standings'
    if (pathname === '/bracket') return 'Bracket'
    if (pathname === '/search') return 'Search'
    if (pathname === '/login') return 'Login'
    if (pathname === '/profile') return 'Profile'
    return 'UFL Cup'
  })()

  return { title, showBack: !isHome }
}
