import { Link } from 'react-router-dom'
import type { StandingRow, Team } from '../../domain/entities/types'

export const StandingsTable = ({ rows, teamMap }: { rows: StandingRow[]; teamMap: Record<string, Team> }) => (
  <div className="overflow-x-auto rounded-2xl border border-borderStrong bg-surface shadow-surface">
    <table className="min-w-full text-sm">
      <thead className="sticky top-0 z-10 bg-elevated text-textSecondary">
        <tr className="text-[11px] uppercase tracking-[0.12em]">
          <th className="px-3 py-3 text-left">#</th>
          <th className="px-3 py-3 text-left">Team</th>
          <th className="px-3 py-3 text-center">P</th>
          <th className="px-3 py-3 text-center">GD</th>
          <th className="px-3 py-3 text-center">Pts</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={row.teamId} className="border-t border-borderSubtle hover:bg-elevated/40">
            <td className="px-3 py-3 font-medium text-textSecondary">{row.position}</td>
            <td className="px-3 py-3">
              <Link className="font-medium text-textPrimary transition hover:text-accentYellow" to={`/teams/${row.teamId}`}>
                {teamMap[row.teamId]?.name ?? row.teamId}
              </Link>
              {idx < 2 && <div className="mt-1 h-px w-8 bg-accentYellow/70" />}
            </td>
            <td className="px-3 py-3 text-center tabular-nums text-textSecondary">{row.played}</td>
            <td className="px-3 py-3 text-center tabular-nums text-textSecondary">
              {row.goalsFor}:{row.goalsAgainst}
              <sup className="ml-1 align-super text-[10px] font-semibold text-textSecondary">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</sup>
            </td>
            <td className="px-3 py-3 text-center text-base font-bold tabular-nums text-textPrimary">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
