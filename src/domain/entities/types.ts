export type ID = string
export type MatchStatus = 'scheduled' | 'live' | 'half_time' | 'finished'
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type FormResult = 'W' | 'D' | 'L'
export type SearchEntityType = 'team' | 'player' | 'match'

export interface Tournament {
  id: ID
  name: string
  logoUrl: string
  fallbackLogoUrl: string
}

export interface TeamStatsSummary {
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface Team {
  id: ID
  name: string
  shortName: string
  logoUrl: string | null
  city: string
  coach: string
  group: string
  form: FormResult[]
  statsSummary: TeamStatsSummary
}

export interface Player {
  id: ID
  teamId: ID
  displayName: string
  number: number
  position: PlayerPosition
  age: number
  avatar: string | null
  stats: {
    goals: number
    assists: number
    appearances: number
  }
}

export interface MatchEvent {
  id: ID
  minute: number
  type: 'goal' | 'yellow_card' | 'red_card' | 'substitution'
  teamId?: ID
  playerId?: ID
  note?: string
}

export interface Match {
  id: ID
  round: string
  date: string
  time: string
  venue: string
  status: MatchStatus
  homeTeamId: ID
  awayTeamId: ID
  score: { home: number; away: number }
  events: MatchEvent[]
  featured: boolean
}

export interface StandingRow {
  position: number
  teamId: ID
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
}

export interface BracketRound {
  id: ID
  label: string
  order: number
}

export interface BracketMatch {
  id: ID
  roundId: ID
  slot: number
  homeTeamId: ID | null
  awayTeamId: ID | null
  winnerTeamId?: ID | null
  status: MatchStatus
  linkedMatchId?: ID
  score?: { home: number; away: number }
}

export interface SearchResult {
  id: ID
  type: SearchEntityType
  entityId: ID
  title: string
  subtitle?: string
  route: string
}

export interface UserSession {
  isAuthenticated: boolean
  displayName?: string
}
