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
  const featured = matchList?.find((m) => m.featured)
  const upcoming = matchList?.filter((m) => !m.featured).slice(0, 2) ?? []

  return (
    <PageContainer>
      <HomeSummary />

      <SectionHeader title="Featured Match" />
      {!featured || !teams ? (
        <EmptyState title="No featured match" />
      ) : (
        <MatchCard match={featured} home={teamMap[featured.homeTeamId]} away={teamMap[featured.awayTeamId]} />
      )}

      <SectionHeader title="Next Matches" />
      <div className="space-y-3">
        {upcoming.map((match) => (
          <MatchCard key={match.id} match={match} home={teamMap[match.homeTeamId]} away={teamMap[match.awayTeamId]} />
        ))}
      </div>
    </PageContainer>
  )
}
