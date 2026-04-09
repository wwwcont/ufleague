import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { HomeSummary } from '../../features/home/HomeSummary'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'

export const HomePage = () => {
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const liveAndUpcoming = (matchList ?? []).filter((m) => m.status === 'live' || m.status === 'scheduled').slice(0, 4)

  return (
    <PageContainer>
      <HomeSummary />

      <Link to="/search" className="mt-4 flex w-full items-center gap-2 rounded-2xl bg-gradient-to-r from-accentYellow/20 to-transparent px-4 py-3 text-sm font-medium text-textSecondary hover:text-textPrimary">
        <Search size={16} className="text-accentYellow" />
        ПОИСК КОМАНД, ИГРОКОВ И МАТЧЕЙ
      </Link>

      <SectionHeader title="LIVE / ПРЕДСТОЯЩИЕ" />
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
