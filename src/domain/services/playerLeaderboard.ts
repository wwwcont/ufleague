import type { Match, Player } from '../entities/types'

export interface PlayerLeaderboardRow {
  playerId: string
  teamId: string
  goals: number
  assists: number
  yellowCards: number
  redCards: number
}

export const resolvePlayerDisplayName = (player: Pick<Player, 'displayName' | 'userId'>) => {
  const trimmed = player.displayName?.trim()
  return trimmed || `@${player.userId}`
}

export const buildPlayerLeaderboard = (players: Player[], matches: Match[]): PlayerLeaderboardRow[] => {
  const rowsByPlayer = new Map<string, PlayerLeaderboardRow>()

  players.forEach((player) => {
    rowsByPlayer.set(player.id, {
      playerId: player.id,
      teamId: player.teamId,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    })
  })

  matches.forEach((match) => {
    match.events.forEach((event) => {
      if (event.playerId) {
        const actor = rowsByPlayer.get(event.playerId)
        if (actor) {
          if (event.type === 'goal') actor.goals += 1
          if (event.type === 'yellow_card') actor.yellowCards += 1
          if (event.type === 'red_card') actor.redCards += 1
        }
      }

      if (event.type === 'goal' && event.assistPlayerId) {
        const assistant = rowsByPlayer.get(event.assistPlayerId)
        if (assistant) assistant.assists += 1
      }
    })
  })

  return [...rowsByPlayer.values()]
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.redCards - b.redCards)
}
