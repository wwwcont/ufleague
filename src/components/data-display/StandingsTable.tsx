import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import type { StandingRow, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

export const StandingsTable = ({ rows, teamMap }: { rows: StandingRow[]; teamMap: Record<string, Team> }) => (
  <div className="matte-panel p-2">
    <table className="w-full table-fixed border-separate border-spacing-y-1 text-xs sm:text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.11em] text-textMuted">
          <th className="w-7 px-1 py-2 text-left sm:px-2">#</th>
          <th className="px-1 py-2 text-left sm:px-2">Команда</th>
          <th className="w-7 px-1 py-2 text-center sm:px-2">И</th>
          <th className="w-14 whitespace-nowrap px-1 py-2 text-center sm:px-2">В-П-Н</th>
          <th className="w-16 px-1 py-2 text-center sm:w-20 sm:px-2">М</th>
          <th className="w-8 px-1 py-2 text-center sm:px-2">О</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const team = teamMap[row.teamId]
          if (!team) return null

          return (
            <Fragment key={row.teamId}>
              <tr className="bg-app/70">
                <td className="rounded-l-lg px-1 py-2 font-medium text-textSecondary sm:px-2 sm:py-3">{row.position}</td>
                <td className="px-1 py-2 sm:px-2 sm:py-3">
                  <Link className="flex items-center gap-2 font-medium text-textPrimary transition hover:text-accentYellow" to={`/teams/${row.teamId}`}>
                    <TeamAvatar team={team} size="sm" className="h-7 w-7" />
                    <span className="truncate">{team.shortName}</span>
                  </Link>
                </td>
                <td className="px-1 py-2 text-center tabular-nums text-textSecondary sm:px-2 sm:py-3">{row.played}</td>
                <td className="whitespace-nowrap px-1 py-2 text-center tabular-nums text-textSecondary sm:px-2 sm:py-3">{row.won}-{row.lost}-{row.drawn}</td>
                <td className="px-1 py-2 text-center tabular-nums text-textSecondary sm:px-2 sm:py-3">
                  <span className="inline-flex min-w-[58px] items-center justify-center rounded-full bg-panelSoft px-2 py-1 sm:min-w-[76px] sm:px-3">
                    {row.goalsFor}:{row.goalsAgainst}
                    <sup className="ml-1 text-[10px] font-semibold text-accentYellow">{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</sup>
                  </span>
                </td>
                <td className="rounded-r-lg px-1 py-2 text-center text-sm font-bold tabular-nums text-textPrimary sm:px-2 sm:py-3 sm:text-base">{row.points}</td>
              </tr>

              {row.position === 8 && (
                <tr aria-hidden>
                  <td colSpan={6} className="py-1">
                    <div className="h-[2px] w-full rounded-full bg-red-500/70" />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  </div>
)
