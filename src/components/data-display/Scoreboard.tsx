import type { Match, Team } from '../../domain/entities/types'
import { StatusBadge } from './StatusBadge'
import { TeamAvatar } from '../ui/TeamAvatar'

export const Scoreboard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <section className="rounded-2xl bg-app/80 px-3 py-5">
    <div className="mb-4 flex items-center justify-between text-sm text-textSecondary">
      <span className="font-medium">{match.round}</span>
      <StatusBadge status={match.status} />
    </div>

    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div className="flex flex-col items-start gap-2">
        <TeamAvatar team={home} size="lg" />
        <p className="text-base font-semibold text-textPrimary">{home.name}</p>
      </div>

      <div className="text-center text-[44px] font-bold leading-none tabular-nums tracking-[-0.03em] text-textPrimary">
        {match.score.home}<span className="mx-2 text-accentYellow">:</span>{match.score.away}
      </div>

      <div className="flex flex-col items-end gap-2 text-right">
        <TeamAvatar team={away} size="lg" />
        <p className="text-base font-semibold text-textPrimary">{away.name}</p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-textSecondary">
      <span>{match.date} • {match.time}</span>
      <span>{match.venue}</span>
    </div>
  </section>
)
