import type { AuthSession, PermissionKey, SessionUser, UserRole } from '../../domain/entities/types'

const rolePermissions: Record<UserRole, PermissionKey[]> = {
  guest: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react'],
  player: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react'],
  captain: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react', 'event.create', 'team.squad.manage', 'team.invite.manage'],
  admin: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react', 'event.create', 'event.edit', 'event.delete', 'tournament.match.create', 'tournament.team.create', 'tournament.moderate'],
  superadmin: ['comment.create', 'comment.delete.own', 'comment.reply', 'comment.react', 'event.create', 'event.edit', 'event.delete', 'tournament.match.create', 'tournament.team.create', 'tournament.moderate', 'rbac.manage', 'settings.global.manage'],
}

const usersByRole: Record<UserRole, SessionUser> = {
  guest: { id: 'u_guest', displayName: 'Guest_42', role: 'guest', roles: ['guest'] },
  player: { id: 'u_player', displayName: 'М. Картер', role: 'player', roles: ['player'], playerProfileId: 'p1', teamId: 'team_1', telegramHandle: '@mcarter', telegramId: '9001001' },
  captain: { id: 'u_captain', displayName: 'Капитан ССК', role: 'captain', roles: ['captain'], playerProfileId: 'p2', teamId: 'team_1', telegramHandle: '@captain_ssk', telegramId: '9001002' },
  admin: { id: 'u_admin', displayName: 'Admin UFL', role: 'admin', roles: ['admin'], playerProfileId: 'p3', teamId: 'team_2', telegramHandle: '@ufl_admin', telegramId: '9001003' },
  superadmin: { id: 'u_superadmin', displayName: 'Superadmin UFL', role: 'superadmin', roles: ['superadmin'], playerProfileId: 'p4', teamId: 'team_3', telegramHandle: '@ufl_superadmin', telegramId: '9001004' },
}

export const makeSessionByRole = (role: UserRole): AuthSession => ({
  isAuthenticated: role !== 'guest',
  user: usersByRole[role],
  permissions: rolePermissions[role],
  lastLoginAt: '2026-04-09 13:00',
})

export const defaultSession = makeSessionByRole('guest')
