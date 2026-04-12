import { BackButton } from '../../components/ui/BackButton'
import { useBackNavigation } from '../../hooks/app/useBackNavigation'
import { useShellMeta } from '../../hooks/app/useShellMeta'
import { useSession } from '../../app/providers/use-session'
import appHeaderLogo from '../../logo/transparent_logo.png'

export const AppHeader = () => {
  const { title, showBack, isHome } = useShellMeta()
  const { session } = useSession()
  const goBack = useBackNavigation()
  const accountBadge = session.isAuthenticated
    ? `${session.user.telegramHandle ?? session.user.displayName}${session.user.telegramId ? ` · id ${session.user.telegramId}` : ''}`
    : 'Гость'

  return (
    <header className="safe-top sticky top-0 z-50 border-b border-borderSubtle bg-panelBg/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-6">
        <div className="w-10">{showBack ? <BackButton onClick={goBack} /> : <img src={appHeaderLogo} alt="UFL" className="h-7 w-7 object-contain" />}</div>
        <h1 className={`text-center ${isHome ? 'text-[13px]' : 'text-sm'} font-bold uppercase tracking-[0.12em] ${isHome ? 'bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent' : 'text-textPrimary'}`}>{title}</h1>
        <div className="max-w-[168px] truncate rounded-md border border-borderSubtle bg-mutedBg px-1.5 py-0.5 text-[10px] text-center text-textMuted" title={accountBadge}>{accountBadge}</div>
      </div>
    </header>
  )
}
