import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { Info, NotebookText, Pencil, PlusCircle, Timer, Users, Wrench } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useTeams } from '../../hooks/data/useTeams'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useEvents } from '../../hooks/data/useEvents'
import { EmptyState } from '../../components/ui/EmptyState'
import { Scoreboard } from '../../components/data-display/Scoreboard'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { tournament } from '../../mocks/data/tournament'
import { CommentsSection } from '../../components/comments'
import { EventFeedSection } from '../../components/events'
import { EntityReactions } from '../../components/ui/EntityReactions'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { canManageMatch } from '../../domain/services/accessControl'

const statusLabel: Record<string, string> = {
  scheduled: 'По расписанию',
  live: 'Идет матч',
  half_time: 'Перерыв',
  finished: 'Завершен',
}

const eventTypeLabel: Record<string, string> = {
  goal: 'Гол',
  yellow_card: 'Желтая карточка',
  red_card: 'Красная карточка',
  substitution: 'Замена',
}

const eventTypeTone: Record<string, string> = {
  goal: 'text-accentYellow',
  yellow_card: 'text-yellow-300',
  red_card: 'text-red-400',
  substitution: 'text-textSecondary',
}

const formatMatchDate = (date: string, time: string) => {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year} • ${time}`
}

const EventRow = ({
  minute,
  type,
  teamName,
  player,
  note,
}: {
  minute: number
  type: string
  teamName: string
  player: string
  note?: string
}) => (
  <li className="rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3">
    <div className="grid gap-2 sm:grid-cols-[54px_1fr_auto] sm:items-center sm:gap-3">
      <div className="text-sm font-semibold tabular-nums text-textPrimary">{minute}′</div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${eventTypeTone[type] ?? 'text-textPrimary'}`}>{eventTypeLabel[type] ?? type}</p>
        <p className="truncate text-sm text-textSecondary">{player} · {teamName}</p>
        {note && <p className="mt-1 text-xs text-textMuted">{note}</p>}
      </div>
      <div className="flex items-center gap-2 text-xs text-textMuted">
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-2 py-1 hover:border-borderStrong">
          <Pencil size={12} /> edit
        </button>
        <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-2 py-1 hover:border-borderStrong">
          <PlusCircle size={12} /> add
        </button>
      </div>
    </div>
  </li>
)

export const MatchDetailsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { data: matchFeed } = useEvents({ entityType: 'match', entityId: matchId, limit: 4 })
  const { session } = useSession()
  const { matchesRepository, eventsRepository } = useRepositories()

  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const playerMap = Object.fromEntries((players ?? []).map((player) => [player.id, player]))

  const home = match ? teamMap[match.homeTeamId] : null
  const away = match ? teamMap[match.awayTeamId] : null

  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [venue, setVenue] = useState('')
  const [nextStatus, setNextStatus] = useState(match?.status ?? 'scheduled')
  const [adminStatus, setAdminStatus] = useState<string | null>(null)

  if (!match || !teams || !home || !away) {
    return (
      <PageContainer>
        <EmptyState title="Матч не найден" />
      </PageContainer>
    )
  }

  const isAdmin = canManageMatch(session)
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 403) return 'Недостаточно прав для admin match actions (403).'
      if (error.status === 429) return 'Слишком частые запросы (429).'
      return `Ошибка API ${error.status}: ${error.message}`
    }
    return error instanceof Error ? error.message : 'Не удалось выполнить admin action'
  }

  const homePlayers = (players ?? []).filter((item) => item.teamId === home.id)
  const awayPlayers = (players ?? []).filter((item) => item.teamId === away.id)

  const startersHome = homePlayers.slice(0, 2)
  const benchHome = homePlayers.slice(2)
  const startersAway = awayPlayers.slice(0, 2)
  const benchAway = awayPlayers.slice(2)

  return (
    <PageContainer>
      <Scoreboard match={match} home={home} away={away} tournamentLogoUrl={tournament.logoUrl} />
      <div className="flex justify-end">
        <EntityReactions entityKey={`match:${match.id}`} />
      </div>

      {isAdmin && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Редактирование матча</h2>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-xs text-textSecondary space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <input value={homeScore} onChange={(e) => setHomeScore(e.target.value)} placeholder="home" className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <input value={awayScore} onChange={(e) => setAwayScore(e.target.value)} placeholder="away" className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="venue" className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            </div>
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as typeof nextStatus)} className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">
              {(['scheduled', 'live', 'half_time', 'finished'] as const).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button
              type="button"
              className="rounded-lg bg-accentYellow px-3 py-1 font-semibold text-app"
              onClick={async () => {
                try {
                  await matchesRepository.updateMatch?.(match.id, {
                    homeScore: homeScore ? Number(homeScore) : match.score.home,
                    awayScore: awayScore ? Number(awayScore) : match.score.away,
                    venue: venue || match.venue,
                    status: nextStatus,
                  })
                  setAdminStatus('Match updated')
                } catch (error) {
                  setAdminStatus(actionError(error))
                }
              }}
            >
              Update score/venue
            </button>
            <button
              type="button"
              className="rounded-lg border border-borderSubtle px-3 py-1"
              onClick={async () => {
                try {
                  await eventsRepository.createEventForScope?.({ scopeType: 'match', scopeId: match.id, title: `Match ${match.id} update`, body: 'Admin match event placeholder.' })
                  setAdminStatus('Match event создан')
                } catch (error) {
                  setAdminStatus(actionError(error))
                }
              }}
            >
              Add match event
            </button>
            <p className="text-[11px] text-textMuted">Match timeline event-management (goal/card/substitution CRUD) пока staged placeholder до расширения backend endpointов.</p>
            {adminStatus && <p className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">{adminStatus}</p>}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg px-4 py-3 shadow-soft">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-textPrimary">
          <Info size={14} className="text-accentYellow" /> Quick match info
        </div>
        <div className="grid gap-2 text-sm text-textSecondary sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Статус:</span> {statusLabel[match.status]}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Тур:</span> {match.round}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Venue:</span> {match.venue}</div>
          <div className="rounded-lg border border-dashed border-borderStrong bg-mutedBg px-3 py-2"><span className="text-textMuted">Доп. время:</span> +0′ (placeholder)</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">ID матча:</span> {match.id}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Timer size={15} className="text-accentYellow" /> Timeline / match events</h2>
          <span className="rounded-lg border border-dashed border-borderStrong px-2 py-1 text-xs text-textMuted">future admin/captain actions</span>
        </div>

        {match.events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-4 py-8 text-center text-sm text-textMuted">
            Пока нет событий матча. После старта игры здесь появятся минуты, тип события, игрок и команда.
          </div>
        ) : (
          <ul className="space-y-2">
            {match.events
              .slice()
              .sort((a, b) => a.minute - b.minute)
              .map((event) => {
                const team = event.teamId ? teamMap[event.teamId] : undefined
                const player = event.playerId ? playerMap[event.playerId] : undefined

                return (
                  <EventRow
                    key={event.id}
                    minute={event.minute}
                    type={event.type}
                    teamName={team?.shortName ?? 'Команда'}
                    player={player?.displayName ?? 'Игрок не указан'}
                    note={event.note}
                  />
                )
              })}
          </ul>
        )}
      </section>

      <EventFeedSection title="Match public events" events={matchFeed ?? []} layout="timeline" messageWhenEmpty="Публичные события матча пока не опубликованы." />

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> Squads / lineups</h2>

        <div className="grid gap-3 lg:grid-cols-2">
          {[
            { team: home, starters: startersHome, bench: benchHome },
            { team: away, starters: startersAway, bench: benchAway },
          ].map((block) => (
            <div key={block.team.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <div className="mb-2 flex items-center gap-2">
                <TeamAvatar team={block.team} fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-1.5" />
                <p className="text-sm font-semibold text-textPrimary">{block.team.name}</p>
              </div>

              <div className="mb-2">
                <p className="mb-1 text-xs uppercase tracking-[0.08em] text-textMuted">Starters</p>
                <div className="space-y-1">
                  {block.starters.map((player) => (
                    <p key={player.id} className="text-sm text-textSecondary">#{player.number} {player.displayName} · {player.position}</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase tracking-[0.08em] text-textMuted">Bench</p>
                <div className="space-y-1">
                  {block.bench.length === 0 ? (
                    <p className="text-sm text-textMuted">Будет заполнено после расширения данных состава.</p>
                  ) : (
                    block.bench.map((player) => (
                      <p key={player.id} className="text-sm text-textSecondary">#{player.number} {player.displayName} · {player.position}</p>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><NotebookText size={16} className="text-accentYellow" /> Match summary / notes</h2>
        <p className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-3 text-sm text-textSecondary">
          Summary slot: после интеграции аналитики здесь появится структурированный итог матча (ключевые фазы, xG, дисциплина, тактические заметки).
        </p>
      </section>

      <CommentsSection entityType="match" entityId={match.id} title="Match comments" />

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary shadow-soft">
        <p>Матч: <span className="text-textPrimary">{home.shortName} vs {away.shortName}</span></p>
        <p className="mt-1">Дата и время: <span className="text-textPrimary">{formatMatchDate(match.date, match.time)}</span></p>
        <div className="mt-2 flex gap-3 text-xs">
          <Link to={`/teams/${home.id}`} className="text-accentYellow hover:underline">Команда {home.shortName}</Link>
          <Link to={`/teams/${away.id}`} className="text-accentYellow hover:underline">Команда {away.shortName}</Link>
        </div>
      </section>
    </PageContainer>
  )
}
