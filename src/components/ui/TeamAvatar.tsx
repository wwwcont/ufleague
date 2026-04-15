import { useState } from 'react'
import type { Team } from '../../domain/entities/types'
import transparentLogo from '../../logo/transparent.png'

interface TeamAvatarProps {
  team: Team
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackLogoUrl?: string
  className?: string
  fit?: 'contain' | 'cover'
}

export const TeamAvatar = ({ team, size = 'md', className = '', fit = 'contain' }: TeamAvatarProps) => {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null)

  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16',
  }[size]

  const fitClass = fit === 'cover' ? 'object-cover' : 'object-contain'
  const avatarClass = `${sizeClass} shrink-0 rounded-full ${fitClass} ${className}`.trim()

  if (team.logoUrl && team.logoUrl !== failedLogoUrl) {
    return <img src={team.logoUrl} alt={`Логотип ${team.name}`} className={avatarClass} onError={() => setFailedLogoUrl(team.logoUrl)} />
  }

  return <img src={transparentLogo} alt={`Логотип ${team.name}`} className={avatarClass} />
}
