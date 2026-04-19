import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TopScorersTable } from '../../components/data-display/TopScorersTable'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useTeams } from '../../hooks/data/useTeams'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { buildPlayerLeaderboard } from '../../domain/services/playerLeaderboard'

export const TopScorersPage = () => {
  const { data: players } = usePlayers()
  const { data: teams } = useTeams()
  const { data: matches } = useMatches()

  const playersById = useMemo(() => Object.fromEntries((players ?? []).map((player) => [player.id, player])), [players])
  const teamsById = useMemo(() => Object.fromEntries((teams ?? []).map((team) => [team.id, team])), [teams])
  const leaderboard = useMemo(() => buildPlayerLeaderboard(players ?? [], matches ?? []), [players, matches])

  return (
    <PageContainer>
      <SectionHeader title="Топ бомбардиров" action={<Link to="/players" className="text-sm text-accentYellow">Все игроки</Link>} />
      {leaderboard.length === 0 ? (
        <EmptyState title="Пока нет голов" />
      ) : (
        <TopScorersTable rows={leaderboard} playersById={playersById} teamsById={teamsById} />
      )}
    </PageContainer>
  )
}
