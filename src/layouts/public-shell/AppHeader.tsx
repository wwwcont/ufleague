import { Shield } from 'lucide-react'
import { BackButton } from '../../components/ui/BackButton'
import { useBackNavigation } from '../../hooks/app/useBackNavigation'
import { useShellMeta } from '../../hooks/app/useShellMeta'

export const AppHeader = () => {
  const { title, showBack } = useShellMeta()
  const goBack = useBackNavigation()

  return (
    <header className="safe-top fixed inset-x-0 top-0 z-40 border-b border-borderSubtle bg-app/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
        <div className="w-12">{showBack ? <BackButton onClick={goBack} /> : <Shield size={20} className="text-accentYellow" />}</div>
        <h1 className="text-base font-semibold tracking-wide text-textPrimary">{title}</h1>
        <div className="w-12" />
      </div>
    </header>
  )
}
