import type { Team } from '../../domain/entities/types'

interface TeamAvatarProps {
  team: Team
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackLogoUrl?: string
  className?: string
}

export const TeamAvatar = ({ team, size = 'md', className = '' }: TeamAvatarProps) => {
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16',
  }[size]

  const avatarClass = `${sizeClass} shrink-0 rounded-full object-contain ${className}`.trim()

  if (team.logoUrl) {
    return <img src={team.logoUrl} alt={`Логотип ${team.name}`} className={avatarClass} />
  }

  return <img src="/src/logo/transparent.png" alt={`Логотип ${team.name}`} className={avatarClass} />
}
