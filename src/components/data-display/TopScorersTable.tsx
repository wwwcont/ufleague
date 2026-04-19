import { Link } from 'react-router-dom'
import { UserCircle2 } from 'lucide-react'
import type { Player, Team } from '../../domain/entities/types'
import type { PlayerLeaderboardRow } from '../../domain/services/playerLeaderboard'
import { TeamAvatar } from '../ui/TeamAvatar'
import { resolvePlayerDisplayName } from '../../domain/services/playerLeaderboard'

interface TopScorersTableProps {
  rows: PlayerLeaderboardRow[]
  playersById: Record<string, Player>
  teamsById: Record<string, Team>
  limit?: number
}

const PlayerAvatar = ({ player }: { player: Player }) => {
  if (player.avatar) {
    return <img src={player.avatar} alt={resolvePlayerDisplayName(player)} className="h-8 w-8 shrink-0 rounded-full object-cover" />
  }

  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textMuted">
      <UserCircle2 size={18} />
    </span>
  )
}

export const TopScorersTable = ({ rows, playersById, teamsById, limit }: TopScorersTableProps) => {
  const visibleRows = typeof limit === 'number' ? rows.slice(0, limit) : rows

  return (
    <div className="matte-panel overflow-x-auto p-2">
      <table className="min-w-full border-separate border-spacing-y-1 text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.11em] text-textMuted">
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Игрок</th>
            <th className="px-2 py-2 text-center">Г</th>
            <th className="px-2 py-2 text-center">А</th>
            <th className="px-2 py-2 text-center">ЖК</th>
            <th className="px-2 py-2 text-center">КК</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => {
            const player = playersById[row.playerId]
            const team = teamsById[row.teamId]
            if (!player || !team) return null

            return (
              <tr key={row.playerId} className="bg-app/70">
                <td className="rounded-l-lg px-2 py-3 font-medium text-textSecondary">{index + 1}</td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/players/${player.id}`} className="transition hover:opacity-90">
                      <PlayerAvatar player={player} />
                    </Link>
                    <div className="min-w-0">
                      <Link to={`/players/${player.id}`} className="block truncate font-medium text-textPrimary transition hover:text-accentYellow">
                        {resolvePlayerDisplayName(player)}
                      </Link>
                      <Link to={`/teams/${team.id}`} className="flex items-center gap-1 text-xs text-textMuted transition hover:text-accentYellow">
                        <TeamAvatar team={team} size="sm" />
                        <span>{team.shortName}</span>
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-2 py-3 text-center text-base font-semibold tabular-nums text-textPrimary">{row.goals}</td>
                <td className="px-2 py-3 text-center tabular-nums text-textSecondary">{row.assists}</td>
                <td className="px-2 py-3 text-center tabular-nums text-textSecondary">{row.yellowCards}</td>
                <td className="rounded-r-lg px-2 py-3 text-center tabular-nums text-textSecondary">{row.redCards}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
