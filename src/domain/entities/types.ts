export type ID = string
export type MatchStatus = 'scheduled' | 'live' | 'half_time' | 'finished'
export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW' | 'FR'
export type FormResult = 'W' | 'D' | 'L'
export type SearchEntityType = 'team' | 'player' | 'match' | 'event'

export interface Tournament {
  id: ID
  name: string
  logoUrl: string
  fallbackLogoUrl: string
}

export type BracketSize = 4 | 8 | 16 | 32
export type BracketStageCode = 'R16' | 'R8' | 'R4' | 'SF' | 'F'

// Normalized tournament aggregate used for admin/backend contracts.
export interface TournamentAggregate {
  id: ID
  name: string
  bracketSize: BracketSize
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface TournamentBracketSettings {
  tournamentId: ID
  bracketSize: BracketSize
  legsPerTieDefault: 1 | 2
}

export interface TournamentStandingsContext {
  id: ID
  tournamentId: ID
  stageCode?: BracketStageCode
  label: string
  generatedAt?: string
}

export interface TournamentBracketStage {
  id: ID
  tournamentId: ID
  code: BracketStageCode
  label: string
  order: number
}

export interface TournamentBracketTie {
  id: ID
  tournamentId: ID
  stageId: ID
  slot: number
  homeTeamId: ID | null
  awayTeamId: ID | null
  legsPlanned: 1 | 2
  winnerTeamId?: ID | null
  aggregateScore?: { home: number; away: number } | null
}

export interface MatchTieRelation {
  tieId: ID
  legNumber: number
}

// TODO(organizers): multi-season tournament management foundation.
export interface TournamentCycle {
  id: ID
  name: string
  bracketTeamCapacity: BracketSize
  isActive: boolean
}

// TODO(organizers): round is a tree vertex that can hold multiple matches and optional aggregate total.
export interface TournamentRoundNode {
  id: ID
  cycleId: ID
  label: string
  roundNumber: number
  parentRoundId?: ID | null
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
  slogan?: string
  description?: string
  socials?: {
    telegram?: string
    vk?: string
    instagram?: string
    custom?: Array<{ label: string; url: string }>
  }
  coach: string
  group: string
  form: FormResult[]
  statsSummary: TeamStatsSummary
}

export interface Player {
  id: ID
  teamId: ID
  userId: ID
  displayName: string
  number: number
  position: PlayerPosition
  age: number
  avatar: string | null
  bio?: string
  socials?: {
    telegram?: string
    vk?: string
    instagram?: string
  }
  isHidden?: boolean
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
  assistPlayerId?: ID
  linkedEventId?: ID
  note?: string
}

export interface Match {
  id: ID
  tournamentId?: ID
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
  stage?: string
  tour?: string
  referee?: string
  broadcastUrl?: string
  diskUrl?: string
  currentMinute?: number
  clockAnchorAt?: string
  archived?: boolean
  playoffCellId?: ID | null
  tieRelation?: MatchTieRelation | null
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

export interface PlayoffAttachedMatch {
  id: ID
  status: MatchStatus
  homeScore: number
  awayScore: number
}

export interface PlayoffCell {
  id: ID
  homeTeamId: ID | null
  awayTeamId: ID | null
  col: number
  row: number
  attachedMatchIds: ID[]
  attachedMatches: PlayoffAttachedMatch[]
  aggregateHomeScore?: number | null
  aggregateAwayScore?: number | null
  winnerTeamId?: ID | null
  allMatchesFinished: boolean
}

export interface PlayoffLine {
  id: ID
  fromPlayoffId: ID
  toPlayoffId: ID
}

export interface PlayoffGrid {
  cells: PlayoffCell[]
  lines: PlayoffLine[]
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
  authorUserId?: ID
  authorName: string
  authorRole: UserRole
  isOwn: boolean
  createdAt: string
  editedAt?: string
  text: string
  reactions: CommentReactions
  canReply: boolean
  canDelete: boolean
  canEdit: boolean
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
export type EventContentBlockType = 'text' | 'image'

export interface EventContentBlock {
  id: ID
  type: EventContentBlockType
  text?: string
  imageUrl?: string
}

export interface PublicEvent {
  id: ID
  title: string
  summary: string
  text: string
  contentBlocks: EventContentBlock[]
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
  | 'match.score.manage'
  | 'tournament.team.create'
  | 'tournament.moderate'
  | 'rbac.manage'
  | 'settings.global.manage'

export interface SessionUser {
  id: ID
  displayName: string
  role: UserRole
  roles?: UserRole[]
  playerProfileId?: ID
  teamId?: ID
  telegramHandle?: string
  telegramId?: string
}

export interface PublicUserCard {
  id: ID
  displayName: string
  telegramUsername?: string
  statuses: UserRole[]
  lastSeenAt?: string
  isOnline: boolean
  playerId?: ID
  teamId?: ID
}

export interface AuthSession {
  isAuthenticated: boolean
  user: SessionUser
  permissions: PermissionKey[]
  restrictions?: string[]
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
    player_id?: number | string | null
    team_id?: number | string | null
  }
  session: {
    id: string
    user_id: number | string
    expires_at: string
    created_at: string
  }
}
