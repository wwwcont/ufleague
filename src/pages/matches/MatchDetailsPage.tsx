import { Link, useNavigate, useParams } from 'react-router-dom'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { Activity, Disc3, Info, Pause, Play, Plus, Radio, Timer } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { usePlayers } from '../../hooks/data/usePlayers'
import { EmptyState } from '../../components/ui/EmptyState'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { CommentsSection } from '../../components/comments'
import { EntityReactions } from '../../components/ui/EntityReactions'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { canManageMatch, canManageMatchScore } from '../../domain/services/accessControl'
import { formatMatchMetaMsk, getTimeToKickoff } from '../../lib/date-time'
import type { Match } from '../../domain/entities/types'
import { EditableSectionHeader, SectionActionBar } from '../../components/ui/editable'

const tournamentFallbackLogo = '/assets/logos/tournament.svg'

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

const matchHistoryIcon: Record<'goal' | 'yellow_card' | 'red_card', string> = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
}

const getPlayerLastName = (name?: string) => {
  const value = (name ?? '').trim()
  if (!value) return 'Игрок'
  const parts = value.split(/\s+/)
  return parts[parts.length - 1]
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

const toMskDateTimeInput = (date: string, time: string) => {
  const iso = `${date}T${time}:00Z`
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  const shifted = new Date(parsed.getTime() + 3 * 60 * 60 * 1000)
  const yyyy = shifted.getUTCFullYear()
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(shifted.getUTCDate()).padStart(2, '0')
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mi = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const fromMskDateTimeInput = (input: string) => {
  const [datePart, timePart] = input.split('T')
  if (!datePart || !timePart) return null
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0)).toISOString()
}

export const MatchDetailsPage = () => {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { data: match, refetch: refetchMatch } = useMatchDetails(matchId)
  const { data: allMatches } = useMatches()
  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { session } = useSession()
  const { matchesRepository, playoffGridRepository, cabinetRepository, eventsRepository } = useRepositories()

  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const home = match ? teamMap[match.homeTeamId] : null
  const away = match ? teamMap[match.awayTeamId] : null

  const [isInfoEditing, setIsInfoEditing] = useState(false)
  const [editableVenue, setEditableVenue] = useState(match?.venue ?? '')
  const [editableStage, setEditableStage] = useState(match?.stage ?? '')
  const [editableTour, setEditableTour] = useState(match?.tour ?? match?.round ?? '')
  const [editableReferee, setEditableReferee] = useState(match?.referee ?? '')
  const [editableStartAt, setEditableStartAt] = useState(match ? toMskDateTimeInput(match.date, match.time) : '')
  const [editableBroadcastUrl, setEditableBroadcastUrl] = useState(match?.broadcastUrl ?? '')
  const [editableDiskUrl, setEditableDiskUrl] = useState(match?.diskUrl ?? '')
  const [editableCurrentMinute, setEditableCurrentMinute] = useState(String(match?.currentMinute ?? '0'))
  const [metadataStatus, setMetadataStatus] = useState<string | null>(null)
  const [scoreDraft, setScoreDraft] = useState<{ home: number; away: number } | null>(null)
  const [localEvents, setLocalEvents] = useState(match?.events ?? [])
  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [goalTeamId, setGoalTeamId] = useState('')
  const [goalScorerId, setGoalScorerId] = useState('')
  const [goalAssistId, setGoalAssistId] = useState('')
  const [goalMinuteDraft, setGoalMinuteDraft] = useState('0')
  const [goalMinuteAuto, setGoalMinuteAuto] = useState(false)
  const [goalStatus, setGoalStatus] = useState<string | null>(null)
  const [goalAction, setGoalAction] = useState<'add' | 'remove_selected' | 'remove_last'>('add')
  const [goalConfirmOpen, setGoalConfirmOpen] = useState(false)
  const [cardsEditorOpen, setCardsEditorOpen] = useState(false)
  const [cardsTeamId, setCardsTeamId] = useState('')
  const [cardsPlayerId, setCardsPlayerId] = useState('')
  const [cardsMinuteDraft, setCardsMinuteDraft] = useState('0')
  const [cardsMinuteAuto, setCardsMinuteAuto] = useState(false)
  const [cardsAction, setCardsAction] = useState<'add_yellow' | 'add_red' | 'remove_yellow' | 'remove_red'>('add_yellow')
  const [cardsConfirmOpen, setCardsConfirmOpen] = useState(false)
  const [cardsStatus, setCardsStatus] = useState<string | null>(null)
  const [cardCreateEvent, setCardCreateEvent] = useState(true)
  const [matchFlowPending, setMatchFlowPending] = useState(false)
  const [matchControlOpen, setMatchControlOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [archivePending, setArchivePending] = useState(false)
  const [nowTs, setNowTs] = useState(Date.now())
  const [activeTournamentId, setActiveTournamentId] = useState('1')
  const normalizedTournamentId = /^\d+$/.test(activeTournamentId) ? activeTournamentId : '1'
  const [playoffModalOpen, setPlayoffModalOpen] = useState(false)
  const [playoffCandidates, setPlayoffCandidates] = useState<Array<{ id: string; col: number; row: number }>>([])
  const [playoffLoading, setPlayoffLoading] = useState(false)
  const [playoffStatus, setPlayoffStatus] = useState<string | null>(null)
  const [selectedPlayoffId, setSelectedPlayoffId] = useState<string | null>(null)
  const [currentPlayoffCell, setCurrentPlayoffCell] = useState<{ id: string; col: number; row: number } | null>(null)
  const candidatePlayers = useMemo(() => (players ?? []).filter((p) => p.teamId === goalTeamId), [goalTeamId, players])
  const cardCandidatePlayers = useMemo(() => (players ?? []).filter((p) => p.teamId === cardsTeamId), [cardsTeamId, players])

  useEffect(() => {
    if (!match) return
    setScoreDraft(match.score)
    setLocalEvents(match.events)
    setEditableStartAt(toMskDateTimeInput(match.date, match.time))
    setEditableBroadcastUrl(match.broadcastUrl ?? '')
    setEditableDiskUrl(match.diskUrl ?? '')
    setEditableCurrentMinute(String(match.currentMinute ?? 0))
  }, [match])

  useEffect(() => {
    if (!canManageMatch(session)) return
    void (async () => {
      const cycles = await cabinetRepository.getTournamentCycles?.()
      const active = cycles?.find((item) => item.isActive)
      if (active && /^\d+$/.test(active.id)) setActiveTournamentId(active.id)
    })()
  }, [cabinetRepository, session])

  useEffect(() => {
    if (!match?.playoffCellId) {
      setCurrentPlayoffCell(null)
      return
    }
    void (async () => {
      try {
        const grid = await playoffGridRepository.getPlayoffGrid(normalizedTournamentId)
        const linked = grid.cells.find((cell) => cell.id === match.playoffCellId)
        setCurrentPlayoffCell(linked ? { id: linked.id, col: linked.col, row: linked.row } : null)
      } catch {
        setCurrentPlayoffCell(null)
      }
    })()
  }, [match?.playoffCellId, normalizedTournamentId, playoffGridRepository])

  useEffect(() => {
    if (!match || match.status !== 'live') return
    const timer = window.setInterval(() => setNowTs(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [match, match?.status])

  useEffect(() => {
    if (!match) return
    if (!canManageMatchScore(session)) return
    const kickoffTs = Date.parse(`${match.date}T${match.time}:00Z`)
    if (!Number.isFinite(kickoffTs)) return

    const now = Date.now()
    const endTs = kickoffTs + 96 * 60 * 1000
    const shouldStart = now >= kickoffTs && now < endTs && match.status === 'scheduled'
    const shouldFinish = now >= endTs && (match.status === 'live' || match.status === 'half_time' || match.status === 'scheduled')
    if (!shouldStart && !shouldFinish) return

    void (async () => {
      const hasStartEvent = localEvents.some((event) => event.id === `auto_start_${match.id}`)
      const hasEndEvent = localEvents.some((event) => event.id === `auto_end_${match.id}`)
      if (shouldStart && hasStartEvent && !shouldFinish) return
      if (shouldFinish && hasEndEvent) return

      const minuteBase = localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : 0
      const estimatedLiveMinute = Math.max(match.currentMinute ?? 0, minuteBase)
      const nextEvents = [...localEvents]
      if (shouldStart && !hasStartEvent) {
        nextEvents.push({ id: `auto_start_${match.id}`, minute: Math.max(1, estimatedLiveMinute || minuteBase + 1), type: 'substitution', note: 'Система: матч начался' })
      }
      if (shouldFinish && !hasEndEvent) {
        nextEvents.push({ id: `auto_end_${match.id}`, minute: Math.max(96, estimatedLiveMinute || minuteBase + 1), type: 'substitution', note: 'Система: матч завершен (96 минут)' })
      }
      try {
        await matchesRepository.updateMatch?.(match.id, {
          status: shouldFinish ? 'finished' : 'live',
          homeScore: match.score.home,
          awayScore: match.score.away,
          currentMinute: shouldFinish ? Math.max(96, estimatedLiveMinute || 96) : Math.max(1, estimatedLiveMinute || 1),
          clockAnchorAt: shouldFinish ? null : new Date().toISOString(),
          matchEvents: nextEvents,
        })
        setLocalEvents(nextEvents)
        setGoalStatus(shouldFinish ? 'Матч автоматически завершен по таймеру 96 минут.' : 'Матч автоматически переведен в LIVE по времени старта.')
      } catch (error) {
        setGoalStatus(error instanceof Error ? error.message : 'Не удалось автоматически обновить статус матча.')
      }
    })()
  }, [localEvents, match, matchesRepository, session])

  if (!match || !teams || !home || !away || !allMatches || !players) {
    return (
      <PageContainer>
        <EmptyState title="Матч не найден" />
      </PageContainer>
    )
  }

  const isAdmin = canManageMatch(session)
  const canEditScore = canManageMatchScore(session)
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

  const eventsMinuteMax = localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : 0
  const baseMinute = Math.max(match.currentMinute ?? 0, eventsMinuteMax)
  const liveMinute = (() => {
    if (match.status !== 'live') return baseMinute || null
    if (!match.clockAnchorAt) return baseMinute || null
    const anchorTs = Date.parse(match.clockAnchorAt)
    if (!Number.isFinite(anchorTs)) return baseMinute || null
    const elapsed = Math.max(0, Math.floor((nowTs - anchorTs) / 60_000))
    return Math.min(120, baseMinute + elapsed)
  })()
  const latestEvents = localEvents.slice().sort((a, b) => b.minute - a.minute).slice(0, 3)
  const playersById = Object.fromEntries(players.map((player) => [player.id, player]))
  const historyEvents = localEvents
    .filter((event) => (event.type === 'goal' || event.type === 'yellow_card' || event.type === 'red_card') && event.teamId)
    .sort((a, b) => b.minute - a.minute)
  const historyHome = historyEvents.filter((event) => event.teamId === home.id)
  const historyAway = historyEvents.filter((event) => event.teamId === away.id)
  const lastGoalEvent = [...localEvents].reverse().find((event) => event.type === 'goal' && event.teamId)
  const lastGoalTeamShortName = lastGoalEvent?.teamId ? (teamMap[lastGoalEvent.teamId]?.shortName ?? '—') : '—'
  const timingNote = (() => {
    if (match.status === 'live' || match.status === 'half_time') return liveMinute ? `${liveMinute}′ минута` : 'Матч в процессе'
    if (match.status === 'scheduled') return getTimeToKickoff(match.date, match.time) ?? 'Скоро'
    return ''
  })()

  const refreshAfterPlayoffAction = async () => {
    await Promise.all([
      refetchMatch(),
      playoffGridRepository.getPlayoffGrid(normalizedTournamentId),
    ])
  }

  const openPlayoffModal = async () => {
    setPlayoffModalOpen(true)
    setPlayoffLoading(true)
    setPlayoffStatus(null)
    setSelectedPlayoffId(null)
    try {
      const items = await playoffGridRepository.getMatchCandidates(normalizedTournamentId, match.id)
      setPlayoffCandidates(items.map((item) => ({ id: item.id, col: item.col, row: item.row })))
    } catch (error) {
      setPlayoffStatus(actionError(error))
    } finally {
      setPlayoffLoading(false)
    }
  }

  return (
    <PageContainer>
      <section className="relative rounded-2xl border border-borderStrong bg-panelBg px-5 py-6 shadow-matte sm:px-7 sm:py-7">
        {canEditScore && (
          <div className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
            <button type="button" onClick={() => { setCardsMinuteDraft(String(liveMinute ?? 0)); setCardsMinuteAuto(false); setCardsEditorOpen(true) }} className="inline-flex items-center rounded-full border border-borderSubtle bg-panelBg px-3 py-1 text-xs font-semibold text-textPrimary shadow-soft">
              Карточки
            </button>
            <button type="button" onClick={() => { setGoalMinuteDraft(String(liveMinute ?? 0)); setGoalMinuteAuto(false); setGoalEditorOpen(true) }} className="inline-flex items-center rounded-full bg-accentYellow px-4 py-1 text-xs font-semibold text-app shadow-soft">
              СЧЕТ
            </button>
            <button
              type="button"
              disabled={matchFlowPending}
              onClick={() => setMatchControlOpen(true)}
              className="inline-flex items-center gap-1 rounded-full border border-borderSubtle bg-panelBg px-3 py-1 text-xs font-semibold text-textPrimary shadow-soft disabled:opacity-50"
            >
              {match.status === 'live' || match.status === 'half_time' ? <Pause size={12} /> : <Play size={12} />}
              {match.status === 'live' || match.status === 'half_time' ? 'Стоп' : 'Старт'}
            </button>
          </div>
        )}

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
                <TeamAvatar team={home} size="xl" fit="cover" fallbackLogoUrl={tournamentFallbackLogo} className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase text-textPrimary">{home.shortName}</p>
                <p className="hidden max-w-[120px] truncate text-xs text-textMuted sm:block">{home.name}</p>
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
                <p className="hidden max-w-[120px] truncate text-xs text-textMuted sm:block">{away.name}</p>
              </div>
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-borderSubtle/60 bg-panelSoft/90 sm:h-[72px] sm:w-[72px]">
                <TeamAvatar team={away} size="xl" fit="cover" fallbackLogoUrl={tournamentFallbackLogo} className="h-full w-full" />
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
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-textMuted sm:hidden">
          <p className="truncate">{home.name}</p>
          <p className="truncate text-right">{away.name}</p>
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
            <a href={match.diskUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-accentYellow px-4 text-xs font-semibold tracking-[0.08em] text-app shadow-soft whitespace-nowrap">
              <Disc3 size={14} /> ДИСК
            </a>
          )}
          {match.broadcastUrl && (
            <a href={match.broadcastUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-xl bg-accentYellow px-4 text-xs font-semibold tracking-[0.08em] text-app shadow-soft whitespace-nowrap">
              <Radio size={14} /> СМОТРЕТЬ ТРАНСЛЯЦИЮ
            </a>
          )}
        </div>
      </div>
      {goalStatus && <p className="rounded-xl border border-borderSubtle bg-panelBg px-3 py-2 text-xs text-textMuted">{goalStatus}</p>}
      {cardsStatus && <p className="rounded-xl border border-borderSubtle bg-panelBg px-3 py-2 text-xs text-textMuted">{cardsStatus}</p>}
      {goalEditorOpen && (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-borderSubtle bg-panelBg p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-textPrimary">Изменение счета</p>
              <button type="button" className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textSecondary" onClick={() => setGoalEditorOpen(false)}>Закрыть</button>
            </div>
            <div className="grid gap-2">
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
                {candidatePlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
              </select>
              <label className="space-y-1 text-xs text-textMuted">
                Минута гола
                <input type="number" min={0} max={120} value={goalMinuteDraft} onChange={(event) => setGoalMinuteDraft(event.target.value)} disabled={goalMinuteAuto} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm text-textPrimary disabled:opacity-60" />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs text-textMuted">
                Без указания минуты
                <input type="checkbox" checked={goalMinuteAuto} onChange={(event) => setGoalMinuteAuto(event.target.checked)} />
              </label>
              <div className="flex gap-2">
                <button type="button" disabled={!goalTeamId || !goalScorerId} className="w-full rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={() => { setGoalAction('add'); setGoalConfirmOpen(true) }}>Добавить</button>
                <button type="button" disabled={!goalTeamId || !goalScorerId} className="w-full rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50" onClick={() => { setGoalAction('remove_selected'); setGoalConfirmOpen(true) }}>Убавить</button>
              </div>
              <button
                type="button"
                disabled={!lastGoalEvent}
                className="w-full rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50"
                onClick={() => { setGoalAction('remove_last'); setGoalConfirmOpen(true) }}
              >
                Убавить последний гол {lastGoalTeamShortName}
              </button>
            </div>
          </div>
        </section>
      )}
      {goalConfirmOpen && (
        <section className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-borderSubtle bg-panelBg p-4">
            <p className="text-sm font-semibold text-textPrimary">Подтвердить изменение счета</p>
            <p className="mt-1 text-xs text-textMuted">
              {goalAction === 'add' && 'Добавить гол выбранной команде?'}
              {goalAction === 'remove_selected' && 'Убрать гол у выбранной команды и выбранного игрока?'}
              {goalAction === 'remove_last' && `Убрать последний гол (${lastGoalTeamShortName})?`}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app" onClick={async () => {
                const applyScoreDelta = (baseScore: { home: number; away: number }, teamId: string, delta: 1 | -1) => (
                  teamId === home.id
                    ? { home: Math.max(0, baseScore.home + delta), away: baseScore.away }
                    : { home: baseScore.home, away: Math.max(0, baseScore.away + delta) }
                )

                const result = (() => {
                  if (goalAction === 'add') {
                    const manualMinute = Number(goalMinuteDraft)
                    const selectedMinute = goalMinuteAuto
                      ? 0
                      : (Number.isFinite(manualMinute) && manualMinute >= 0 ? manualMinute : (liveMinute ?? 0))
                    const createdEvent = {
                      id: `goal_${Date.now()}`,
                      minute: Math.max(0, selectedMinute),
                      type: 'goal',
                      teamId: goalTeamId,
                      playerId: goalScorerId,
                      assistPlayerId: goalAssistId || undefined,
                      note: goalAssistId ? `ассист: ${goalAssistId}` : undefined,
                    } satisfies Match['events'][number]
                    return {
                      nextEvents: [...localEvents, createdEvent],
                      nextScore: applyScoreDelta(effectiveScore, goalTeamId, 1),
                      notFoundMessage: null,
                    }
                  }

                  const targetEvent = goalAction === 'remove_last'
                    ? [...localEvents].reverse().find((event) => event.type === 'goal' && event.teamId)
                    : [...localEvents].reverse().find((event) => event.type === 'goal' && event.teamId === goalTeamId && event.playerId === goalScorerId)

                  if (!targetEvent?.teamId) {
                    return {
                      nextEvents: localEvents,
                      nextScore: effectiveScore,
                      notFoundMessage: goalAction === 'remove_last'
                        ? 'Не найден последний гол для удаления.'
                        : 'Не найден гол выбранного игрока для удаления.',
                    }
                  }

                  const idx = localEvents.findIndex((event) => event.id === targetEvent.id)
                  const trimmedEvents = idx >= 0 ? localEvents.filter((_, eventIdx) => eventIdx !== idx) : localEvents
                  return {
                    nextEvents: trimmedEvents,
                    nextScore: applyScoreDelta(effectiveScore, targetEvent.teamId, -1),
                    notFoundMessage: null,
                  }
                })()

                if (result.notFoundMessage) {
                  setGoalStatus(result.notFoundMessage)
                  setGoalConfirmOpen(false)
                  return
                }

                const nextEvents = result.nextEvents
                const nextScore = result.nextScore
                setScoreDraft(nextScore)
                setLocalEvents(nextEvents)
                try {
                  await matchesRepository.updateMatch?.(match.id, { homeScore: nextScore.home, awayScore: nextScore.away, matchEvents: nextEvents })
                  setGoalStatus('Счет сохранен.')
                } catch (error) {
                  setGoalStatus(actionError(error))
                } finally {
                  setGoalConfirmOpen(false)
                  setGoalEditorOpen(false)
                }
              }}>Подтвердить</button>
              <button type="button" className="rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={() => setGoalConfirmOpen(false)}>Отмена</button>
            </div>
          </div>
        </section>
      )}
      {cardsEditorOpen && (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-borderSubtle bg-panelBg p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-textPrimary">Карточки</p>
              <button type="button" className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textSecondary" onClick={() => setCardsEditorOpen(false)}>Закрыть</button>
            </div>
            <div className="grid gap-2">
              <select value={cardsTeamId} onChange={(event) => { setCardsTeamId(event.target.value); setCardsPlayerId('') }} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
                <option value="">Выберите команду</option>
                <option value={home.id}>{home.name}</option>
                <option value={away.id}>{away.name}</option>
              </select>
              <select value={cardsPlayerId} onChange={(event) => setCardsPlayerId(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm" disabled={!cardsTeamId}>
                <option value="">Игрок</option>
                {cardCandidatePlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
              </select>
              <label className="space-y-1 text-xs text-textMuted">
                Минута карточки
                <input type="number" min={0} max={120} value={cardsMinuteDraft} onChange={(event) => setCardsMinuteDraft(event.target.value)} disabled={cardsMinuteAuto} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm text-textPrimary disabled:opacity-60" />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs text-textMuted">
                Без указания минуты
                <input type="checkbox" checked={cardsMinuteAuto} onChange={(event) => setCardsMinuteAuto(event.target.checked)} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!cardsTeamId || !cardsPlayerId} className="rounded-lg border border-amber-400/60 bg-amber-400/15 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-50" onClick={() => { setCardsAction('add_yellow'); setCardCreateEvent(true); setCardsConfirmOpen(true) }}>Желтая</button>
                <button type="button" disabled={!cardsTeamId || !cardsPlayerId} className="rounded-lg border border-rose-400/60 bg-rose-400/15 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-50" onClick={() => { setCardsAction('add_red'); setCardCreateEvent(true); setCardsConfirmOpen(true) }}>Красная</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!cardsTeamId || !cardsPlayerId} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50" onClick={() => { setCardsAction('remove_yellow'); setCardCreateEvent(false); setCardsConfirmOpen(true) }}>Отменить желтую</button>
                <button type="button" disabled={!cardsTeamId || !cardsPlayerId} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50" onClick={() => { setCardsAction('remove_red'); setCardCreateEvent(false); setCardsConfirmOpen(true) }}>Отменить красную</button>
              </div>
            </div>
          </div>
        </section>
      )}
      {cardsConfirmOpen && (
        <section className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-borderSubtle bg-panelBg p-4">
            <p className="text-sm font-semibold text-textPrimary">Подтвердить карточку</p>
            <p className="mt-1 text-xs text-textMuted">
              {cardsAction === 'add_yellow' && 'Выдать желтую карточку выбранному игроку?'}
              {cardsAction === 'add_red' && 'Выдать красную карточку выбранному игроку?'}
              {cardsAction === 'remove_yellow' && 'Отменить последнюю желтую карточку выбранного игрока?'}
              {cardsAction === 'remove_red' && 'Отменить последнюю красную карточку выбранного игрока?'}
            </p>
            {(cardsAction === 'add_yellow' || cardsAction === 'add_red') && (
              <label className="mt-3 flex items-center justify-between rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs text-textSecondary">
                Создать событие в ленте матча
                <input type="checkbox" checked={cardCreateEvent} onChange={(event) => setCardCreateEvent(event.target.checked)} />
              </label>
            )}
            <div className="mt-3 flex gap-2">
              <button type="button" className="rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app" onClick={async () => {
                const cardType = cardsAction === 'add_yellow' || cardsAction === 'remove_yellow' ? 'yellow_card' : 'red_card'
                const isAdd = cardsAction === 'add_yellow' || cardsAction === 'add_red'
                const minuteBase = localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : 0
                const linkedEventId = `link_${Date.now()}`
                const manualMinute = Number(cardsMinuteDraft)
                const selectedMinute = cardsMinuteAuto
                  ? 0
                  : (Number.isFinite(manualMinute) && manualMinute >= 0 ? manualMinute : (liveMinute ?? minuteBase))

                const result = (() => {
                  if (isAdd) {
                    const createdCard = {
                      id: `card_${Date.now()}`,
                      minute: Math.max(0, selectedMinute),
                      type: cardType,
                      teamId: cardsTeamId,
                      playerId: cardsPlayerId,
                      linkedEventId: cardCreateEvent ? linkedEventId : undefined,
                      note: cardType === 'yellow_card' ? 'Желтая карточка' : 'Красная карточка',
                    } satisfies Match['events'][number]
                    return { nextEvents: [...localEvents, createdCard], status: null as string | null, createdCard }
                  }
                  const toRemove = [...localEvents].reverse().find((event) => event.type === cardType && event.teamId === cardsTeamId && event.playerId === cardsPlayerId)
                  if (!toRemove) return { nextEvents: localEvents, status: 'Карточек для отмены не найдено.', createdCard: null }
                  const idx = localEvents.findIndex((event) => event.id === toRemove.id)
                  return { nextEvents: idx >= 0 ? localEvents.filter((_, eventIdx) => eventIdx !== idx) : localEvents, status: null, createdCard: null }
                })()

                if (result.status) {
                  setCardsStatus(result.status)
                  setCardsConfirmOpen(false)
                  return
                }

                setLocalEvents(result.nextEvents)
                try {
                  await matchesRepository.updateMatch?.(match.id, { homeScore: effectiveScore.home, awayScore: effectiveScore.away, matchEvents: result.nextEvents })
                  if (cardCreateEvent && result.createdCard) {
                    const actor = players.find((player) => player.id === cardsPlayerId)?.displayName ?? `Игрок #${cardsPlayerId}`
                    await eventsRepository.createEventForScope?.({
                      scopeType: 'match',
                      scopeId: match.id,
                      title: cardType === 'yellow_card' ? 'Желтая карточка' : 'Красная карточка',
                      summary: `${actor} • ${result.createdCard.minute}′`,
                      body: `${actor} получил ${cardType === 'yellow_card' ? 'желтую' : 'красную'} карточку на ${result.createdCard.minute}-й минуте.`,
                    })
                  }
                  setCardsStatus('Карточки сохранены.')
                } catch (error) {
                  setCardsStatus(actionError(error))
                } finally {
                  setCardsConfirmOpen(false)
                  setCardsEditorOpen(false)
                }
              }}>Подтвердить</button>
              <button type="button" className="rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={() => setCardsConfirmOpen(false)}>Отмена</button>
            </div>
          </div>
        </section>
      )}
      {matchControlOpen && (
        <section className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-borderSubtle bg-panelBg p-4">
            <p className="text-sm font-semibold text-textPrimary">Управление матчем</p>
            <p className="mt-1 text-xs text-textMuted">Текущий статус: {statusLabel[match.status]}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={matchFlowPending || match.status === 'live'}
                className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50"
                onClick={async () => {
                  setMatchFlowPending(true)
                  try {
                    const hasStartEvent = localEvents.some((event) => event.id === `auto_start_${match.id}`)
                    const minuteBase = localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : 0
                    const nextEvents = hasStartEvent ? localEvents : [...localEvents, { id: `auto_start_${match.id}`, minute: minuteBase + 1, type: 'substitution', note: 'Система: матч начался' } satisfies Match['events'][number]]
                    await matchesRepository.updateMatch?.(match.id, {
                      status: 'live',
                      homeScore: effectiveScore.home,
                      awayScore: effectiveScore.away,
                      currentMinute: Math.max(1, liveMinute ?? 1),
                      clockAnchorAt: new Date().toISOString(),
                      matchEvents: nextEvents,
                    })
                    setLocalEvents(nextEvents)
                    setGoalStatus('Матч переведен в LIVE.')
                    setMatchControlOpen(false)
                  } catch (error) {
                    setGoalStatus(actionError(error))
                  } finally {
                    setMatchFlowPending(false)
                  }
                }}
              >
                Начать матч
              </button>
              <button
                type="button"
                disabled={matchFlowPending || match.status === 'finished'}
                className="rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50"
                onClick={async () => {
                  setMatchFlowPending(true)
                  try {
                    const hasEndEvent = localEvents.some((event) => event.id === `auto_end_${match.id}`)
                    const minuteBase = localEvents.length ? Math.max(...localEvents.map((event) => event.minute)) : 0
                    const nextEvents = hasEndEvent ? localEvents : [...localEvents, { id: `auto_end_${match.id}`, minute: Math.max(90, minuteBase + 1), type: 'substitution', note: 'Система: матч завершен' } satisfies Match['events'][number]]
                    await matchesRepository.updateMatch?.(match.id, {
                      status: 'finished',
                      homeScore: effectiveScore.home,
                      awayScore: effectiveScore.away,
                      currentMinute: Math.max(liveMinute ?? 0, match.currentMinute ?? 0),
                      clockAnchorAt: null,
                      matchEvents: nextEvents,
                    })
                    setLocalEvents(nextEvents)
                    setGoalStatus('Матч завершен.')
                    setMatchControlOpen(false)
                  } catch (error) {
                    setGoalStatus(actionError(error))
                  } finally {
                    setMatchFlowPending(false)
                  }
                }}
              >
                Завершить матч
              </button>
              <button
                type="button"
                disabled={matchFlowPending || match.status !== 'live'}
                className="rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50"
                onClick={async () => {
                  setMatchFlowPending(true)
                  try {
                    await matchesRepository.updateMatch?.(match.id, {
                      status: 'half_time',
                      homeScore: effectiveScore.home,
                      awayScore: effectiveScore.away,
                      currentMinute: Math.max(liveMinute ?? 0, match.currentMinute ?? 0),
                      clockAnchorAt: null,
                    })
                    setGoalStatus('Перерыв начат.')
                    setMatchControlOpen(false)
                  } catch (error) {
                    setGoalStatus(actionError(error))
                  } finally {
                    setMatchFlowPending(false)
                  }
                }}
              >
                Начать перерыв
              </button>
              <button
                type="button"
                disabled={matchFlowPending || match.status !== 'half_time'}
                className="rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50"
                onClick={async () => {
                  setMatchFlowPending(true)
                  try {
                    await matchesRepository.updateMatch?.(match.id, {
                      status: 'live',
                      homeScore: effectiveScore.home,
                      awayScore: effectiveScore.away,
                      currentMinute: Math.max(liveMinute ?? 0, match.currentMinute ?? 0),
                      clockAnchorAt: new Date().toISOString(),
                    })
                    setGoalStatus('Перерыв завершен, матч продолжен.')
                    setMatchControlOpen(false)
                  } catch (error) {
                    setGoalStatus(actionError(error))
                  } finally {
                    setMatchFlowPending(false)
                  }
                }}
              >
                Закончить перерыв
              </button>
            </div>
            <button type="button" className="mt-3 rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={() => setMatchControlOpen(false)}>Закрыть</button>
          </div>
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
            setEditableStartAt(toMskDateTimeInput(match.date, match.time))
            setEditableBroadcastUrl(match.broadcastUrl ?? '')
            setEditableDiskUrl(match.diskUrl ?? '')
            setEditableCurrentMinute(String(liveMinute ?? match.currentMinute ?? 0))
            setMetadataStatus(null)
            setIsInfoEditing(true)
          }}
          onCancelEdit={() => {
            setIsInfoEditing(false)
            setMetadataStatus(null)
          }}
          actions={<Info size={14} className="text-accentYellow" />}
        />
        {!isInfoEditing ? (
          <div className="grid gap-2 text-sm text-textSecondary sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Статус:</span> {statusLabel[match.status]}</div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Этап:</span> <span className="text-textPrimary">{match.stage || '—'}</span></div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Тур:</span> <span className="text-textPrimary">{match.tour || match.round || '—'}</span></div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Судья:</span> <span className="text-textPrimary">{match.referee || '—'}</span></div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Стадион:</span> <span className="text-textPrimary">{match.venue || '—'}</span></div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Старт (МСК):</span> <span className="text-textPrimary">{toMskDateTimeInput(match.date, match.time).replace('T', ' ')}</span></div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Трансляция:</span> <span className="text-textPrimary">{match.broadcastUrl || '—'}</span></div>
            <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Диск:</span> <span className="text-textPrimary">{match.diskUrl || '—'}</span></div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1 text-xs text-textMuted">
                Этап
                <input value={editableStage} onChange={(event) => setEditableStage(event.target.value)} placeholder="Например: Полуфинал" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
              <label className="space-y-1 text-xs text-textMuted">
                Тур / стадия
                <input value={editableTour} onChange={(event) => setEditableTour(event.target.value)} placeholder="Например: 5 тур" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
              <label className="space-y-1 text-xs text-textMuted">
                Судья
                <input value={editableReferee} onChange={(event) => setEditableReferee(event.target.value)} placeholder="Имя судьи" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
              <label className="space-y-1 text-xs text-textMuted">
                Старт (МСК)
                <input type="datetime-local" value={editableStartAt} onChange={(event) => setEditableStartAt(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
              <label className="space-y-1 text-xs text-textMuted">
                Текущая минута
                <input type="number" min={0} max={120} value={editableCurrentMinute} onChange={(event) => setEditableCurrentMinute(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
            </div>
            <label className="space-y-1 text-xs text-textMuted">
              Стадион / площадка
              <input value={editableVenue} onChange={(event) => setEditableVenue(event.target.value)} placeholder="Название арены" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1 text-xs text-textMuted">
                Трансляция
                <input value={editableBroadcastUrl} onChange={(event) => setEditableBroadcastUrl(event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
              <label className="space-y-1 text-xs text-textMuted">
                Диск
                <input value={editableDiskUrl} onChange={(event) => setEditableDiskUrl(event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary" />
              </label>
            </div>
          </div>
        )}
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
                startAt: fromMskDateTimeInput(editableStartAt) ?? `${match.date}T${match.time}:00Z`,
                currentMinute: Math.max(0, Number(editableCurrentMinute) || 0),
                stage: editableStage.trim(),
                tour: editableTour.trim(),
                referee: editableReferee.trim(),
                broadcastUrl: editableBroadcastUrl.trim(),
                diskUrl: editableDiskUrl.trim(),
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
        <div className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary">
          <Timer size={15} className="text-accentYellow" /> История матча
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 rounded-xl border border-borderSubtle bg-mutedBg p-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-textMuted">{home.shortName}</p>
            {historyHome.length === 0 ? (
              <p className="px-1 text-xs text-textMuted">—</p>
            ) : historyHome.map((event) => (
              <div key={event.id} className="flex items-center gap-1.5 px-1 text-xs text-textPrimary">
                <span>{matchHistoryIcon[event.type as 'goal' | 'yellow_card' | 'red_card']}</span>
                <span>{getPlayerLastName(playersById[event.playerId ?? '']?.displayName)}</span>
                {event.minute > 0 && <span className="text-textMuted">{event.minute}′</span>}
              </div>
            ))}
          </div>
          <div className="space-y-1 rounded-xl border border-borderSubtle bg-mutedBg p-2">
            <p className="px-1 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-textMuted">{away.shortName}</p>
            {historyAway.length === 0 ? (
              <p className="px-1 text-right text-xs text-textMuted">—</p>
            ) : historyAway.map((event) => (
              <div key={event.id} className="flex items-center justify-end gap-1.5 px-1 text-xs text-textPrimary">
                {event.minute > 0 && <span className="text-textMuted">{event.minute}′</span>}
                <span>{getPlayerLastName(playersById[event.playerId ?? '']?.displayName)}</span>
                <span>{matchHistoryIcon[event.type as 'goal' | 'yellow_card' | 'red_card']}</span>
              </div>
            ))}
          </div>
        </div>
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
        {latestEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-4 text-sm text-textMuted">Пока тишина...</p>
        ) : (
          <div className="space-y-2">
            {latestEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 rounded-xl border border-borderSubtle bg-mutedBg px-3 py-2 text-sm">
                <span className="shrink-0 rounded-md border border-borderSubtle bg-panelBg px-2 py-1 text-[11px] tabular-nums text-textMuted">{event.minute}′</span>
                <span className="truncate text-textPrimary">{event.note?.trim() || event.type}</span>
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

      {playoffModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-borderStrong bg-panelBg p-3 shadow-matte">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-textPrimary">Выбор плейофф</h3>
              <button type="button" onClick={() => setPlayoffModalOpen(false)} className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textSecondary">Закрыть</button>
            </div>
            {currentPlayoffCell && (
              <p className="mt-2 text-xs text-textSecondary">Текущая ячейка: #{currentPlayoffCell.id} ({currentPlayoffCell.col}:{currentPlayoffCell.row})</p>
            )}
            {playoffLoading && <p className="mt-2 text-xs text-textMuted">Загрузка...</p>}
            {!playoffLoading && (
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                {playoffCandidates.map((cell) => (
                  <button
                    key={cell.id}
                    type="button"
                    onClick={() => setSelectedPlayoffId(cell.id)}
                    className={`w-full rounded-lg border px-2 py-2 text-left text-xs ${selectedPlayoffId === cell.id ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textSecondary'}`}
                  >
                    #{cell.id} • {cell.col}:{cell.row}
                  </button>
                ))}
                {!playoffCandidates.length && <p className="text-xs text-textMuted">Подходящие ячейки не найдены.</p>}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!selectedPlayoffId}
                className="rounded-lg bg-accentYellow px-2 py-2 text-xs font-semibold text-app disabled:opacity-50"
                onClick={async () => {
                  if (!selectedPlayoffId) return
                  setPlayoffStatus(null)
                  try {
                    await playoffGridRepository.attachMatch(selectedPlayoffId, match.id)
                    await refreshAfterPlayoffAction()
                    setPlayoffStatus('Матч прикреплен')
                  } catch (error) {
                    setPlayoffStatus(actionError(error))
                  }
                }}
              >
                Прикрепить
              </button>
              <button
                type="button"
                disabled={!match.playoffCellId}
                className="rounded-lg border border-borderSubtle px-2 py-2 text-xs text-textSecondary disabled:opacity-50"
                onClick={async () => {
                  if (!match.playoffCellId) return
                  setPlayoffStatus(null)
                  try {
                    await playoffGridRepository.detachMatch(match.playoffCellId, match.id)
                    await refreshAfterPlayoffAction()
                    setPlayoffStatus('Связь удалена')
                  } catch (error) {
                    setPlayoffStatus(actionError(error))
                  }
                }}
              >
                Открепить
              </button>
            </div>
            {playoffStatus && <p className="mt-2 text-xs text-textMuted">{playoffStatus}</p>}
          </div>
        </div>
      )}
      {archiveConfirmOpen && (
        <section className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-borderSubtle bg-panelBg p-4">
            <p className="text-sm font-semibold text-textPrimary">{match.archived ? 'Вернуть матч из архива?' : 'Скрыть матч и отправить в архив?'}</p>
            <p className="mt-1 text-xs text-textMuted">{match.archived ? 'Матч снова появится в обычных лентах и статистике.' : 'Матч исчезнет из обычных лент, истории и статистики.'}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={archivePending}
                className="rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app disabled:opacity-50"
                onClick={async () => {
                  setArchivePending(true)
                  try {
                    if (!match.archived && match.playoffCellId) await playoffGridRepository.detachMatch(match.playoffCellId, match.id)
                    await matchesRepository.updateMatch?.(match.id, {
                      archived: !match.archived,
                      clockAnchorAt: null,
                      currentMinute: match.currentMinute ?? liveMinute ?? 0,
                      status: match.archived ? match.status : 'finished',
                    })
                    setGoalStatus(match.archived ? 'Матч возвращен из архива.' : 'Матч отправлен в архив.')
                    setArchiveConfirmOpen(false)
                    if (!match.archived) navigate('/matches')
                  } catch (error) {
                    setGoalStatus(actionError(error))
                  } finally {
                    setArchivePending(false)
                  }
                }}
              >
                Подтвердить
              </button>
              <button type="button" className="rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={() => setArchiveConfirmOpen(false)}>Отмена</button>
            </div>
          </div>
        </section>
      )}

      <CommentsSection entityType="match" entityId={match.id} title="Комментарии" />
      {isAdmin && (
        <section className="mt-3 rounded-2xl border border-borderSubtle bg-panelBg p-3 shadow-soft">
          <div className="space-y-2">
            <button type="button" onClick={() => { void openPlayoffModal() }} className="inline-flex w-full justify-center rounded-xl bg-accentYellow px-4 py-2 text-xs font-semibold text-app shadow-soft">
              Добавить плейофф
            </button>
            <button type="button" onClick={() => setArchiveConfirmOpen(true)} className={`inline-flex w-full justify-center rounded-xl px-4 py-2 text-xs font-semibold shadow-soft ${match.archived ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'border border-borderSubtle bg-panelBg text-textPrimary'}`}>
              {match.archived ? 'Вернуть из архива' : 'Скрыть матч'}
            </button>
          </div>
        </section>
      )}

    </PageContainer>
  )
}
