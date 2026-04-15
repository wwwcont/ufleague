import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'
import { formatMatchMetaMsk, getTimeToKickoff } from '../../lib/date-time'

const tournamentFallbackLogo = '/assets/logos/tournament.svg'

const getMatchIndicator = (match: Match) => {
  if (match.status === 'live') return { label: 'LIVE', tone: 'text-statusLive' }
  if (match.status === 'finished') return { label: 'Завершен', tone: 'text-textSecondary' }

  const startsIn = getTimeToKickoff(match.date, match.time)
  return { label: startsIn ?? 'Скоро', tone: 'text-textSecondary' }
}

export const MatchCard = ({ match, home, away }: { match: Match; home: Team; away: Team }) => {
  const indicator = getMatchIndicator(match)
  const leftGradientId = `scoreFlowLeft-${match.id}`
  const rightGradientId = `scoreFlowRight-${match.id}`

  return (
    <Link to={`/matches/${match.id}`} className="group block overflow-hidden rounded-2xl bg-panelBg px-4 py-4 shadow-soft transition hover:bg-panelSoft">
      <div className="mb-3 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <p className="font-medium tracking-[0.03em] text-textSecondary">{formatMatchMetaMsk(match.date, match.time)}</p>
        <span className={`font-semibold uppercase tracking-[0.08em] ${indicator.tone}`}>{indicator.label}</span>
      </div>

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div className="z-10 flex min-w-0 items-center gap-2">
          <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderSubtle/60 bg-panelSoft/90 p-0 sm:h-[66px] sm:w-[66px]">
            <TeamAvatar team={home} size="xl" fit="cover" fallbackLogoUrl={tournamentFallbackLogo} className="h-full w-full" />
          </div>
          <span className="truncate text-sm font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-base">{home.shortName}</span>
        </div>

        <div className="z-10 px-1 text-center text-[30px] font-bold leading-none tabular-nums text-textPrimary sm:text-[34px]">
          <div className="relative inline-flex items-center justify-center px-2.5 sm:px-8">
            <svg className="pointer-events-none absolute right-full top-1/2 h-3.5 w-7 -translate-y-1/2 sm:w-12" viewBox="0 0 64 16" fill="none" aria-hidden>
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 3 63 1" stroke={`url(#${leftGradientId})`} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 13 63 15" stroke={`url(#${leftGradientId})`} strokeWidth="1.4" strokeLinecap="round" />
              <defs>
                <linearGradient id={leftGradientId} x1="0" y1="8" x2="63" y2="8" gradientUnits="userSpaceOnUse">
                  <stop stopColor="rgba(227,193,75,0)" />
                  <stop offset="0.52" stopColor="rgba(227,193,75,0.58)" />
                  <stop offset="1" stopColor="rgba(255,231,153,0.74)" />
                </linearGradient>
              </defs>
            </svg>
            <svg className="pointer-events-none absolute left-full top-1/2 h-3.5 w-7 -translate-y-1/2 scale-x-[-1] sm:w-12" viewBox="0 0 64 16" fill="none" aria-hidden>
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 3 63 1" stroke={`url(#${rightGradientId})`} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M0 8 C16 8 22 8 34 8 C44 8 50 13 63 15" stroke={`url(#${rightGradientId})`} strokeWidth="1.4" strokeLinecap="round" />
              <defs>
                <linearGradient id={rightGradientId} x1="0" y1="8" x2="63" y2="8" gradientUnits="userSpaceOnUse">
                  <stop stopColor="rgba(227,193,75,0)" />
                  <stop offset="0.52" stopColor="rgba(227,193,75,0.58)" />
                  <stop offset="1" stopColor="rgba(255,231,153,0.74)" />
                </linearGradient>
              </defs>
            </svg>
            {match.score.home}<span className="mx-1 text-accentYellow">:</span>{match.score.away}
          </div>
        </div>

        <div className="z-10 flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="truncate text-sm font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-base">{away.shortName}</span>
          <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderSubtle/60 bg-panelSoft/90 p-0 sm:h-[66px] sm:w-[66px]">
            <TeamAvatar team={away} size="xl" fit="cover" fallbackLogoUrl={tournamentFallbackLogo} className="h-full w-full" />
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-textMuted sm:text-sm">
        <span className="truncate">{match.venue}</span>
      </div>
    </Link>
  )
}
