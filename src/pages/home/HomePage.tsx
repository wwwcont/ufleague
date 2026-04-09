import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEvents } from '../../hooks/data/useEvents'
import { EventFeedSection } from '../../components/events'

export const HomePage = () => {
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const { data: events, isLoading: eventsLoading } = useEvents({ limit: 3 })

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const liveAndUpcoming = (matchList ?? []).filter((m) => m.status === 'live' || m.status === 'scheduled').slice(0, 5)

  return (
    <PageContainer>
      <Link to="/search" className="flex items-center gap-2 rounded-2xl border border-borderSubtle bg-panelBg px-4 py-2.5 text-sm text-textSecondary shadow-soft hover:text-textPrimary" aria-label="Открыть поиск">
        <Search size={15} className="text-accentYellow" />
        <span className="text-textMuted/70">Поиск по турниру</span>
      </Link>

        <SectionHeader title="События / Новости" action={<Link to="/events" className="text-sm text-accentYellow">ВСЕ</Link>} />
        {eventsLoading ? <p className="text-sm text-textMuted">Загрузка событий...</p> : <EventFeedSection title="Key tournament events" events={events ?? []} messageWhenEmpty="Ключевые события скоро появятся." />}

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
