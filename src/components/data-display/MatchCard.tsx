import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

const formatKickoff = (date: string, time: string) => {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year} ${time}`
}

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <Link to={`/matches/${match.id}`} className="group matte-panel relative block px-3 py-3 transition hover:bg-elevated">
    {match.status === 'live' && (
      <span className="absolute right-3 top-3 inline-flex items-center gap-1 text-xs font-semibold uppercase text-statusLive">
        <span className="live-dot h-2 w-2 rounded-full bg-statusLive" />
        LIVE
      </span>
    )}

    <p className="mb-2 text-sm font-semibold tabular-nums tracking-[0.03em] text-textPrimary">{formatKickoff(match.date, match.time)}</p>

    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 text-xs font-semibold uppercase tracking-[0.08em] text-textPrimary">
      <div className="flex min-w-0 items-center gap-2">
        <TeamAvatar team={home} size="lg" />
        <span className="truncate">{home.shortName}</span>
      </div>

      <div className="px-1 text-2xl font-bold leading-none text-accentYellow tabular-nums">
        {match.score.home}:{match.score.away}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        <span className="truncate">{away.shortName}</span>
        <TeamAvatar team={away} size="lg" />
      </div>
    </div>

    <p className="mt-2 text-[11px] text-textSecondary">{match.venue}</p>
  </Link>
)
