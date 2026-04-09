import type { Match, Team } from '../../domain/entities/types'
import { StatusBadge } from './StatusBadge'

export const Scoreboard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <section className="border-y border-accentYellow/70 px-1 py-6 sm:px-2">
    <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-textMuted">
      <span>{match.round}</span>
      <StatusBadge status={match.status} />
    </div>

    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-1 py-3">
      <div className="text-left">
        <p className="text-xs uppercase tracking-[0.12em] text-textMuted">Хозяева</p>
        <p className="mt-1 text-sm font-semibold text-textPrimary">{home.name}</p>
      </div>
      <div className="text-center text-[40px] font-bold leading-none tabular-nums tracking-[-0.03em] text-textPrimary">
        {match.score.home}<span className="mx-2 text-accentYellow">:</span>{match.score.away}
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-[0.12em] text-textMuted">Гости</p>
        <p className="mt-1 text-sm font-semibold text-textPrimary">{away.name}</p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-accentYellow/40 pt-3 text-xs text-textSecondary">
      <span>{match.date} • {match.time}</span>
      <span>{match.venue}</span>
    </div>
  </section>
)
