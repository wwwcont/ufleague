export type ID = string
export type MatchStatus = 'scheduled' | 'live' | 'half_time' | 'finished'
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW'
export type FormResult = 'W' | 'D' | 'L'
export type SearchEntityType = 'team' | 'player' | 'match' | 'event'

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
  captainUserId?: ID | null
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

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export type CommentEntityType = 'match' | 'team' | 'player' | 'event'
export type CommentReactionType = 'like' | 'dislike' | null

export interface CommentReactions {
  likes: number
  dislikes: number
  userReaction: CommentReactionType
}

export interface CommentNode {
  id: ID
  entityType: CommentEntityType
  entityId: ID
  parentId: ID | null
  authorName: string
  authorRole: UserRole
  isOwn: boolean
  createdAt: string
  text: string
  reactions: CommentReactions
  canReply: boolean
  canDelete: boolean
  replies: CommentNode[]
}

export interface CommentAuthorState {
  id: ID
  name: string
  role: UserRole
  isGuest: boolean
  canComment: boolean
  cooldownSeconds: number
  blockedReason?: string
}


export type EventEntityType = 'global' | 'team' | 'player' | 'match'
export type EventCategory = 'news' | 'announcement' | 'report' | 'injury' | 'discipline' | 'tactical'

export interface PublicEvent {
  id: ID
  title: string
  summary: string
  text: string
  timestamp: string
  source: string
  authorName: string
  category: EventCategory
  entityType: EventEntityType
  entityId?: ID
  imageUrl?: string
  canEdit?: boolean
  canDelete?: boolean
}


export type UserRole = 'guest' | 'player' | 'captain' | 'admin' | 'superadmin'

export type PermissionKey =
  | 'comment.create'
  | 'comment.delete.own'
  | 'comment.reply'
  | 'comment.react'
  | 'event.create'
  | 'event.edit'
  | 'event.delete'
  | 'team.squad.manage'
  | 'team.invite.manage'
  | 'tournament.match.create'
  | 'tournament.team.create'
  | 'tournament.moderate'
  | 'rbac.manage'
  | 'settings.global.manage'

export interface SessionUser {
  id: ID
  displayName: string
  role: UserRole
  teamId?: ID
  telegramHandle?: string
}

export interface AuthSession {
  isAuthenticated: boolean
  user: SessionUser
  permissions: PermissionKey[]
  lastLoginAt?: string
}

export interface AuthenticatedUser extends SessionUser {
  role: Exclude<UserRole, 'guest'>
}

export interface RolePermissionProfile {
  role: UserRole
  permissions: PermissionKey[]
}

export interface TelegramAuthStartDTO {
  authUrl: string
  requestId: string
  expiresAt: string
}

export interface TelegramAuthFinalizeDTO {
  requestId: string
  code: string
}

export interface BackendMeDTO {
  user: {
    id: number | string
    username: string
    display_name: string
    roles: UserRole[]
    permissions: PermissionKey[] | string[]
    restrictions?: string[]
    telegram_id?: number | null
  }
  session: {
    id: string
    user_id: number | string
    expires_at: string
    created_at: string
  }
}
