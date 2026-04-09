import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Главная' },
  { to: '/table', label: 'Таблица' },
  { to: '/matches', label: 'Матчи' },
  { to: '/profile', label: 'Профиль' },
]

export const BottomNav = () => (
  <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 bg-[#0D0D0D]/95 backdrop-blur-md">
    <div className="mx-auto grid h-20 max-w-5xl grid-cols-4 gap-1 px-2 py-2">
      {links.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `flex items-center justify-center rounded-xl text-[11px] font-semibold tracking-[0.04em] transition ${isActive ? 'bg-elevated text-accentYellow' : 'text-textSecondary hover:bg-elevated/60'}`}
        >
          {label}
        </NavLink>
      ))}
    </div>
  </nav>
)
