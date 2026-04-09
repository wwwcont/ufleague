import { Link } from 'react-router-dom'
import type { Match, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'
import { tournament } from '../../mocks/data/tournament'

const formatKickoff = (date: string, time: string) => {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year} • ${time}`
}

const getTimeToKickoff = (date: string, time: string) => {
  const kickoff = new Date(`${date}T${time}:00`)
  const diffMs = kickoff.getTime() - Date.now()

  if (Number.isNaN(kickoff.getTime()) || diffMs <= 0) return null

  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) return `через ${hours}ч ${minutes}м`
  return `через ${minutes}м`
}

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
        <p className="font-medium tracking-[0.03em] text-textSecondary">{formatKickoff(match.date, match.time)}</p>
        <span className={`font-semibold uppercase tracking-[0.08em] ${indicator.tone}`}>{indicator.label}</span>
      </div>

      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div className="pointer-events-none absolute right-[calc(50%+2.7rem)] top-1/2 -z-0 h-px w-20 -translate-y-1/2 bg-gradient-to-r from-accentYellowSoft/80 to-transparent" />
        <div className="pointer-events-none absolute left-[calc(50%+2.7rem)] top-1/2 -z-0 h-px w-20 -translate-y-1/2 bg-gradient-to-l from-accentYellowSoft/80 to-transparent" />

        <div className="z-10 flex min-w-0 items-center gap-2">
          <TeamAvatar team={home} size="lg" fallbackLogoUrl={tournament.logoUrl} className="bg-panelSoft p-1.5" />
          <span className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-sm">{home.shortName}</span>
        </div>

        <div className="z-10 px-1 text-center text-2xl font-bold leading-none tabular-nums text-textPrimary">
          {match.score.home}<span className="mx-1 text-accentYellow">:</span>{match.score.away}
        </div>

        <div className="z-10 flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-textPrimary sm:text-sm">{away.shortName}</span>
          <TeamAvatar team={away} size="lg" fallbackLogoUrl={tournament.logoUrl} className="bg-panelSoft p-1.5" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-textMuted sm:text-sm">
        <span className="truncate">{match.venue}</span>
        <span className="text-textMuted">{match.round}</span>
      </div>
    </Link>
  )
}
