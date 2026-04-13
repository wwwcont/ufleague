import type { Match, Player, PublicEvent, Team } from '../entities/types'

interface ResolveEventSourceLabelInput {
  event: PublicEvent
  teamsById?: Record<string, Team | undefined>
  playersById?: Record<string, Player | undefined>
  matchesById?: Record<string, Match | undefined>
}

export const resolveEventSourceLabel = ({ event, teamsById, playersById, matchesById }: ResolveEventSourceLabelInput): string => {
  if (event.entityType === 'global') return 'Турнир'

  if (event.entityType === 'team' && event.entityId) {
    return teamsById?.[event.entityId]?.name ?? 'Команда'
  }

  if (event.entityType === 'player' && event.entityId) {
    return playersById?.[event.entityId]?.displayName ?? 'Игрок'
  }

  if (event.entityType === 'match' && event.entityId) {
    const match = matchesById?.[event.entityId]
    if (!match) return 'Матч'
    const home = teamsById?.[match.homeTeamId]?.shortName ?? teamsById?.[match.homeTeamId]?.name ?? match.homeTeamId
    const away = teamsById?.[match.awayTeamId]?.shortName ?? teamsById?.[match.awayTeamId]?.name ?? match.awayTeamId
    return `${home} VS ${away}`
  }

  return 'Событие'
}
