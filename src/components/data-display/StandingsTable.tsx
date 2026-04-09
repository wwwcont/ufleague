import { Link } from 'react-router-dom'
import type { StandingRow, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

export const StandingsTable = ({ rows, teamMap }: { rows: StandingRow[]; teamMap: Record<string, Team> }) => (
  <div className="matte-panel overflow-x-auto p-2">
    <table className="min-w-full border-separate border-spacing-y-1 text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.11em] text-textMuted">
          <th className="px-2 py-2 text-left">#</th>
          <th className="px-2 py-2 text-left">Команда</th>
          <th className="px-2 py-2 text-center">И</th>
          <th className="px-2 py-2 text-center">В</th>
          <th className="px-2 py-2 text-center">Н</th>
          <th className="px-2 py-2 text-center">П</th>
          <th className="px-2 py-2 text-center">Мячи</th>
          <th className="px-2 py-2 text-center">О</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const team = teamMap[row.teamId]

          return (
            <tr key={row.teamId} className="bg-app/70">
              <td className="rounded-l-lg px-2 py-3 font-medium text-textSecondary">{row.position}</td>
              <td className="px-2 py-3">
                <Link className="flex items-center gap-2 font-medium text-textPrimary transition hover:text-accentYellow" to={`/teams/${row.teamId}`}>
                  {team ? <TeamAvatar team={team} size="sm" /> : <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-panelSoft text-[10px]">?</span>}
                  <span>{team?.shortName ?? row.teamId}</span>
                </Link>
              </td>
              <td className="px-2 py-3 text-center tabular-nums text-textSecondary">{row.played}</td>
              <td className="px-2 py-3 text-center tabular-nums text-textSecondary">{row.won}</td>
              <td className="px-2 py-3 text-center tabular-nums text-textSecondary">{row.drawn}</td>
              <td className="px-2 py-3 text-center tabular-nums text-textSecondary">{row.lost}</td>
              <td className="px-2 py-3 text-center tabular-nums text-textSecondary">
                <span className="inline-flex min-w-[76px] items-center justify-center rounded-full bg-panelSoft px-3 py-1">
                  {row.goalsFor}:{row.goalsAgainst}
                  <span className="ml-2 text-[11px] font-semibold text-accentYellow">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
                </span>
              </td>
              <td className="rounded-r-lg px-2 py-3 text-center text-base font-bold tabular-nums text-textPrimary">{row.points}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)
