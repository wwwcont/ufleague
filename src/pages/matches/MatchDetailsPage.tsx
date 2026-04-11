import { Link, useParams } from 'react-router-dom'
import { Fragment, useState } from 'react'
import { Activity, Info, Radio, Timer, Wrench } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { tournament } from '../../mocks/data/tournament'
import { CommentsSection } from '../../components/comments'
import { EntityReactions } from '../../components/ui/EntityReactions'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { canManageMatch } from '../../domain/services/accessControl'
import { formatMatchMetaMsk, getTimeToKickoff } from '../../lib/date-time'
import type { Match } from '../../domain/entities/types'

const statusLabel: Record<string, string> = {
  scheduled: 'По расписанию',
  live: 'LIVE',
  half_time: 'Перерыв',
  finished: 'Завершен',
}

const formTone: Record<string, string> = {
  W: 'bg-emerald-500/85 text-white',
  D: 'bg-zinc-500/80 text-white',
  L: 'bg-rose-500/85 text-white',
  '-': 'bg-zinc-700/85 text-white',
}

const getOutcome = (targetTeamId: string, match: Match): 'W' | 'D' | 'L' | '-' => {
  if (match.status !== 'finished') return '-'
  const isHome = match.homeTeamId === targetTeamId
  const own = isHome ? match.score.home : match.score.away
  const opp = isHome ? match.score.away : match.score.home
  if (own > opp) return 'W'
  if (own < opp) return 'L'
  return 'D'
}

const getRecentForm = (targetTeamId: string, allMatches: Match[], currentMatchId: string) => allMatches
  .filter((item) => item.id !== currentMatchId && (item.homeTeamId === targetTeamId || item.awayTeamId === targetTeamId))
  .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
  .slice(0, 5)
  .map((item) => getOutcome(targetTeamId, item))

const getTeamStats = (teamId: string, allMatches: Match[]) => {
  const played = allMatches.filter((item) => item.status === 'finished' && (item.homeTeamId === teamId || item.awayTeamId === teamId))
  const goals = played.reduce((sum, item) => sum + (item.homeTeamId === teamId ? item.score.home : item.score.away), 0)
  const conceded = played.reduce((sum, item) => sum + (item.homeTeamId === teamId ? item.score.away : item.score.home), 0)
  const wins = played.filter((item) => getOutcome(teamId, item) === 'W').length
  return { goals, conceded, goalDiff: goals - conceded, wins }
}

export const MatchDetailsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: allMatches } = useMatches()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { matchesRepository } = useRepositories()

  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const home = match ? teamMap[match.homeTeamId] : null
  const away = match ? teamMap[match.awayTeamId] : null

  const [broadcastUrl, setBroadcastUrl] = useState(match?.broadcastUrl ?? '')
  const [adminStatus, setAdminStatus] = useState<string | null>(null)

  if (!match || !teams || !home || !away || !allMatches) {
    return (
      <PageContainer>
        <EmptyState title="Матч не найден" />
      </PageContainer>
    )
  }

  const isAdmin = canManageMatch(session)
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 403) return 'Недостаточно прав (403).'
      if (error.status === 429) return 'Слишком частые запросы (429).'
      return `Ошибка API ${error.status}: ${error.message}`
    }
    return error instanceof Error ? error.message : 'Не удалось выполнить admin action'
  }

  const homeForm = getRecentForm(home.id, allMatches, match.id)
  const awayForm = getRecentForm(away.id, allMatches, match.id)
  const homeStats = getTeamStats(home.id, allMatches)
  const awayStats = getTeamStats(away.id, allMatches)

  const liveMinute = match.events.length ? Math.max(...match.events.map((event) => event.minute)) : null
  const timingNote = (() => {
    if (match.status === 'live' || match.status === 'half_time') return liveMinute ? `${liveMinute}′ минута` : 'Матч в процессе'
    if (match.status === 'scheduled') return getTimeToKickoff(match.date, match.time) ?? 'Скоро'
    return ''
  })()

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-2xl border border-borderStrong bg-panelBg px-4 py-4 shadow-matte">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <p className="font-medium tracking-[0.03em] text-textSecondary">{formatMatchMetaMsk(match.date, match.time)}</p>
          <span className={`inline-flex items-center gap-2 font-semibold uppercase tracking-[0.08em] ${match.status === 'live' ? 'text-red-400' : 'text-textSecondary'}`}>
            {match.status === 'live' && <span className="live-dot inline-block h-2 w-2 rounded-full bg-red-400" />}
            {statusLabel[match.status]}
          </span>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <div className="flex items-center gap-2">
              <TeamAvatar team={home} size="lg" fallbackLogoUrl={tournament.logoUrl} className="bg-panelSoft p-1.5" />
              <div>
                <p className="text-sm font-semibold uppercase text-textPrimary">{home.shortName}</p>
                <p className="text-xs text-textMuted truncate max-w-[120px]">{home.name}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {(homeForm.length ? homeForm : ['-', '-', '-', '-', '-']).map((value, index) => <span key={`${home.id}_${index}`} className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold ${formTone[value]}`}>{value === 'W' ? 'В' : value === 'L' ? 'П' : value === 'D' ? 'Н' : '-'}</span>)}
            </div>
          </div>

          <div className="px-1 text-center text-[36px] font-bold leading-none tabular-nums text-textPrimary sm:text-[46px]">
            {match.score.home}<span className="mx-1 text-accentYellow">:</span>{match.score.away}
          </div>

          <div className="flex min-w-0 flex-col items-end gap-1.5 text-right">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-semibold uppercase text-textPrimary">{away.shortName}</p>
                <p className="text-xs text-textMuted truncate max-w-[120px]">{away.name}</p>
              </div>
              <TeamAvatar team={away} size="lg" fallbackLogoUrl={tournament.logoUrl} className="bg-panelSoft p-1.5" />
            </div>
            <div className="flex gap-1">
              {(awayForm.length ? awayForm : ['-', '-', '-', '-', '-']).map((value, index) => <span key={`${away.id}_${index}`} className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold ${formTone[value]}`}>{value === 'W' ? 'В' : value === 'L' ? 'П' : value === 'D' ? 'Н' : '-'}</span>)}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-textMuted sm:text-sm">
          <span>{timingNote}</span>
          <span>{match.venue}</span>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <EntityReactions entityKey={`match:${match.id}`} />
        {match.broadcastUrl && (
          <a href={match.broadcastUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-accentYellow px-4 py-2 text-xs font-semibold tracking-[0.08em] text-white shadow-soft">
            <Radio size={14} /> СМОТРЕТЬ ТРАНСЛЯЦИЮ
          </a>
        )}
      </div>

      {isAdmin && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Admin: трансляция</h2>
          <div className="flex gap-2">
            <input value={broadcastUrl} onChange={(event) => setBroadcastUrl(event.target.value)} placeholder="https://stream.example.com" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
            <button
              type="button"
              className="rounded-lg bg-accentYellow px-3 py-2 text-sm font-semibold text-app"
              onClick={async () => {
                try {
                  await matchesRepository.updateMatch?.(match.id, { broadcastUrl })
                  setAdminStatus('Ссылка трансляции сохранена')
                } catch (error) {
                  setAdminStatus(actionError(error))
                }
              }}
            >
              Сохранить
            </button>
          </div>
          {adminStatus && <p className="mt-2 text-xs text-textMuted">{adminStatus}</p>}
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg px-4 py-3 shadow-soft">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-textPrimary">
          <Info size={14} className="text-accentYellow" /> Quick match info
        </div>
        <div className="grid gap-2 text-sm text-textSecondary sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Статус:</span> {statusLabel[match.status]}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Этап:</span> {match.stage ?? '—'}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Тур:</span> {match.tour ?? match.round}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Судья:</span> {match.referee ?? '—'}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Timer size={15} className="text-accentYellow" /> События матча</div>
        {match.events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-4 text-sm text-textMuted">Автособытия (старт, голы, конец, изменение времени, победитель) и admin-события появятся здесь.</p>
        ) : (
          <div className="space-y-2">
            {match.events.slice().sort((a, b) => a.minute - b.minute).map((event) => (
              <div key={event.id} className="rounded-xl border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textSecondary">
                <span className="mr-2 font-semibold text-textPrimary">{event.minute}′</span>
                <span className="uppercase tracking-[0.06em] text-accentYellow">{event.type}</span>
                {event.note && <span className="ml-2">— {event.note}</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Activity size={15} className="text-accentYellow" /> Сравнение команд</div>
        <div className="grid grid-cols-[1fr_auto_1fr] gap-y-2 text-sm">
          {[
            { label: 'Голы', homeValue: homeStats.goals, awayValue: awayStats.goals },
            { label: 'Разница голов', homeValue: homeStats.goalDiff, awayValue: awayStats.goalDiff },
            { label: 'Победы', homeValue: homeStats.wins, awayValue: awayStats.wins },
            { label: 'Капитан', homeValue: home.coach, awayValue: away.coach },
            { label: 'Форма', homeValue: homeForm.join(' '), awayValue: awayForm.join(' ') },
          ].map((row) => (
            <Fragment key={row.label}>
              <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-textPrimary">{row.homeValue ?? '—'}</div>
              <div className="px-3 py-2 text-center text-textMuted">{row.label}</div>
              <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-right text-textPrimary">{row.awayValue ?? '—'}</div>
            </Fragment>
          ))}
        </div>
      </section>

      <CommentsSection entityType="match" entityId={match.id} title="Комментарии" />

      <div className="flex gap-3 text-xs">
        <Link to={`/teams/${home.id}`} className="text-accentYellow hover:underline">Команда {home.shortName}</Link>
        <Link to={`/teams/${away.id}`} className="text-accentYellow hover:underline">Команда {away.shortName}</Link>
      </div>
    </PageContainer>
  )
}
