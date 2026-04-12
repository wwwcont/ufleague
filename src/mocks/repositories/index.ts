import type {
  CabinetRepository,
  BracketRepository,
  CommentsRepository,
  EventsRepository,
  MatchesRepository,
  PlayersRepository,
  SearchRepository,
  SessionRepository,
  StandingsRepository,
  TeamsRepository,
  UsersRepository,
  UploadsRepository,
} from '../../domain/repositories/contracts'
import { bracketGroups, bracketSettings, bracketStages } from '../data/bracket'
import { comments, currentCommentAuthor } from '../data/comments'
import { events } from '../data/events'
import { matches } from '../data/matches'
import { players } from '../data/players'
import { defaultSession, makeSessionByRole } from '../data/session'
import { standings } from '../data/standings'
import { teams } from '../data/teams'

export const teamsRepository: TeamsRepository = {
  async getTeams() {
    return teams
  },
  async getTeamById(teamId) {
    return teams.find((t) => t.id === teamId) ?? null
  },
  async createTeam() {
    return { id: `team_mock_${Date.now()}` }
  },
}

export const playersRepository: PlayersRepository = {
  async getPlayers(teamId) {
    return teamId ? players.filter((p) => p.teamId === teamId) : players
  },
  async getPlayerById(playerId) {
    return players.find((p) => p.id === playerId) ?? null
  },
  async createPlayer() {
    return
  },
}

export const matchesRepository: MatchesRepository = {
  async getMatches() {
    return matches
  },
  async getMatchById(matchId) {
    return matches.find((m) => m.id === matchId) ?? null
  },
  async createMatch() {
    return { id: `match_mock_${Date.now()}` }
  },
}

export const standingsRepository: StandingsRepository = {
  async getStandings() {
    return standings
  },
}

export const bracketRepository: BracketRepository = {
  async getBracket() {
    return { stages: bracketStages, groups: bracketGroups, settings: bracketSettings }
  },
}





export const eventsRepository: EventsRepository = {
  async getEvents() {
    return events
  },
  async getEventById(eventId) {
    return events.find((event) => event.id === eventId) ?? null
  },
  async createEventForScope() {
    return
  },
  async updateEventForScope() {
    return
  },
  async deleteEvent() {
    return
  },
}

export const commentsRepository: CommentsRepository = {
  async getComments(entityType, entityId) {
    return comments
      .filter((comment) => comment.entityType === entityType && comment.entityId === entityId && comment.parentId === null)
      .map((comment) => ({
        ...comment,
        replies: comments.filter((reply) => reply.parentId === comment.id),
      }))
  },
  async getCurrentAuthor() {
    return currentCommentAuthor
  },
  async createComment() {
    return
  },
  async replyToComment() {
    return
  },
  async updateComment() {
    return
  },
  async deleteComment() {
    return
  },
  async setReaction() {
    return
  },
}



let inMemorySession = defaultSession

export const sessionRepository: SessionRepository = {
  async getSession() {
    return inMemorySession
  },
  async startTelegramLogin() {
    return { authUrl: 'https://t.me/ufleague_auth_bot', requestId: 'mock_request', expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }
  },
  async completeTelegramLoginWithCode() {
    inMemorySession = makeSessionByRole('superadmin')
    return inMemorySession
  },
  async loginAsDevRole(role) {
    inMemorySession = makeSessionByRole(role)
    return inMemorySession
  },
  async logout() {
    inMemorySession = makeSessionByRole('guest')
  },
}

export const searchRepository: SearchRepository = {
  async searchAll(query) {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const teamResults = teams
      .filter((t) => t.name.toLowerCase().includes(q))
      .map((t) => ({ id: `s_team_${t.id}`, type: 'team' as const, entityId: t.id, title: t.name, subtitle: t.city, route: `/teams/${t.id}` }))

    const playerResults = players
      .filter((p) => p.displayName.toLowerCase().includes(q))
      .map((p) => ({ id: `s_player_${p.id}`, type: 'player' as const, entityId: p.id, title: p.displayName, subtitle: p.position, route: `/players/${p.id}` }))

    const matchResults = matches
      .filter((m) => m.round.toLowerCase().includes(q) || m.venue.toLowerCase().includes(q))
      .map((m) => ({ id: `s_match_${m.id}`, type: 'match' as const, entityId: m.id, title: `${m.round} • ${m.time}`, subtitle: m.venue, route: `/matches/${m.id}` }))

    return [...teamResults, ...playerResults, ...matchResults]
  },
}

let mockProfile = {
  userId: '1',
  username: 'mock_user',
  displayName: 'Mock User',
  bio: '',
  avatarUrl: '',
  socials: {} as Record<string, string>,
}

let mockTournamentCycles: Array<{ id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }> = [
  { id: 'cycle_2026', name: 'Сезон 2026', bracketTeamCapacity: 16 as const, isActive: true },
]

export const cabinetRepository: CabinetRepository = {
  async getMyProfile() {
    return mockProfile
  },
  async updateMyProfile(input) {
    mockProfile = { ...mockProfile, ...input }
  },
  async createTeamEvent() {
    return
  },
  async adminModerateComment() {
    return
  },
  async adminBlockComments() {
    return
  },
  async superadminAssignRoles() {
    return
  },
  async superadminAssignPermissions() {
    return
  },
  async superadminAssignRestrictions() {
    return
  },
  async superadminSetGlobalSetting() {
    return
  },
  async getMyActions() {
    return [
      { id: 'a1', action: 'comment.create', targetType: 'team', targetId: '1', createdAt: new Date().toISOString(), route: '/teams/1' },
      { id: 'a2', action: 'event.create', targetType: 'event', targetId: '1', createdAt: new Date(Date.now() - 3600_000).toISOString(), route: '/events/1' },
    ]
  },
  async getTournamentCycles() {
    return mockTournamentCycles
  },
  async createTournamentCycle(input) {
    mockTournamentCycles = [
      ...mockTournamentCycles.map((cycle) => ({ ...cycle, isActive: input.isActive ? false : cycle.isActive })),
      { id: `cycle_${mockTournamentCycles.length + 1}`, name: input.name, bracketTeamCapacity: input.bracketTeamCapacity, isActive: Boolean(input.isActive) },
    ]
  },
  async setActiveTournamentCycle(cycleId) {
    mockTournamentCycles = mockTournamentCycles.map((cycle) => ({ ...cycle, isActive: cycle.id === cycleId }))
  },
  async updateTournamentBracketSettings(cycleId, settings) {
    mockTournamentCycles = mockTournamentCycles.map((cycle) => (cycle.id === cycleId ? { ...cycle, bracketTeamCapacity: settings.teamCapacity } : cycle))
  },
  async createBracketTie() {
    return { id: `tie_mock_${Date.now()}` }
  },
  async attachMatchToTie() {
    return
  },
}

export const usersRepository: UsersRepository = {
  async getUserCard(userId) {
    if (userId === '102') {
      return {
        id: '102',
        displayName: 'М. Картер',
        telegramUsername: 'mcarter',
        statuses: ['player'],
        lastSeenAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        isOnline: true,
        playerId: 'p1',
        teamId: 'team_1',
      }
    }
    return {
      id: userId,
      displayName: `Пользователь #${userId}`,
      statuses: ['guest'],
      isOnline: false,
    }
  },
  async findByTelegramUsername(username) {
    const normalized = username.trim().replace(/^@/, '')
    if (!normalized) return null
    return {
      id: `user_${normalized}`,
      displayName: `@${normalized}`,
      telegramUsername: normalized,
      statuses: ['player'],
      isOnline: false,
    }
  },
  async getUserProfile(userId) {
    return {
      userId,
      username: `user_${userId}`,
      displayName: `Пользователь #${userId}`,
      bio: '',
      avatarUrl: '',
      socials: {},
    }
  },
  async updateUserProfile() {
    return
  },
}

export const uploadsRepository: UploadsRepository = {
  async uploadImage(file) {
    return { url: URL.createObjectURL(file) }
  },
}

export const repositories = {
  teamsRepository,
  playersRepository,
  matchesRepository,
  standingsRepository,
  bracketRepository,
  searchRepository,
  commentsRepository,
  eventsRepository,
  sessionRepository,
  cabinetRepository,
  usersRepository,
  uploadsRepository,
}
