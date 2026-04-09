import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { EmptyState } from '../../components/ui/EmptyState'

export const PlayerDetailsPage = () => {
  const { playerId } = useParams()
  const { data: player } = usePlayerDetails(playerId)

  if (!player) return <PageContainer><EmptyState title="Игрок не найден" /></PageContainer>

  return (
    <PageContainer>
      <div className="border-y border-accentYellow/70 p-4">
        <div className="mb-2 h-px w-10 bg-accentYellow" />
        <h2 className="text-xl font-bold">{player.displayName}</h2>
        <p className="text-sm text-textSecondary">#{player.number} • {player.position} • {player.age} лет</p>
        <p className="mt-2 text-xs text-textMuted">Голы: {player.stats.goals}, Передачи: {player.stats.assists}</p>
        <Link className="mt-4 inline-block text-sm text-accentYellow" to={`/teams/${player.teamId}`}>Открыть команду</Link>
      </div>
    </PageContainer>
  )
}
