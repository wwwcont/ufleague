import { NavLink } from 'react-router-dom'
import { useSession } from '../../app/providers/use-session'

export const BottomNav = () => {
  const { session } = useSession()

  const links = [
    { to: '/', label: 'Главная' },
    { to: '/table', label: 'Таблица' },
    { to: '/matches', label: 'Матчи' },
    { to: session.isAuthenticated ? '/profile' : '/login', label: session.isAuthenticated ? 'Кабинет' : 'Вход' },
  ]

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-borderSubtle bg-panelBg/95 backdrop-blur-md">
      <div className="mx-auto grid h-20 max-w-5xl grid-cols-4 gap-1 px-2 py-2">
        {links.map(({ to, label }) => (
          <NavLink
            key={to + label}
            to={to}
            className={({ isActive }) => `flex items-center justify-center rounded-xl text-[11px] font-semibold tracking-[0.04em] transition ${isActive ? 'bg-panelSoft text-accentYellow' : 'text-textSecondary hover:bg-panelSoft/60'}`}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
