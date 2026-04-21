import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { TopScorersTable } from '../../components/data-display/TopScorersTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useTeams } from '../../hooks/data/useTeams'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTopScorers } from '../../hooks/data/useTopScorers'

type LeaderboardMetric = 'goals' | 'assists'

export const TopScorersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: players } = usePlayers()
  const { data: teams } = useTeams()
  const playersById = useMemo(() => Object.fromEntries((players ?? []).map((player) => [player.id, player])), [players])
  const teamsById = useMemo(() => Object.fromEntries((teams ?? []).map((team) => [team.id, team])), [teams])
  const { data: leaderboardData } = useTopScorers()
  const selectedMetric: LeaderboardMetric = searchParams.get('metric') === 'assists' ? 'assists' : 'goals'
  const leaderboard = useMemo(() => {
    const rows = leaderboardData ?? []
    if (selectedMetric === 'goals') return rows

    return [...rows]
      .filter((row) => row.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.playerId.localeCompare(b.playerId))
  }, [leaderboardData, selectedMetric])

  const switchToMetric = (metric: LeaderboardMetric) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('metric', metric)
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <PageContainer>
      <SectionHeader title="Топ игроков" action={<Link to="/players" className="text-sm text-accentYellow">Все игроки</Link>} />
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-borderSubtle bg-panelBg p-1">
        <button
          type="button"
          onClick={() => switchToMetric('goals')}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${selectedMetric === 'goals' ? 'bg-accentYellow text-app' : 'text-textSecondary hover:text-textPrimary'}`}
        >
          Топ бомбардиров
        </button>
        <button
          type="button"
          onClick={() => switchToMetric('assists')}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${selectedMetric === 'assists' ? 'bg-accentYellow text-app' : 'text-textSecondary hover:text-textPrimary'}`}
        >
          Топ ассистентов
        </button>
      </div>
      {leaderboard.length === 0 ? (
        <EmptyState title={selectedMetric === 'goals' ? 'Пока нет голов' : 'Пока нет ассистов'} />
      ) : (
        <TopScorersTable rows={leaderboard} playersById={playersById} teamsById={teamsById} />
      )}
    </PageContainer>
  )
}
