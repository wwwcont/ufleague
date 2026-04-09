import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { StatusBadge } from './StatusBadge'

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <Link
    to={`/matches/${match.id}`}
    className="group block rounded-2xl border border-borderSubtle bg-surface px-4 py-4 shadow-surface transition hover:border-borderStrong hover:bg-elevated/50"
  >
    <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-textMuted">
      <span>{match.round}</span>
      <StatusBadge status={match.status} />
    </div>

    {match.featured && <div className="mb-3 h-px w-14 bg-accentYellow" />}

    <div className="space-y-2.5">
      <div className="flex items-center justify-between rounded-lg bg-app/40 px-3 py-2">
        <span className="text-sm font-medium text-textPrimary">{home.name}</span>
        <strong className="text-lg tabular-nums tracking-tight text-textPrimary">{match.score.home}</strong>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-app/40 px-3 py-2">
        <span className="text-sm font-medium text-textPrimary">{away.name}</span>
        <strong className="text-lg tabular-nums tracking-tight text-textPrimary">{match.score.away}</strong>
      </div>
    </div>

    <p className="mt-3 text-xs text-textMuted group-hover:text-textSecondary">{match.date} • {match.time} • {match.venue}</p>
  </Link>
)
