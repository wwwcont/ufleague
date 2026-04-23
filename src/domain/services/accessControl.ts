import type { AuthSession, CommentNode, Match, Player, PublicEvent, Team, UserRole } from '../entities/types'

const ADMIN_ROLES: UserRole[] = ['admin', 'superadmin']

const roleSet = (session: AuthSession) => new Set<UserRole>([session.user.role, ...(session.user.roles ?? [])])

export const hasRole = (session: AuthSession, role: UserRole) => roleSet(session).has(role)

export const isAtLeastRole = (session: AuthSession, role: UserRole) => {
  if (role === 'admin') return ADMIN_ROLES.some((item) => hasRole(session, item))
  if (role === 'captain') return (['captain', ...ADMIN_ROLES] as UserRole[]).some((item) => hasRole(session, item))
  if (role === 'player') return (['player', 'captain', ...ADMIN_ROLES] as UserRole[]).some((item) => hasRole(session, item))
  return hasRole(session, role)
}

export const isAdmin = (session: AuthSession) => ADMIN_ROLES.some((item) => hasRole(session, item))
export const hasPermission = (session: AuthSession, permission: string) => (session.permissions ?? []).includes(permission as AuthSession['permissions'][number])

export const isOwnPlayerProfile = (session: AuthSession, player: Player | null | undefined) => {
  if (!player) return false
  if (session.user.playerProfileId) return session.user.playerProfileId === player.id
  return player.userId === session.user.id
}

export const isTeamCaptain = (session: AuthSession, team: Team | null | undefined) => {
  if (!team?.captainUserId) return false
  return session.user.id === team.captainUserId
}

export const canManageTeam = (session: AuthSession, team: Team | null | undefined) => isAdmin(session) || isTeamCaptain(session, team)

export const canManagePlayer = (session: AuthSession, player: Player | null | undefined, playerTeam: Team | null | undefined) => {
  if (!player) return false
  if (isAdmin(session)) return true
  if (isOwnPlayerProfile(session, player)) return isAtLeastRole(session, 'player')
  return isTeamCaptain(session, playerTeam)
}

export const canManageMatch = (session: AuthSession) => isAdmin(session) || hasPermission(session, 'match.create') || hasPermission(session, 'tournament.match.create')
export const canManageMatchScore = (session: AuthSession) => isAdmin(session) || hasPermission(session, 'match.score.manage.full') || hasPermission(session, 'match.score.manage')
export const canManageMatchControls = (session: AuthSession, _match: Match | null | undefined, _teamsById: Record<string, Team | undefined>) => canManageMatchScore(session)
export const hasRestriction = (session: AuthSession, prefix: string) => (session.restrictions ?? []).some((item) => item.startsWith(prefix))
export const canCreateEvent = (session: AuthSession) => (isAtLeastRole(session, 'captain') || hasPermission(session, 'event.full.create')) && !hasRestriction(session, 'events:banned')

export const canManageEvent = (
  session: AuthSession,
  teamsById: Record<string, Team | undefined>,
  event: PublicEvent,
  playersById?: Record<string, Player | undefined>,
) => {
  if (isAdmin(session) || hasPermission(session, 'event.full.create')) return true
  if (event.entityType === 'team' && event.entityId) return isTeamCaptain(session, teamsById[event.entityId])
  if (event.entityType === 'player' && event.entityId) {
    const player = playersById?.[event.entityId]
    if (isOwnPlayerProfile(session, player)) return true
    if (!player) return session.user.playerProfileId === event.entityId
    return isTeamCaptain(session, teamsById[player.teamId])
  }
  return false
}

export const canEditComment = (_session: AuthSession, comment: CommentNode) => comment.isOwn

export const canDeleteComment = (session: AuthSession, comment: CommentNode) => comment.isOwn || isAdmin(session) || hasPermission(session, 'comment.delete.any')
