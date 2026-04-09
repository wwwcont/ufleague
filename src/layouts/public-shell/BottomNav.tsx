import { Home, Search, Shield, Table, Trophy } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Главная', icon: Home },
  { to: '/matches', label: 'Матчи', icon: Trophy },
  { to: '/teams', label: 'Команды', icon: Shield },
  { to: '/table', label: 'Таблица', icon: Table },
  { to: '/search', label: 'Поиск', icon: Search },
]

export const BottomNav = () => (
  <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-accentYellow/70 bg-app">
    <div className="mx-auto grid h-16 max-w-5xl grid-cols-5 px-1">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `flex flex-col items-center justify-center gap-1 text-xs ${isActive ? 'text-textPrimary' : 'text-textMuted'}`}
        >
          {({ isActive }) => (
            <>
              <Icon size={18} />
              <span className={isActive ? 'border-t border-accentYellow pt-0.5' : ''}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  </nav>
)
