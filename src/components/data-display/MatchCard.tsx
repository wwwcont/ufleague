import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { StatusBadge } from './StatusBadge'
import { TeamAvatar } from '../ui/TeamAvatar'

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <Link
    to={`/matches/${match.id}`}
    className="group block rounded-2xl bg-gradient-to-r from-accentYellow/15 to-transparent px-3 py-3 transition hover:from-accentYellow/20"
  >
    <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-textMuted">
      <span>{match.round}</span>
      <StatusBadge status={match.status} />
    </div>

    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-textPrimary">
      <div className="flex min-w-0 items-center gap-2">
        <TeamAvatar team={home} size="sm" />
        <span className="truncate">{home.shortName}</span>
      </div>

      <div className="px-2 text-sm text-accentYellow">
        {match.score.home}:{match.score.away}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate">{away.shortName}</span>
        <TeamAvatar team={away} size="sm" />
      </div>
    </div>

    <p className="mt-2 text-[11px] text-textSecondary">
      {match.date} • {match.time} • {match.venue}
    </p>
  </Link>
)
