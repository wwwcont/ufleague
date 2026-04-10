import { Shield } from 'lucide-react'
import type { Team } from '../../domain/entities/types'

interface TeamAvatarProps {
  team: Team
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackLogoUrl?: string
  className?: string
}

export const TeamAvatar = ({ team, size = 'md', fallbackLogoUrl, className = '' }: TeamAvatarProps) => {
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

  const avatarClass = `${sizeClass} shrink-0 rounded-full object-contain ${className}`.trim()

  if (team.logoUrl) {
    return <img src={team.logoUrl} alt={`Логотип ${team.name}`} className={avatarClass} />
  }

  if (fallbackLogoUrl) {
    return <img src={fallbackLogoUrl} alt={`Логотип турнира для ${team.name}`} className={avatarClass} />
  }

  return (
    <span aria-label={`Заглушка ${team.name}`} className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full border border-borderStrong bg-panelSoft text-accentYellow ${className}`.trim()}>
      <Shield size={iconSize} strokeWidth={1.8} />
    </span>
  )
}
