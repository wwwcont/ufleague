import { Circle } from 'lucide-react'
import { BackButton } from '../../components/ui/BackButton'
import { useBackNavigation } from '../../hooks/app/useBackNavigation'
import { useShellMeta } from '../../hooks/app/useShellMeta'
import { useSession } from '../../app/providers/use-session'

export const AppHeader = () => {
  const { title, showBack, isHome } = useShellMeta()
  const { session } = useSession()
  const goBack = useBackNavigation()

  return (
    <header className="safe-top fixed inset-x-0 top-0 z-50 border-b border-borderSubtle bg-panelBg/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
        <div className="w-10">{showBack ? <BackButton onClick={goBack} /> : <Circle size={16} className="text-textMuted" />}</div>
        <h1 className={`text-center ${isHome ? 'text-[13px]' : 'text-sm'} font-bold uppercase tracking-[0.12em] ${isHome ? 'bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent' : 'text-textPrimary'}`}>{title}</h1>
        <div className="w-16 rounded-md border border-borderSubtle bg-mutedBg px-1 py-0.5 text-[10px] text-center text-textMuted">{session.user.role}</div>
      </div>
    </header>
  )
}
