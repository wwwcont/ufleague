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
    <div className="matte-panel glow-surface p-2">
      <table className="w-full table-fixed border-separate border-spacing-y-1 text-xs sm:text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.11em] text-textMuted">
            <th className="w-7 px-1 py-2 text-left sm:px-2">#</th>
            <th className="px-1 py-2 text-left sm:px-2">Игрок</th>
            <th className="w-7 px-1 py-2 text-center sm:px-2">Г</th>
            <th className="w-7 px-1 py-2 text-center sm:px-2">А</th>
            <th className="w-9 px-1 py-2 text-center sm:px-2">ЖК</th>
            <th className="w-9 px-1 py-2 text-center sm:px-2">КК</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, index) => {
            const player = playersById[row.playerId]
            const team = teamsById[row.teamId]
            if (!player || !team) return null

            return (
              <tr key={row.playerId} className="bg-app/70">
                <td className="rounded-l-lg px-1 py-2 font-medium text-textSecondary sm:px-2 sm:py-3">{index + 1}</td>
                <td className="px-1 py-2 sm:px-2 sm:py-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Link to={`/players/${player.id}`} className="transition hover:opacity-90">
                      <PlayerAvatar player={player} />
                    </Link>
                    <div className="min-w-0">
                      <Link to={`/players/${player.id}`} className="block truncate text-[13px] font-medium text-textPrimary transition hover:text-accentYellow sm:text-sm">
                        {resolvePlayerDisplayName(player)}
                      </Link>
                      <Link to={`/teams/${team.id}`} className="flex items-center gap-1 text-[11px] text-textMuted transition hover:text-accentYellow">
                        <TeamAvatar team={team} size="sm" />
                        <span className="truncate">{team.shortName}</span>
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="px-1 py-2 text-center text-sm font-semibold tabular-nums text-textPrimary sm:px-2 sm:py-3 sm:text-base">{row.goals}</td>
                <td className="px-1 py-2 text-center tabular-nums text-textSecondary sm:px-2 sm:py-3">{row.assists}</td>
                <td className="px-1 py-2 text-center tabular-nums text-textSecondary sm:px-2 sm:py-3">{row.yellowCards}</td>
                <td className="rounded-r-lg px-1 py-2 text-center tabular-nums text-textSecondary sm:px-2 sm:py-3">{row.redCards}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
