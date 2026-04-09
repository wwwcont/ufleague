import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'ГЛАВНАЯ' },
  { to: '/matches', label: 'МАТЧИ' },
  { to: '/table', label: 'ТАБЛИЦА' },
  { to: '/teams', label: 'КОМАНДЫ' },
  { to: '/profile', label: 'ЛК' },
]

export const BottomNav = () => (
  <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 bg-[#0D0D0D]/95 backdrop-blur-sm">
    <div className="mx-auto grid h-16 max-w-5xl grid-cols-5 px-1">
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `flex items-center justify-center text-[10px] font-semibold tracking-[0.08em] ${isActive ? 'text-accentYellow' : 'text-textSecondary'}`}
        >
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
)
