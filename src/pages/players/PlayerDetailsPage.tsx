import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { EmptyState } from '../../components/ui/EmptyState'
import { SocialLinks } from '../../components/ui/SocialLinks'

export const PlayerDetailsPage = () => {
  const { playerId } = useParams()
  const { data: player } = usePlayerDetails(playerId)

  if (!player) return <PageContainer><EmptyState title="Игрок не найден" /></PageContainer>

  return (
    <PageContainer>
      <div className="matte-panel p-5">
        <div className="mb-4 flex h-36 items-center justify-center rounded-2xl bg-app/80">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-elevated text-2xl font-semibold text-textPrimary">
            {player.displayName.split(' ').map((part) => part[0]).join('')}
          </div>
        </div>

        <h2 className="text-2xl font-bold">{player.displayName}</h2>
        <p className="mt-1 text-base text-textSecondary">#{player.number} • {player.position} • {player.age} лет</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-app/80 p-3 text-center">
            <p className="text-xl font-semibold text-accentYellow">{player.stats.goals}</p>
            <p className="text-textMuted">Голы</p>
          </div>
          <div className="rounded-xl bg-app/80 p-3 text-center">
            <p className="text-xl font-semibold text-accentYellow">{player.stats.assists}</p>
            <p className="text-textMuted">Пасы</p>
          </div>
          <div className="rounded-xl bg-app/80 p-3 text-center">
            <p className="text-xl font-semibold text-accentYellow">{player.stats.appearances}</p>
            <p className="text-textMuted">Матчи</p>
          </div>
        </div>

        <SocialLinks />
        <Link className="mt-4 inline-block text-base text-accentYellow" to={`/teams/${player.teamId}`}>Открыть команду</Link>
      </div>
    </PageContainer>
  )
}
