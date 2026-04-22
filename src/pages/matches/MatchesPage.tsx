import { useMemo, useState } from 'react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import type { Match, Team } from '../../domain/entities/types'
import { sortMatchesByRelevance } from '../../domain/services/matchSorting'

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
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all')
  const { data: matchList, isLoading } = useMatches()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const filteredMatches = useMemo(() => {
    if (!matchList) return []
    if (filter === 'live') return sortMatchesByRelevance(matchList.filter((match) => match.status === 'live' || match.status === 'half_time'))
    if (filter === 'upcoming') return sortMatchesByRelevance(matchList.filter((match) => match.status === 'scheduled'))
    if (filter === 'finished') return sortMatchesByRelevance(matchList.filter((match) => match.status === 'finished'))
    return sortMatchesByRelevance(matchList)
  }, [filter, matchList])

  const filterLabel: Record<typeof filter, string> = {
    all: 'ВСЕ',
    live: 'LIVE',
    upcoming: 'ПРЕДСТОЯЩИЕ',
    finished: 'ПРОШЕДШИЕ',
  }

  return (
    <PageContainer>
      <div className="grid gap-2 sm:grid-cols-4">
        {(['all', 'live', 'upcoming', 'finished'] as const).map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${filter === value ? 'bg-accentYellow text-app' : 'bg-panelBg text-textMuted'}`}
          >
            {filterLabel[value]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-textMuted">Загрузка...</p>}
        {filteredMatches.map((m: Match) => <MatchCard key={m.id} match={m} home={teamMap[m.homeTeamId] ?? fallbackTeam(m.homeTeamId)} away={teamMap[m.awayTeamId] ?? fallbackTeam(m.awayTeamId)} />)}
      </div>
      {!isLoading && filteredMatches.length === 0 && <EmptyState title="Матчи не найдены" />}
    </PageContainer>
  )
}
