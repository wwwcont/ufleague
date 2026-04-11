import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'
import { tournament } from '../../mocks/data/tournament'
import { EntityReactions } from '../ui/EntityReactions'
import { formatMatchMetaMsk, getTimeToKickoff } from '../../lib/date-time'

const getMatchIndicator = (match: Match) => {
  if (match.status === 'live') return { label: 'LIVE', tone: 'text-statusLive' }
  if (match.status === 'finished') return { label: 'Завершен', tone: 'text-textSecondary' }

  const startsIn = getTimeToKickoff(match.date, match.time)
  return { label: startsIn ?? 'Скоро', tone: 'text-textSecondary' }
}

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => {
  const indicator = getMatchIndicator(match)

  return (
    <Link to={`/matches/${match.id}`} className="group block overflow-hidden rounded-2xl bg-panelBg px-4 py-4 shadow-soft transition hover:bg-panelSoft">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <p className="font-medium tracking-[0.03em] text-textSecondary">{formatMatchMetaMsk(match.date, match.time)}</p>
        <span className={`font-semibold uppercase tracking-[0.08em] ${indicator.tone}`}>{indicator.label}</span>
      </div>

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div className="z-10 flex min-w-0 items-center gap-2">
          <TeamAvatar team={home} size="lg" fallbackLogoUrl={tournament.logoUrl} className="bg-panelSoft p-1.5" />
          <span className="truncate text-sm font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-base">{home.shortName}</span>
        </div>

        <div className="z-10 px-1 text-center text-[30px] font-bold leading-none tabular-nums text-textPrimary sm:text-[34px]">
          <div className="relative inline-flex items-center justify-center px-10">
            <svg className="pointer-events-none absolute right-full top-1/2 h-4 w-16 -translate-y-1/2" viewBox="0 0 64 16" fill="none">
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 3 63 1" stroke="url(#scoreFlowLeft)" strokeWidth="2" strokeLinecap="round" />
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 13 63 15" stroke="url(#scoreFlowLeft)" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="scoreFlowLeft" x1="0" y1="8" x2="63" y2="8" gradientUnits="userSpaceOnUse">
                  <stop stopColor="rgba(227,193,75,0)" />
                  <stop offset="0.52" stopColor="rgba(227,193,75,0.78)" />
                  <stop offset="1" stopColor="rgba(255,231,153,0.96)" />
                </linearGradient>
              </defs>
            </svg>
            <svg className="pointer-events-none absolute left-full top-1/2 h-4 w-16 -translate-y-1/2 scale-x-[-1]" viewBox="0 0 64 16" fill="none">
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 3 63 1" stroke="url(#scoreFlowRight)" strokeWidth="2" strokeLinecap="round" />
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 13 63 15" stroke="url(#scoreFlowRight)" strokeWidth="2" strokeLinecap="round" />
              <defs>
                <linearGradient id="scoreFlowRight" x1="0" y1="8" x2="63" y2="8" gradientUnits="userSpaceOnUse">
                  <stop stopColor="rgba(227,193,75,0)" />
                  <stop offset="0.52" stopColor="rgba(227,193,75,0.78)" />
                  <stop offset="1" stopColor="rgba(255,231,153,0.96)" />
                </linearGradient>
              </defs>
            </svg>
            {match.score.home}<span className="mx-1 text-accentYellow">:</span>{match.score.away}
          </div>
        </div>

        <div className="z-10 flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="truncate text-sm font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-base">{away.shortName}</span>
          <TeamAvatar team={away} size="lg" fallbackLogoUrl={tournament.logoUrl} className="bg-panelSoft p-1.5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-textMuted sm:text-sm">
        <span className="truncate">{match.venue}</span>
        <div className="flex items-center gap-2">
          <span className="text-textMuted">{match.round}</span>
          <EntityReactions entityKey={`match:${match.id}`} compact interactive={false} />
        </div>
      </div>
    </Link>
  )
}
