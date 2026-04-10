import type { AuthSession, PermissionKey, SessionUser, UserRole } from '../../domain/entities/types'

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  guest: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react'],
  player: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react'],
  captain: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react', 'event.create', 'team.squad.manage', 'team.invite.manage'],
  admin: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react', 'event.create', 'event.edit', 'event.delete', 'tournament.match.create', 'tournament.team.create', 'tournament.moderate'],
  superadmin: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react', 'event.create', 'event.edit', 'event.delete', 'tournament.match.create', 'tournament.team.create', 'tournament.moderate', 'rbac.manage', 'settings.global.manage'],
}

const usersByRole: Record<UserRole, SessionUser> = {
  guest: { id: 'u_guest', displayName: 'Guest_42', role: 'guest', telegramHandle: '@guest42' },
  player: { id: 'u_player', displayName: 'М. Картер', role: 'player', teamId: 'team_1', telegramHandle: '@mcarter' },
  captain: { id: 'u_captain', displayName: 'Капитан ССК', role: 'captain', teamId: 'team_1', telegramHandle: '@captain_ssk' },
  admin: { id: 'u_admin', displayName: 'Admin UFL', role: 'admin', telegramHandle: '@ufl_admin' },
  superadmin: { id: 'u_superadmin', displayName: 'Superadmin UFL', role: 'superadmin', telegramHandle: '@ufl_superadmin' },
}

export const makeSessionByRole = (role: UserRole): AuthSession => ({
  isAuthenticated: role !== 'guest',
  user: usersByRole[role],
  permissions: rolePermissions[role],
  lastLoginAt: '2026-04-09 13:00',
})

export const defaultSession = makeSessionByRole('guest')
