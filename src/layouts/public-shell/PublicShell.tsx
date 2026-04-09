import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomNav } from './BottomNav'

export const PublicShell = () => (
  <div className="relative min-h-screen bg-app text-textPrimary">
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />
      <div className="bg-orb bg-orb-c" />
    </div>
    <AppHeader />
    <main className="safe-top pt-16">
      <Outlet />
    </main>
    <BottomNav />
  </div>
)
