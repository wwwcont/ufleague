import { useLocation } from 'react-router-dom'

export const useShellMeta = () => {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const title = (() => {
    if (pathname === '/') return 'UNITED FOOTBALL LEAGUE'
    if (pathname.startsWith('/matches/')) return 'МАТЧ'
    if (pathname === '/matches') return 'МАТЧИ'
    if (pathname.startsWith('/teams/')) return 'КОМАНДА'
    if (pathname === '/teams') return 'КОМАНДЫ'
    if (pathname.startsWith('/players/')) return 'ИГРОК'
    if (pathname === '/players') return 'ИГРОКИ'
    if (pathname === '/top-scorers') return 'ТОП БОМБАРДИРОВ'
    if (pathname === '/table') return 'ТАБЛИЦА / СЕТКА'
    if (pathname === '/search') return 'ПОИСК'
    if (pathname.startsWith('/events/')) return 'СОБЫТИЕ'
    if (pathname === '/events') return 'СОБЫТИЯ'
    if (pathname === '/login') return 'ВХОД'
    if (pathname === '/profile') return 'ЛК'
    return 'UNITED FOOTBALL LEAGUE'
  })()

  return { title, showBack: !isHome, isHome }
}
