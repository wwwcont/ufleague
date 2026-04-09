import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'
import { tournament } from '../../mocks/data/tournament'

const formatKickoff = (date: string, time: string) => {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year} • ${time}`
}

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => (
  <Link to={`/matches/${match.id}`} className="group block overflow-hidden rounded-2xl border border-borderSubtle bg-panelBg px-4 py-4 shadow-soft transition hover:border-borderStrong hover:bg-panelSoft">
    <div className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
      <p className="font-medium tracking-[0.03em] text-textSecondary">{formatKickoff(match.date, match.time)}</p>
      <span className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-textSecondary">{match.round}</span>
    </div>

    <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 -z-0 h-px -translate-y-1/2 bg-gradient-to-r from-accentYellow/0 via-accentYellowSoft to-accentYellow/0" />

      <div className="z-10 flex min-w-0 items-center gap-2">
        <TeamAvatar team={home} size="lg" fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-1.5" />
        <span className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-sm">{home.shortName}</span>
      </div>

      <div className="z-10 rounded-xl border border-borderStrong bg-mutedBg px-2 py-1 text-center text-2xl font-bold leading-none tabular-nums text-textPrimary">
        {match.score.home}<span className="mx-1 text-accentYellow">:</span>{match.score.away}
      </div>

      <div className="z-10 flex min-w-0 items-center justify-end gap-2 text-right">
        <span className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-sm">{away.shortName}</span>
        <TeamAvatar team={away} size="lg" fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-1.5" />
      </div>
    </div>

    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-textMuted sm:text-sm">
      <span className="truncate">{match.venue}</span>
      {match.status === 'live' ? (
        <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.08em] text-statusLive">
          <span className="live-dot h-2 w-2 rounded-full bg-statusLive" />LIVE
        </span>
      ) : (
        <span className="text-textSecondary">{match.status === 'finished' ? 'Завершен' : 'По расписанию'}</span>
      )}
    </div>
  </Link>
)
