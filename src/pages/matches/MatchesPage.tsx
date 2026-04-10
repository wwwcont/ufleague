import { MatchCard } from '../../components/data-display/MatchCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import type { Team } from '../../domain/entities/types'

const fallbackTeam = (id: string): Team => ({
  id,
  name: `Team ${id}`,
  shortName: `T${id}`.slice(0, 3).toUpperCase(),
  logoUrl: null,
  city: 'UFL',
  coach: 'TBD',
  group: 'A',
  form: ['D', 'D', 'D', 'D', 'D'],
  statsSummary: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
})

export const MatchesPage = () => {
  const { data: matchList, isLoading } = useMatches()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))

  return (
    <PageContainer>
      <SectionHeader title="Центр матчей" />
      <p className="mb-4 text-sm text-textSecondary">Расписание по турам и актуальные статусы игр.</p>
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-textMuted">Загрузка...</p>}
        {matchList?.map((m) => <MatchCard key={m.id} match={m} home={teamMap[m.homeTeamId] ?? fallbackTeam(m.homeTeamId)} away={teamMap[m.awayTeamId] ?? fallbackTeam(m.awayTeamId)} />)}
      </div>
      {!isLoading && (!matchList || matchList.length === 0) && <EmptyState title="Матчи не найдены" />}
    </PageContainer>
  )
}
