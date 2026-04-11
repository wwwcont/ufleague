import type {
  AuthSession,
  BracketSize,
  BracketStageCode,
  CommentEntityType,
  EventContentBlock,
  EventCategory,
  EventEntityType,
  PermissionKey,
  TelegramAuthFinalizeDTO,
  TelegramAuthStartDTO,
} from '../entities/types'

export interface AuthApiRepository {
  startTelegramAuth(): Promise<TelegramAuthStartDTO>
  finalizeTelegramAuth(payload: TelegramAuthFinalizeDTO): Promise<AuthSession>
  getCurrentSession(): Promise<AuthSession | null>
  logout(): Promise<void>
}

export interface RbacApiRepository {
  getAvailablePermissions(): Promise<PermissionKey[]>
  getCurrentPermissions(): Promise<PermissionKey[]>
}

export interface CommentsApiContract {
  createComment(entityType: CommentEntityType, entityId: string, text: string, parentId?: string): Promise<{ id: string }>
  deleteComment(commentId: string): Promise<void>
  reactToComment(commentId: string, reaction: 'like' | 'dislike' | null): Promise<void>
}

export interface EventsApiContract {
  createEvent(input: {
    title: string
    summary: string
    text: string
    contentBlocks?: EventContentBlock[]
    category: EventCategory
    entityType: EventEntityType
    entityId?: string
  }): Promise<{ id: string }>
  updateEvent(eventId: string, patch: Partial<{ title: string; summary: string; text: string; contentBlocks: EventContentBlock[] }>): Promise<void>
  deleteEvent(eventId: string): Promise<void>
}

export interface TeamManagementApiContract {
  updateSquad(teamId: string, changes: Array<{ playerId: string; action: 'add' | 'remove' | 'promote' | 'demote' }>): Promise<void>
  createInvite(teamId: string, payload: { playerName: string; role: 'player' | 'captain' }): Promise<{ inviteId: string }>
}

export interface TournamentAdminApiContract {
  createTournament(input: { name: string; bracketSize: BracketSize; isActive?: boolean }): Promise<{ id: string }>
  setActiveTournament(tournamentId: string): Promise<void>
  updateBracketSettings(tournamentId: string, patch: Partial<{ bracketSize: BracketSize; legsPerTieDefault: 1 | 2 }>): Promise<void>
}

export interface BracketAdminApiContract {
  createBracketTie(input: {
    tournamentId: string
    stageCode: BracketStageCode
    slot: number
    homeTeamId?: string | null
    awayTeamId?: string | null
    legsPlanned?: 1 | 2
  }): Promise<{ id: string }>
  attachMatchToTie(input: { tournamentId: string; tieId: string; matchId: string; legNumber: number }): Promise<void>
}
