import { useLocation } from 'react-router-dom'

export const useShellMeta = () => {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const title = (() => {
    if (pathname === '/') return 'UFLEAGUE'
    if (pathname.startsWith('/matches/')) return 'МАТЧ'
    if (pathname === '/matches') return 'МАТЧИ'
    if (pathname.startsWith('/teams/')) return 'КОМАНДА'
    if (pathname === '/teams') return 'КОМАНДЫ'
    if (pathname.startsWith('/players/')) return 'ИГРОК'
    if (pathname === '/players') return 'ИГРОКИ'
    if (pathname === '/table') return 'ТАБЛИЦА'
    if (pathname === '/bracket') return 'СЕТКА'
    if (pathname === '/search') return 'ПОИСК'
    if (pathname === '/login') return 'ВХОД'
    if (pathname === '/profile') return 'ЛК'
    return 'UFLEAGUE'
  })()

  return { title, showBack: !isHome }
}
