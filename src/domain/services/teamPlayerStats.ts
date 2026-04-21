import type { Match, Player } from '../entities/types'

export type TeamHistorySummary = {
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  points: number
  form: Array<'W' | 'D' | 'L'>
}

const isFinishedNonArchived = (match: Match) => match.status === 'finished' && !match.archived

export const buildTeamHistorySummary = (teamId: string, matches: Match[]): TeamHistorySummary => {
  const finished = matches
    .filter((match) => (match.homeTeamId === teamId || match.awayTeamId === teamId) && isFinishedNonArchived(match))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))

  const summary = finished.reduce<TeamHistorySummary>((acc, match) => {
    const isHome = match.homeTeamId === teamId
    const ownScore = isHome ? match.score.home : match.score.away
    const opponentScore = isHome ? match.score.away : match.score.home

    acc.played += 1
    acc.goalsFor += ownScore
    acc.goalsAgainst += opponentScore

    if (ownScore > opponentScore) {
      acc.won += 1
      acc.points += 3
      acc.form.push('W')
    } else if (ownScore < opponentScore) {
      acc.lost += 1
      acc.form.push('L')
    } else {
      acc.drawn += 1
      acc.points += 1
      acc.form.push('D')
    }

    return acc
  }, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, form: [] })

  summary.form = summary.form.slice(-5).reverse()
  return summary
}

type PlayerStats = Player['stats']

export const buildPlayerStatsMap = (players: Player[], matches: Match[]) => {
  const teamByPlayer = new Map(players.map((player) => [player.id, player.teamId]))
  const stats = new Map<string, PlayerStats>()

  players.forEach((player) => {
    stats.set(player.id, { goals: 0, assists: 0, appearances: 0 })
  })

  matches
    .filter(isFinishedNonArchived)
    .forEach((match) => {
      const appearedPlayerIds = new Set<string>()

      match.events.forEach((event) => {
        if (!event.playerId) return
        const playerTeamId = teamByPlayer.get(event.playerId)
        if (!playerTeamId) return
        if (event.teamId && event.teamId !== playerTeamId) return

        appearedPlayerIds.add(event.playerId)
        const row = stats.get(event.playerId)
        if (!row) return
        if (event.type === 'goal') row.goals += 1

        if (event.type === 'goal' && event.assistPlayerId) {
          const assistTeamId = teamByPlayer.get(event.assistPlayerId)
          if (!assistTeamId) return
          if (event.teamId && event.teamId !== assistTeamId) return
          appearedPlayerIds.add(event.assistPlayerId)
          const assistRow = stats.get(event.assistPlayerId)
          if (assistRow) assistRow.assists += 1
        }
      })

      appearedPlayerIds.forEach((playerId) => {
        const row = stats.get(playerId)
        if (row) row.appearances += 1
      })
    })

  return stats
}
