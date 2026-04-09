import { Link } from 'react-router-dom'
import type { Player } from '../../domain/entities/types'

export const PlayerRow = ({ player }: { player: Player }) => (
  <Link to={`/players/${player.id}`} className="group flex items-center justify-between rounded-xl border border-borderSubtle bg-panelBg p-3 transition hover:border-borderStrong hover:bg-panelSoft">
    <div>
      <p className="text-sm font-semibold text-textPrimary">{player.displayName}</p>
      <p className="text-xs text-textMuted">#{player.number} • {player.position}</p>
    </div>
    <p className="text-xs text-textSecondary">Г {player.stats.goals} / П {player.stats.assists}</p>
  </Link>
)
