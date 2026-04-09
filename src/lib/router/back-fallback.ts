export const backFallback = (path: string): string => {
  if (path.startsWith('/matches/')) return '/matches'
  if (path.startsWith('/teams/')) return '/teams'
  if (path.startsWith('/players/')) return '/players'
  if (path === '/bracket') return '/table'
  if (path === '/search' || path === '/login' || path === '/profile') return '/'
  return '/'
}
