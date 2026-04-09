import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

export const PublicShell = () => (
  <div className="min-h-screen bg-app text-textPrimary">
    <AppHeader />
    <main className="pt-16">
      <Outlet />
    </main>
    <BottomNav />
  </div>
)
