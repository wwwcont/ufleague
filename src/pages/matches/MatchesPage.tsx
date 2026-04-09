import { MatchCard } from '../../components/data-display/MatchCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'

export const MatchesPage = () => {
  const { data: matchList, isLoading } = useMatches()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))

  return (
    <PageContainer>
      <SectionHeader title="Match Center" />
      <p className="mb-4 text-sm text-textSecondary">Round-by-round schedule with live and upcoming fixtures.</p>
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-textMuted">Loading...</p>}
        {matchList?.map((m) => <MatchCard key={m.id} match={m} home={teamMap[m.homeTeamId]} away={teamMap[m.awayTeamId]} />)}
      </div>
      {!isLoading && (!matchList || matchList.length === 0) && <EmptyState title="No matches found" />}
    </PageContainer>
  )
}
