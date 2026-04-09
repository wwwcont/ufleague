import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { resolveTeamLogo } from '../../domain/services/logoResolver'
import { tournament } from '../../mocks/data/tournament'
import { StatusBadge } from './StatusBadge'

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => {
  const homeLogo = resolveTeamLogo(home.logoUrl, tournament.logoUrl, tournament.fallbackLogoUrl)
  const awayLogo = resolveTeamLogo(away.logoUrl, tournament.logoUrl, tournament.fallbackLogoUrl)

  return (
    <Link to={`/matches/${match.id}`} className="group block border-b border-accentYellow/70 px-1 py-4 transition hover:border-accentYellow">
      <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-textMuted">
        <span>{match.round}</span>
        <StatusBadge status={match.status} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-textPrimary">
        <div className="flex items-center gap-2">
          <img src={homeLogo} alt={`Логотип ${home.name}`} className="h-6 w-6" />
          <span>{home.shortName}</span>
        </div>
        <div className="text-center text-base text-accentYellow">:</div>
        <div className="flex items-center justify-end gap-2">
          <span>{away.shortName}</span>
          <img src={awayLogo} alt={`Логотип ${away.name}`} className="h-6 w-6" />
        </div>
      </div>

      <p className="mt-2 text-xs text-textSecondary">{match.score.home}:{match.score.away} • {match.date} • {match.time} • {match.venue}</p>
    </Link>
  )
}
