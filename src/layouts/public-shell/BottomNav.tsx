import { CalendarDays, House, Table2, UserRound } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSession } from '../../app/providers/use-session'

export const BottomNav = () => {
  const { session } = useSession()

  const links = [
    { to: '/', label: 'Главная', icon: House },
    { to: '/table', label: 'Таблица', icon: Table2 },
    { to: '/matches', label: 'Матчи', icon: CalendarDays },
    { to: session.isAuthenticated ? '/profile' : '/login', label: session.isAuthenticated ? 'Кабинет' : 'Вход', icon: UserRound },
  ]

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-borderSubtle bg-panelBg/92 backdrop-blur-md">
      <div className="mx-auto grid h-20 max-w-5xl grid-cols-4 gap-1 px-2 py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to + label}
            to={to}
            aria-label={label}
            className={({ isActive }) => `group flex items-center justify-center rounded-xl transition ${isActive ? 'bg-panelSoft/90' : 'hover:bg-panelSoft/60'}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-accentYellow' : 'text-textSecondary'} />
                <span className="sr-only">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
