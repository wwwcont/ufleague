import { Link, useParams } from 'react-router-dom'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Activity, Disc3, Info, Pencil, Plus, Radio, Timer } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { usePlayers } from '../../hooks/data/usePlayers'
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
import { EditableSectionHeader, EditableTextField, SectionActionBar } from '../../components/ui/editable'

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

type FormChip = {
  value: 'W' | 'D' | 'L' | '-'
  upcoming: boolean
}

const getFormChips = (targetTeamId: string, allMatches: Match[], currentMatchId: string): FormChip[] => {
  const teamMatches = allMatches
    .filter((item) => item.id !== currentMatchId && (item.homeTeamId === targetTeamId || item.awayTeamId === targetTeamId))
    .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))

  const finished = teamMatches
    .filter((item) => item.status === 'finished')
    .slice(0, 4)
    .map((item): FormChip => ({ value: getOutcome(targetTeamId, item), upcoming: false }))

  const upcoming = teamMatches
    .filter((item) => item.status !== 'finished')
    .slice(0, 1)
    .map((): FormChip => ({ value: '-', upcoming: true }))

  return [...finished, ...upcoming]
}

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
  const { data: players } = usePlayers()
  const { session } = useSession()
  const { matchesRepository } = useRepositories()

  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const home = match ? teamMap[match.homeTeamId] : null
  const away = match ? teamMap[match.awayTeamId] : null

  const [isInfoEditing, setIsInfoEditing] = useState(false)
  const [editableVenue, setEditableVenue] = useState(match?.venue ?? '')
  const [editableStage, setEditableStage] = useState(match?.stage ?? '')
  const [editableTour, setEditableTour] = useState(match?.tour ?? match?.round ?? '')
  const [editableReferee, setEditableReferee] = useState(match?.referee ?? '')
  const [editableBroadcastUrl, setEditableBroadcastUrl] = useState(match?.broadcastUrl ?? '')
  const [editableDiskUrl, setEditableDiskUrl] = useState(match?.diskUrl ?? '')
  const [metadataStatus, setMetadataStatus] = useState<string | null>(null)
  const [scoreDraft, setScoreDraft] = useState<{ home: number; away: number } | null>(null)
  const [localEvents, setLocalEvents] = useState(match?.events ?? [])
  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [goalTeamId, setGoalTeamId] = useState('')
  const [goalScorerId, setGoalScorerId] = useState('')
  const [goalAssistId, setGoalAssistId] = useState('')
  const [goalStatus, setGoalStatus] = useState<string | null>(null)


  useEffect(() => {
    if (!match) return
    setScoreDraft(match.score)
    setLocalEvents(match.events)
  }, [match])

  if (!match || !teams || !home || !away || !allMatches || !players) {
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
  const homeFormChips = getFormChips(home.id, allMatches, match.id)
  const awayFormChips = getFormChips(away.id, allMatches, match.id)
  const homeStats = getTeamStats(home.id, allMatches)
  const awayStats = getTeamStats(away.id, allMatches)
  const effectiveScore = scoreDraft ?? match.score
  const candidatePlayers = useMemo(() => players.filter((p) => p.teamId === goalTeamId), [goalTeamId, players])

  const liveMinute = localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : null
  const timingNote = (() => {
    if (match.status === 'live' || match.status === 'half_time') return liveMinute ? `${liveMinute}′ минута` : 'Матч в процессе'
    if (match.status === 'scheduled') return getTimeToKickoff(match.date, match.time) ?? 'Скоро'
    return ''
  })()

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-2xl border border-borderStrong bg-panelBg px-5 py-6 shadow-matte sm:px-7 sm:py-7">

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-1/2 overflow-hidden">
            {home.logoUrl && <img src={home.logoUrl} alt="" className="h-full w-full scale-[1.12] object-cover blur-lg opacity-20" />}
          </div>
          <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden">
            {away.logoUrl && <img src={away.logoUrl} alt="" className="h-full w-full scale-[1.12] object-cover blur-lg opacity-20" />}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/82 to-black/35" />
        </div>

        <div className="relative z-10">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <p className="font-medium tracking-[0.03em] text-textSecondary">{formatMatchMetaMsk(match.date, match.time)}</p>
          <span className={`inline-flex items-center gap-2 font-semibold uppercase tracking-[0.08em] ${match.status === 'live' ? 'text-red-400' : 'text-textSecondary'}`}>
            {match.status === 'live' && <span className="live-dot inline-block h-2 w-2 rounded-full bg-red-400" />}
            {statusLabel[match.status]}
          </span>
        </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
          <Link to={`/teams/${home.id}`} className="flex min-w-0 flex-col items-start gap-1.5 rounded-xl p-1 transition hover:bg-panelSoft/70">
            <div className="flex items-center gap-2">
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderSubtle/60 bg-panelSoft/90 sm:h-[72px] sm:w-[72px]">
                <TeamAvatar team={home} size="xl" fit="cover" fallbackLogoUrl={tournament.logoUrl} className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-textPrimary">{home.shortName}</p>
                <p className="text-xs text-textMuted truncate max-w-[120px]">{home.name}</p>
              </div>
            </div>
            <div className="flex gap-1">
              {homeFormChips.map((chip, index) => (
                <span key={`${home.id}_${index}`} className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-semibold ${chip.upcoming ? 'border border-accentYellow/60 bg-accentYellow/15 text-accentYellow' : formTone[chip.value]}`}>
                  {chip.upcoming ? 'Бл' : chip.value === 'W' ? 'В' : chip.value === 'L' ? 'П' : chip.value === 'D' ? 'Н' : '-'}
                </span>
              ))}
            </div>
          </Link>

          <div className="px-1 text-center text-[40px] font-bold leading-none tabular-nums text-textPrimary sm:text-[56px]">
            {effectiveScore.home}<span className="mx-1 text-accentYellow">:</span>{effectiveScore.away}
          </div>

          <Link to={`/teams/${away.id}`} className="flex min-w-0 flex-col items-end gap-1.5 rounded-xl p-1 text-right transition hover:bg-panelSoft/70">
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-semibold uppercase text-textPrimary">{away.shortName}</p>
                <p className="text-xs text-textMuted truncate max-w-[120px]">{away.name}</p>
              </div>
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderSubtle/60 bg-panelSoft/90 sm:h-[72px] sm:w-[72px]">
                <TeamAvatar team={away} size="xl" fit="cover" fallbackLogoUrl={tournament.logoUrl} className="h-full w-full" />
              </div>
            </div>
            <div className="flex gap-1">
              {awayFormChips.map((chip, index) => (
                <span key={`${away.id}_${index}`} className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-semibold ${chip.upcoming ? 'border border-accentYellow/60 bg-accentYellow/15 text-accentYellow' : formTone[chip.value]}`}>
                  {chip.upcoming ? 'Бл' : chip.value === 'W' ? 'В' : chip.value === 'L' ? 'П' : chip.value === 'D' ? 'Н' : '-'}
                </span>
              ))}
            </div>
          </Link>
        </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-textMuted sm:text-sm">
          <span>{timingNote}</span>
          <span>{match.venue}</span>
        </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <EntityReactions entityKey={`match:${match.id}`} />
        <div className="flex items-center gap-2">
          {match.diskUrl && (
            <a href={match.diskUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-accentYellow px-4 py-2 text-xs font-semibold tracking-[0.08em] text-app shadow-soft">
              <Disc3 size={14} /> ДИСК
            </a>
          )}
          {match.broadcastUrl && (
            <a href={match.broadcastUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-accentYellow px-4 py-2 text-xs font-semibold tracking-[0.08em] text-app shadow-soft">
              <Radio size={14} /> СМОТРЕТЬ ТРАНСЛЯЦИЮ
            </a>
          )}
        </div>
      </div>


      {isAdmin && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-3 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-textPrimary">СЧЕТ</p>
            <button type="button" onClick={() => setGoalEditorOpen((prev) => !prev)} className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textMuted hover:border-accentYellow hover:text-accentYellow">
              <Pencil size={12} /> Добавить гол
            </button>
          </div>
          {goalEditorOpen && (
            <div className="mt-2 grid gap-2">
              <select value={goalTeamId} onChange={(e) => { setGoalTeamId(e.target.value); setGoalScorerId(''); setGoalAssistId('') }} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
                <option value="">Выберите команду</option>
                <option value={home.id}>{home.name}</option>
                <option value={away.id}>{away.name}</option>
              </select>
              <select value={goalScorerId} onChange={(e) => setGoalScorerId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm" disabled={!goalTeamId}>
                <option value="">Автор гола</option>
                {candidatePlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
              </select>
              <select value={goalAssistId} onChange={(e) => setGoalAssistId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm" disabled={!goalTeamId}>
                <option value="">Ассист (необязательно)</option>
                {candidatePlayers.filter((player) => player.id !== goalScorerId).map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
              </select>
              <button
                type="button"
                disabled={!goalTeamId || !goalScorerId}
                className="w-fit rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app disabled:opacity-50"
                onClick={async () => {
                  const nextScore = goalTeamId === home.id
                    ? { home: effectiveScore.home + 1, away: effectiveScore.away }
                    : { home: effectiveScore.home, away: effectiveScore.away + 1 }
                  const newGoalEvent: Match['events'][number] = {
                    id: `goal_${Date.now()}`,
                    minute: (localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : 0) + 1,
                    type: 'goal',
                    teamId: goalTeamId,
                    playerId: goalScorerId,
                    assistPlayerId: goalAssistId || undefined,
                    note: goalAssistId ? `ассист: ${goalAssistId}` : undefined,
                  }
                  const nextEvents = [...localEvents, newGoalEvent]
                  setScoreDraft(nextScore)
                  setLocalEvents(nextEvents)
                  try {
                    await matchesRepository.updateMatch?.(match.id, { homeScore: nextScore.home, awayScore: nextScore.away, goalEvents: nextEvents })
                    setGoalStatus('Гол и ассист сохранены. Счет обновлен.')
                  } catch (error) {
                    setGoalStatus(actionError(error))
                  }
                }}
              >
                Сохранить гол
              </button>
            </div>
          )}
          {goalStatus && <p className="mt-2 text-xs text-textMuted">{goalStatus}</p>}
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg px-4 py-3 shadow-soft">
        <EditableSectionHeader
          title="Информация"
          subtitle="Ключевая metadata матча"
          canEdit={isAdmin}
          isEditing={isInfoEditing}
          onStartEdit={() => {
            setEditableVenue(match.venue ?? '')
            setEditableStage(match.stage ?? '')
            setEditableTour(match.tour ?? match.round ?? '')
            setEditableReferee(match.referee ?? '')
            setEditableBroadcastUrl(match.broadcastUrl ?? '')
            setEditableDiskUrl(match.diskUrl ?? '')
            setMetadataStatus(null)
            setIsInfoEditing(true)
          }}
          onCancelEdit={() => {
            setIsInfoEditing(false)
            setMetadataStatus(null)
          }}
          actions={<Info size={14} className="text-accentYellow" />}
        />
        <div className="grid gap-2 text-sm text-textSecondary sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Статус:</span> {statusLabel[match.status]}</div>
          <EditableTextField label="Этап" value={editableStage} onChange={setEditableStage} isEditing={isInfoEditing} placeholder="Например: Полуфинал" />
          <EditableTextField label="Тур / стадия" value={editableTour} onChange={setEditableTour} isEditing={isInfoEditing} placeholder="Например: 5 тур" />
          <EditableTextField label="Судья" value={editableReferee} onChange={setEditableReferee} isEditing={isInfoEditing} placeholder="Имя судьи" />
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <EditableTextField label="Диск" value={editableDiskUrl} onChange={setEditableDiskUrl} isEditing={isInfoEditing} placeholder="https://drive.google.com/..." />
          <EditableTextField label="Трансляция" value={editableBroadcastUrl} onChange={setEditableBroadcastUrl} isEditing={isInfoEditing} placeholder="https://stream.example.com" />
        </div>
        <div className="mt-2">
          <EditableTextField label="Стадион / площадка" value={editableVenue} onChange={setEditableVenue} isEditing={isInfoEditing} placeholder="Название арены" />
        </div>
        <SectionActionBar
          isEditing={isInfoEditing}
          statusMessage={metadataStatus}
          onCancel={() => {
            setIsInfoEditing(false)
            setMetadataStatus(null)
          }}
          onSave={async () => {
            try {
              await matchesRepository.updateMatch?.(match.id, {
                venue: editableVenue.trim() || match.venue,
                stage: editableStage.trim(),
                tour: editableTour.trim(),
                referee: editableReferee.trim(),
                diskUrl: editableDiskUrl.trim(),
                broadcastUrl: editableBroadcastUrl.trim(),
              })
              setMetadataStatus('Информация обновлена')
              setIsInfoEditing(false)
            } catch (error) {
              setMetadataStatus(actionError(error))
            }
          }}
        />
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Timer size={15} className="text-accentYellow" /> События матча</div>
          <div className="flex items-center gap-2">
            <Link to={`/matches/${match.id}/events`} className="text-xs text-accentYellow hover:underline">Все события</Link>
            {isAdmin && (
              <Link to={`/matches/${match.id}/events`} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app">
                <Plus size={12} /> Добавить событие
              </Link>
            )}
          </div>
        </div>
        {localEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-4 text-sm text-textMuted">Автособытия (старт, голы, конец, изменение времени, победитель) и admin-события появятся здесь.</p>
        ) : (
          <div className="space-y-2">
            {localEvents.slice().sort((a, b) => a.minute - b.minute).map((event) => (
              <div key={event.id} className="rounded-xl border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textSecondary">
                <span className="mr-2 font-semibold text-textPrimary">{event.minute}′</span>
                <span className="uppercase tracking-[0.06em] text-accentYellow">{event.type}</span>
                {event.assistPlayerId && <span className="ml-2 text-textMuted">ассист: {event.assistPlayerId}</span>}
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

    </PageContainer>
  )
}
