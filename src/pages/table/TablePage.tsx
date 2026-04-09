import { StandingsTable } from '../../components/data-display/StandingsTable'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'
import { SectionHeader } from '../../components/ui/SectionHeader'

export const TablePage = () => {
  const { data: rows } = useStandings()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))

  return (
    <PageContainer>
      <SectionHeader title="Standings" />
      <p className="mb-4 text-sm text-textSecondary">Table sorted by points with goal-difference superscript formatting.</p>
      {rows && <StandingsTable rows={rows} teamMap={teamMap} />}
    </PageContainer>
  )
}
