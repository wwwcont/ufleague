import type {
  AuthSession,
  AuthSessionDTO,
  CommentEntityType,
  EventCategory,
  EventEntityType,
  PermissionKey,
  TelegramAuthFinalizeDTO,
  TelegramAuthStartDTO,
} from '../entities/types'

export interface AuthApiRepository {
  startTelegramAuth(): Promise<TelegramAuthStartDTO>
  finalizeTelegramAuth(payload: TelegramAuthFinalizeDTO): Promise<AuthSessionDTO>
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
    category: EventCategory
    entityType: EventEntityType
    entityId?: string
  }): Promise<{ id: string }>
  updateEvent(eventId: string, patch: Partial<{ title: string; summary: string; text: string }>): Promise<void>
  deleteEvent(eventId: string): Promise<void>
}

export interface TeamManagementApiContract {
  updateSquad(teamId: string, changes: Array<{ playerId: string; action: 'add' | 'remove' | 'promote' | 'demote' }>): Promise<void>
  createInvite(teamId: string, payload: { playerName: string; role: 'player' | 'captain' }): Promise<{ inviteId: string }>
}
