import type {
  BracketRepository,
  CommentsRepository,
  EventsRepository,
  MatchesRepository,
  PlayersRepository,
  SearchRepository,
  StandingsRepository,
  TeamsRepository,
} from '../../domain/repositories/contracts'
import { bracketMatches, bracketRounds } from '../data/bracket'
import { comments, currentCommentAuthor } from '../data/comments'
import { events } from '../data/events'
import { matches } from '../data/matches'
import { players } from '../data/players'
import { standings } from '../data/standings'
import { teams } from '../data/teams'

export const teamsRepository: TeamsRepository = {
  async getTeams() {
    return teams
  },
  async getTeamById(teamId) {
    return teams.find((t) => t.id === teamId) ?? null
  },
}

export const playersRepository: PlayersRepository = {
  async getPlayers(teamId) {
    return teamId ? players.filter((p) => p.teamId === teamId) : players
  },
  async getPlayerById(playerId) {
    return players.find((p) => p.id === playerId) ?? null
  },
}

export const matchesRepository: MatchesRepository = {
  async getMatches() {
    return matches
  },
  async getMatchById(matchId) {
    return matches.find((m) => m.id === matchId) ?? null
  },
}

export const standingsRepository: StandingsRepository = {
  async getStandings() {
    return standings
  },
}

export const bracketRepository: BracketRepository = {
  async getBracket() {
    return { rounds: bracketRounds, matches: bracketMatches }
  },
}





export const eventsRepository: EventsRepository = {
  async getEvents() {
    return events
  },
  async getEventById(eventId) {
    return events.find((event) => event.id === eventId) ?? null
  },
}

export const commentsRepository: CommentsRepository = {
  async getComments(entityType, entityId) {
    return comments
      .filter((comment) => comment.entityType === entityType && comment.entityId === entityId && comment.parentId === null)
      .map((comment) => ({
        ...comment,
        replies: comments.filter((reply) => reply.parentId === comment.id),
      }))
  },
  async getCurrentAuthor() {
    return currentCommentAuthor
  },
}

export const searchRepository: SearchRepository = {
  async searchAll(query) {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const teamResults = teams
      .filter((t) => t.name.toLowerCase().includes(q))
      .map((t) => ({ id: `s_team_${t.id}`, type: 'team' as const, entityId: t.id, title: t.name, subtitle: t.city, route: `/teams/${t.id}` }))

    const playerResults = players
      .filter((p) => p.displayName.toLowerCase().includes(q))
      .map((p) => ({ id: `s_player_${p.id}`, type: 'player' as const, entityId: p.id, title: p.displayName, subtitle: p.position, route: `/players/${p.id}` }))

    const matchResults = matches
      .filter((m) => m.round.toLowerCase().includes(q) || m.venue.toLowerCase().includes(q))
      .map((m) => ({ id: `s_match_${m.id}`, type: 'match' as const, entityId: m.id, title: `${m.round} • ${m.time}`, subtitle: m.venue, route: `/matches/${m.id}` }))

    return [...teamResults, ...playerResults, ...matchResults]
  },
}

export const repositories = {
  teamsRepository,
  playersRepository,
  matchesRepository,
  standingsRepository,
  bracketRepository,
  searchRepository,
  commentsRepository,
  eventsRepository,
}
