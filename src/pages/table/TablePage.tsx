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
      <SectionHeader title="Турнирная таблица" />
      <p className="mb-4 text-sm text-textSecondary">Сортировка по очкам и разнице мячей.</p>
      {rows && <StandingsTable rows={rows} teamMap={teamMap} />}
    </PageContainer>
  )
}
