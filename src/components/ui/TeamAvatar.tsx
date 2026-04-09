import { Shield } from 'lucide-react'
import type { Team } from '../../domain/entities/types'

export const TeamAvatar = ({ team, size = 'md' }: { team: Team; size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16',
  }[size]

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 18,
    xl: 28,
  }[size]

  if (team.logoUrl) {
    return <img src={team.logoUrl} alt={`Логотип ${team.name}`} className={`${sizeClass} object-contain`} />
  }

  return (
    <span aria-label={`Заглушка ${team.name}`} className={`${sizeClass} inline-flex items-center justify-center rounded-full bg-elevated text-accentYellow`}>
      <Shield size={iconSize} strokeWidth={1.8} />
    </span>
  )
}
