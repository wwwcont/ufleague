import { useLocation } from 'react-router-dom'

export const useShellMeta = () => {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  const title = (() => {
    if (pathname === '/') return 'Кубок UFL'
    if (pathname.startsWith('/matches/')) return 'Матч'
    if (pathname === '/matches') return 'Матчи'
    if (pathname.startsWith('/teams/')) return 'Команда'
    if (pathname === '/teams') return 'Команды'
    if (pathname.startsWith('/players/')) return 'Игрок'
    if (pathname === '/players') return 'Игроки'
    if (pathname === '/table') return 'Таблица'
    if (pathname === '/bracket') return 'Сетка'
    if (pathname === '/search') return 'Поиск'
    if (pathname === '/login') return 'Вход'
    if (pathname === '/profile') return 'Профиль'
    return 'Кубок UFL'
  })()

  return { title, showBack: !isHome }
}
