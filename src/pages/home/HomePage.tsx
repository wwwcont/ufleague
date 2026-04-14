import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEvents } from '../../hooks/data/useEvents'
import { formatTimeOnlyMsk } from '../../lib/date-time'

export const HomePage = () => {
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const { data: events, isLoading: eventsLoading } = useEvents({ entityType: 'global', limit: 3 })

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const liveAndUpcoming = (matchList ?? []).filter((m) => m.status === 'live' || m.status === 'scheduled').slice(0, 5)
  const visibleEvents = useMemo(() => events ?? [], [events])

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

      <SectionHeader title="LIVE / Предстоящие" action={<Link to="/matches" className="text-sm text-accentYellow">ВСЕ</Link>} />
      {liveAndUpcoming.length === 0 || !teams ? (
        <EmptyState title="Матчи не найдены" />
      ) : (
        <div className="space-y-2">
          {liveAndUpcoming.map((match) => (
            <MatchCard key={match.id} match={match} home={teamMap[match.homeTeamId]} away={teamMap[match.awayTeamId]} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
