import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEvents } from '../../hooks/data/useEvents'

export const HomePage = () => {
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const { data: events } = useEvents()

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const liveAndUpcoming = (matchList ?? []).filter((m) => m.status === 'live' || m.status === 'scheduled').slice(0, 5)
  const recentEvents = (events ?? []).slice(0, 3)

  return (
    <>
      <div className="fixed inset-x-0 top-16 z-30 mx-auto w-full max-w-5xl px-4 md:px-6">
        <Link to="/search" className="flex items-center gap-2 rounded-2xl bg-app/65 px-4 py-2.5 text-sm text-textSecondary shadow-surface backdrop-blur-md hover:text-textPrimary" aria-label="Открыть поиск">
          <Search size={15} className="text-accentYellow" />
          <span className="text-textMuted/70">Поиск по турниру</span>
        </Link>
      </div>

      <PageContainer>
        <div className="h-12" />

        <SectionHeader title="События / Новости" action={<Link to="/events" className="text-sm text-accentYellow">ВСЕ</Link>} />
        <div className="space-y-2">
          {recentEvents.map((item) => (
            <Link key={item.id} to={`/events/${item.id}`} className="matte-panel block px-4 py-3">
              <p className="text-base text-textPrimary">{item.title}</p>
              <p className="mt-1 text-sm text-textMuted">{item.date} • {item.author}</p>
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
    </>
  )
}
