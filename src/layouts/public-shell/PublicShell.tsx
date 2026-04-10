import { Outlet, useLocation } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

export const PublicShell = () => {
  const location = useLocation()

  return (
    <div className="relative min-h-screen bg-app text-textPrimary">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="bg-orb bg-orb-a" />
        <div className="bg-orb bg-orb-b" />
        <div className="bg-orb bg-orb-c" />
      </div>
      <AppHeader />
      <main key={location.pathname} className="page-enter">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
