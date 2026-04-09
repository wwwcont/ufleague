import type { BracketMatch, BracketRound, Match, Player, SearchResult, StandingRow, Team } from '../entities/types'

export interface TeamsRepository {
  getTeams(): Promise<Team[]>
  getTeamById(teamId: string): Promise<Team | null>
}

export interface PlayersRepository {
  getPlayers(teamId?: string): Promise<Player[]>
  getPlayerById(playerId: string): Promise<Player | null>
}

export interface MatchesRepository {
  getMatches(): Promise<Match[]>
  getMatchById(matchId: string): Promise<Match | null>
}

export interface StandingsRepository {
  getStandings(): Promise<StandingRow[]>
}

export interface BracketRepository {
  getBracket(): Promise<{ rounds: BracketRound[]; matches: BracketMatch[] }>
}

export interface SearchRepository {
  searchAll(query: string): Promise<SearchResult[]>
}
