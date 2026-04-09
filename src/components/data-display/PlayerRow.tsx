import { Link } from 'react-router-dom'
import type { Player } from '../../domain/entities/types'

export const PlayerRow = ({ player }: { player: Player }) => (
  <Link to={`/players/${player.id}`} className="flex items-center justify-between border-b border-accentYellow/50 p-3">
    <div>
      <p className="text-sm font-medium">{player.displayName}</p>
      <p className="text-xs text-textMuted">#{player.number} • {player.position}</p>
    </div>
    <p className="text-xs text-textSecondary">Г {player.stats.goals} / П {player.stats.assists}</p>
  </Link>
)
