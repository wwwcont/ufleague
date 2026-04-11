import type { Match, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'
import { StatusBadge } from './StatusBadge'
import { formatMatchMetaMsk } from '../../lib/date-time'

interface ScoreboardProps {
  match: Match
  home: Team
  away: Team
  tournamentLogoUrl?: string
}

export const Scoreboard = ({ match, home, away, tournamentLogoUrl }: ScoreboardProps) => (
  <section className="relative overflow-hidden rounded-2xl border border-borderStrong bg-panelBg px-4 py-5 shadow-matte">
    <div className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-accentYellow/0 via-accentYellow to-accentYellow/0" />
    <div className="pointer-events-none absolute bottom-0 left-10 right-10 h-px bg-gradient-to-r from-accentYellow/0 via-accentYellowSoft to-accentYellow/0" />

    <div className="mb-5 flex items-center justify-between gap-3 text-xs text-textSecondary sm:text-sm">
      <span className="font-medium uppercase tracking-[0.08em]">{match.round}</span>
      <StatusBadge status={match.status} />
    </div>

    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-5">
      <div className="flex min-w-0 flex-col items-start gap-2">
        <TeamAvatar team={home} size="xl" fallbackLogoUrl={tournamentLogoUrl} className="border border-borderStrong bg-panelSoft p-2" />
        <p className="truncate text-base font-semibold text-textPrimary sm:text-lg">{home.name}</p>
        <p className="text-xs uppercase tracking-[0.08em] text-textMuted">{home.shortName}</p>
      </div>

      <div className="px-1 text-center text-[44px] font-bold leading-none tracking-[-0.04em] text-textPrimary sm:text-[64px]">
        <span className="tabular-nums">{match.score.home}</span>
        <span className="mx-1.5 text-accentYellow">:</span>
        <span className="tabular-nums">{match.score.away}</span>
      </div>

      <div className="flex min-w-0 flex-col items-end gap-2 text-right">
        <TeamAvatar team={away} size="xl" fallbackLogoUrl={tournamentLogoUrl} className="border border-borderStrong bg-panelSoft p-2" />
        <p className="truncate text-base font-semibold text-textPrimary sm:text-lg">{away.name}</p>
        <p className="text-xs uppercase tracking-[0.08em] text-textMuted">{away.shortName}</p>
      </div>
    </div>

    <div className="mt-5 grid gap-2 border-t border-borderSubtle pt-3 text-sm text-textSecondary sm:grid-cols-2">
      <span>{formatMatchMetaMsk(match.date, match.time)}</span>
      <span className="sm:text-right">{match.venue}</span>
    </div>
  </section>
)
