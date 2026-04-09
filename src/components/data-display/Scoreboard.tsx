import type { Match, Team } from '../../domain/entities/types'
import { StatusBadge } from './StatusBadge'

export const Scoreboard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <section className="rounded-2xl border border-borderStrong bg-surface px-5 py-6 shadow-elevated sm:px-6">
    <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-textMuted">
      <span>{match.round}</span>
      <StatusBadge status={match.status} />
    </div>

    <div className="mb-4 h-px w-16 bg-accentYellow" />

    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-borderSubtle bg-app/35 px-3 py-4">
      <div className="text-left">
        <p className="text-xs uppercase tracking-[0.12em] text-textMuted">Home</p>
        <p className="mt-1 text-sm font-semibold text-textPrimary">{home.name}</p>
      </div>
      <div className="text-center text-[40px] font-bold leading-none tabular-nums tracking-[-0.03em] text-textPrimary">
        {match.score.home}<span className="mx-2 text-textMuted">:</span>{match.score.away}
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-[0.12em] text-textMuted">Away</p>
        <p className="mt-1 text-sm font-semibold text-textPrimary">{away.name}</p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-textSecondary">
      <span>{match.date} • {match.time}</span>
      <span>{match.venue}</span>
    </div>
  </section>
)
