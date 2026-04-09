import type { Team } from '../../domain/entities/types'

export const TeamAvatar = ({ team, size = 'md' }: { team: Team; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  }[size]

  if (team.logoUrl) {
    return <img src={team.logoUrl} alt={`Логотип ${team.name}`} className={`${sizeClass} object-contain`} />
  }

  return <span aria-label={`Заглушка ${team.name}`} className={`${sizeClass} rounded-full border border-textMuted/60 bg-transparent`} />
}
