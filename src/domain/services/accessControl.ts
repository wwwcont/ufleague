import type { AuthSession, CommentNode, Player, PublicEvent, Team, UserRole } from '../entities/types'

const roleRank: Record<UserRole, number> = {
  guest: 0,
  player: 1,
  captain: 2,
  admin: 3,
  superadmin: 4,
}

export const isAtLeastRole = (session: AuthSession, role: UserRole) => roleRank[session.user.role] >= roleRank[role]

export const isTeamCaptain = (session: AuthSession, team: Team | null | undefined) => {
  if (!team?.captainUserId) return false
  return session.user.id === team.captainUserId
}

export const canManageTeam = (session: AuthSession, team: Team | null | undefined) => isAtLeastRole(session, 'admin') || isTeamCaptain(session, team)

export const canManagePlayer = (session: AuthSession, player: Player | null | undefined, playerTeam: Team | null | undefined) => {
  if (!player) return false
  if (isAtLeastRole(session, 'admin')) return true
  return isTeamCaptain(session, playerTeam)
}

export const canManageMatch = (session: AuthSession) => isAtLeastRole(session, 'admin')

export const canManageEvent = (session: AuthSession, teamsById: Record<string, Team | undefined>, event: PublicEvent) => {
  if (isAtLeastRole(session, 'admin')) return true
  if (event.entityType === 'team' && event.entityId) return isTeamCaptain(session, teamsById[event.entityId])
  return false
}

export const canEditComment = (_session: AuthSession, comment: CommentNode) => comment.isOwn

export const canDeleteComment = (session: AuthSession, comment: CommentNode) => comment.isOwn || isAtLeastRole(session, 'admin')
