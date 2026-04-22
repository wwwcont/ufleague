import { Link } from 'react-router-dom'
import { Search, UserCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEvents } from '../../hooks/data/useEvents'
import { formatTimeOnlyMsk } from '../../lib/date-time'
import type { Team } from '../../domain/entities/types'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useTopScorers } from '../../hooks/data/useTopScorers'
import { resolvePlayerDisplayName } from '../../domain/services/playerLeaderboard'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { sortMatchesByRelevance } from '../../domain/services/matchSorting'

const fallbackTeam = (id: string): Team => ({
  id,
  name: 'Команда',
  shortName: 'TBD',
  logoUrl: null,
  city: '',
  coach: '',
  group: '',
  form: [],
  statsSummary: {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  },
})

export const HomePage = () => {
  const [selectedMetric, setSelectedMetric] = useState<'goals' | 'assists'>('goals')
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { data: events, isLoading: eventsLoading } = useEvents({ entityType: 'global', limit: 3 })

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const playerMap = Object.fromEntries((players ?? []).map((player) => [player.id, player]))
  const liveAndUpcoming = sortMatchesByRelevance((matchList ?? []).filter((m) => m.status === 'live' || m.status === 'half_time' || m.status === 'scheduled')).slice(0, 5)
  const visibleEvents = useMemo(() => events ?? [], [events])
  const { data: topScorersData } = useTopScorers()
  const topScorers = useMemo(() => (topScorersData ?? []).slice(0, 3), [topScorersData])
  const topAssistants = useMemo(() => (topScorersData ?? [])
    .filter((row) => row.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.playerId.localeCompare(b.playerId))
    .slice(0, 3), [topScorersData])
  const topPlayers = selectedMetric === 'goals' ? topScorers : topAssistants

  return (
    <PageContainer>
      <Link to="/search" state={{ fromHome: true }} viewTransition className="home-search-trigger flex items-center gap-2 rounded-2xl border border-borderSubtle bg-panelBg px-4 py-2.5 text-sm text-textSecondary shadow-soft transition hover:-translate-y-0.5 hover:text-textPrimary" aria-label="Открыть поиск">
        <Search size={15} className="text-accentYellow" />
        <span className="text-textMuted/70">Поиск по турниру</span>
      </Link>

      <SectionHeader title="Главные события" action={<Link to="/events" className="text-sm text-accentYellow">ВСЕ</Link>} />
      <div className="space-y-1.5">
        {eventsLoading && <p className="text-sm text-textMuted">Загрузка событий...</p>}
        {!eventsLoading && visibleEvents.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="flex items-center gap-3 rounded-xl border border-borderSubtle bg-panelBg px-3 py-2 transition hover:border-borderStrong">
            <span className="shrink-0 rounded-md border border-borderSubtle bg-mutedBg px-2 py-1 text-[11px] tabular-nums text-textMuted">{formatTimeOnlyMsk(event.timestamp)}</span>
            <span className="truncate text-sm text-textPrimary">{event.title}</span>
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        <SectionHeader title="Топ игроков" action={<Link to={`/top-players?metric=${selectedMetric}`} className="text-sm text-accentYellow">ВСЕ</Link>} />
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-borderSubtle bg-panelBg p-1">
          <button
            type="button"
            onClick={() => setSelectedMetric('goals')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${selectedMetric === 'goals' ? 'bg-accentYellow text-app' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            Топ бомбардиров
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('assists')}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${selectedMetric === 'assists' ? 'bg-accentYellow text-app' : 'text-textSecondary hover:text-textPrimary'}`}
          >
            Топ ассистентов
          </button>
        </div>
        {topPlayers.length === 0 ? (
          <p className="rounded-xl border border-borderSubtle bg-panelBg px-3 py-2 text-sm text-textMuted">
            {selectedMetric === 'goals' ? 'Пока никто не забил.' : 'Пока нет ассистов.'}
          </p>
        ) : (
          topPlayers.map((row, index) => {
            const player = playerMap[row.playerId]
            const team = teamMap[row.teamId]
            if (!player || !team) return null

            return (
              <div key={`${selectedMetric}_${row.playerId}`} className="flex items-center gap-3 rounded-xl border border-borderSubtle bg-panelBg px-3 py-2">
                <span className="w-5 text-sm font-semibold tabular-nums text-textSecondary">{index + 1}</span>
                <Link to={`/players/${player.id}`} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-borderSubtle bg-panelSoft text-textMuted transition hover:border-borderStrong">
                  {player.avatar ? <img src={player.avatar} alt={resolvePlayerDisplayName(player)} className="h-full w-full object-cover" /> : <UserCircle2 size={18} />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/players/${player.id}`} className="block truncate text-sm font-medium text-textPrimary transition hover:text-accentYellow">
                    {resolvePlayerDisplayName(player)}
                  </Link>
                  <Link to={`/teams/${team.id}`} className="inline-flex items-center gap-1 text-xs text-textMuted transition hover:text-accentYellow">
                    <span>-</span>
                    <TeamAvatar team={team} size="sm" />
                    <span>{team.shortName}</span>
                  </Link>
                </div>
                <div className="text-right text-xs text-textSecondary">
                  {selectedMetric === 'goals' ? (
                    <>
                      <div><span className="text-textMuted">Г:</span> {row.goals}</div>
                      <div><span className="text-textMuted">А:</span> {row.assists}</div>
                    </>
                  ) : (
                    <>
                      <div><span className="text-textMuted">А:</span> {row.assists}</div>
                      <div><span className="text-textMuted">Г:</span> {row.goals}</div>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <SectionHeader title="LIVE / Предстоящие" action={<Link to="/matches" className="text-sm text-accentYellow">ВСЕ</Link>} />
      {liveAndUpcoming.length === 0 || !teams ? (
        <EmptyState title="Матчи не найдены" />
      ) : (
        <div className="space-y-2">
          {liveAndUpcoming.map((match) => (
            <MatchCard key={match.id} match={match} home={teamMap[match.homeTeamId] ?? fallbackTeam(match.homeTeamId)} away={teamMap[match.awayTeamId] ?? fallbackTeam(match.awayTeamId)} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
