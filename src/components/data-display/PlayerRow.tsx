import { Link } from 'react-router-dom'
import type { Player } from '../../domain/entities/types'

export const PlayerRow = ({ player }: { player: Player }) => (
  <Link to={`/players/${player.id}`} className="matte-panel flex items-center justify-between p-4 hover:bg-elevated">
    <div>
      <p className="text-base font-medium">{player.displayName}</p>
      <p className="text-sm text-textMuted">#{player.number} • {player.position}</p>
    </div>
    <p className="text-sm text-textSecondary">Г {player.stats.goals} / П {player.stats.assists}</p>
  </Link>
)
