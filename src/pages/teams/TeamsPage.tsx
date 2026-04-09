import { TeamCard } from '../../components/data-display/TeamCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeams } from '../../hooks/data/useTeams'

export const TeamsPage = () => {
  const { data: teams } = useTeams()

  return (
    <PageContainer>
      <SectionHeader title="Teams" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {teams?.map((team) => <TeamCard key={team.id} team={team} />)}
      </div>
      {!teams?.length && <EmptyState title="No teams" />}
    </PageContainer>
  )
}
