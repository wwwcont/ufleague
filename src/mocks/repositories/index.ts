import type {
  CabinetRepository,
  CommentsRepository,
  EventsRepository,
  MatchesRepository,
  PlayoffGridRepository,
  PlayersRepository,
  SearchRepository,
  SessionRepository,
  StandingsRepository,
  TeamsRepository,
  UsersRepository,
  UploadsRepository,
} from '../../domain/repositories/contracts'
import type { FormResult, PublicUserCard, UserRole } from '../../domain/entities/types'
import { comments, currentCommentAuthor } from '../data/comments'
import { events } from '../data/events'
import { matches } from '../data/matches'
import { players } from '../data/players'
import { defaultSession, makeSessionByRole } from '../data/session'
import { standings } from '../data/standings'
import { teams } from '../data/teams'

let inMemoryTeams = teams.map((team) => ({ ...team, socials: { ...(team.socials ?? {}), custom: [...(team.socials?.custom ?? [])] } }))
let inMemoryPlayers = players.map((player) => ({ ...player, socials: { ...(player.socials ?? {}) }, stats: { ...player.stats } }))

let inMemorySession = defaultSession

const STORAGE_KEY = 'ufleague.mock.repositories.v1'

type PersistedMockState = {
  teams?: typeof inMemoryTeams
  players?: typeof inMemoryPlayers
  session?: typeof inMemorySession
  profile?: typeof mockProfile
  tournamentCycles?: typeof mockTournamentCycles
}

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage

const saveState = () => {
  if (!canUseStorage()) return
  const payload: PersistedMockState = {
    teams: inMemoryTeams,
    players: inMemoryPlayers,
    session: inMemorySession,
    profile: mockProfile,
    tournamentCycles: mockTournamentCycles,
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

const loadState = (): PersistedMockState | null => {
  if (!canUseStorage()) return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PersistedMockState
  } catch {
    return null
  }
}

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
  reader.onload = () => {
    const result = reader.result
    if (typeof result === 'string' && result.trim()) {
      resolve(result)
      return
    }
    reject(new Error('Пустой результат чтения файла'))
  }
  reader.readAsDataURL(file)
})

const userDirectory = new Map<string, { id: string; displayName: string; telegramUsername: string }>()
const bootstrapUsers = () => {
  for (const player of inMemoryPlayers) {
    const telegramUsername = player.userId.replace(/^u_/, '')
    userDirectory.set(player.userId, { id: player.userId, displayName: player.displayName, telegramUsername })
  }
  const knownRoles: UserRole[] = ['player', 'captain', 'admin', 'superadmin']
  for (const role of knownRoles) {
    const session = makeSessionByRole(role)
    userDirectory.set(session.user.id, {
      id: session.user.id,
      displayName: session.user.displayName,
      telegramUsername: (session.user.telegramHandle ?? '').replace(/^@/, '') || session.user.id,
    })
  }
}
bootstrapUsers()

const ensurePlayerForUser = (userId: string, teamId: string, fallbackName: string) => {
  const existing = inMemoryPlayers.find((item) => item.userId === userId)
  if (existing) {
    existing.teamId = teamId
    return existing
  }
  const next = {
    id: `p_mock_${inMemoryPlayers.length + 1}`,
    userId,
    teamId,
    displayName: fallbackName,
    number: 99,
    position: 'MF' as const,
    age: 24,
    avatar: null,
    bio: 'Создано через mock flow',
    socials: {},
    stats: { goals: 0, assists: 0, appearances: 0 },
  }
  inMemoryPlayers = [next, ...inMemoryPlayers]
  return next
}

const syncSessionLinks = () => {
  if (!inMemorySession.isAuthenticated) return
  const player = inMemoryPlayers.find((item) => item.userId === inMemorySession.user.id)
  if (!player) return
  inMemorySession = {
    ...inMemorySession,
    user: {
      ...inMemorySession.user,
      playerProfileId: player.id,
      teamId: player.teamId,
    },
  }
}

export const teamsRepository: TeamsRepository = {
  async getTeams() {
    return inMemoryTeams
  },
  async getTeamById(teamId) {
    return inMemoryTeams.find((t) => t.id === teamId) ?? null
  },
  async createTeam(input) {
    const nextId = `team_mock_${Date.now()}`
    const created = {
      id: nextId,
      name: input.name,
      shortName: (input.shortName ?? input.name.slice(0, 3)).toUpperCase().slice(0, 3),
      logoUrl: input.logoUrl ?? null,
      captainUserId: inMemorySession.isAuthenticated ? inMemorySession.user.id : null,
      city: 'Новый город',
      slogan: '',
      description: input.description,
      socials: { custom: [] },
      coach: 'TBD',
      group: 'A',
      form: ['D', 'D', 'D', 'D', 'D'] as FormResult[],
      statsSummary: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
    }
    inMemoryTeams = [created, ...inMemoryTeams]

    if (inMemorySession.isAuthenticated) {
      const player = ensurePlayerForUser(inMemorySession.user.id, created.id, inMemorySession.user.displayName)
      inMemorySession = {
        ...inMemorySession,
        user: {
          ...inMemorySession.user,
          teamId: created.id,
          playerProfileId: player.id,
        },
      }
    }

    saveState()
    return { id: nextId }
  },
  async updateTeam(teamId, patch) {
    inMemoryTeams = inMemoryTeams.map((team) => {
      if (team.id !== teamId) return team
      return {
        ...team,
        name: patch.name ?? team.name,
        shortName: patch.shortName ?? team.shortName,
        logoUrl: patch.logoUrl ?? team.logoUrl,
        description: patch.description ?? team.description,
        slogan: patch.slogan ?? team.slogan,
        socials: {
          ...team.socials,
          ...(patch.socials ?? {}),
          custom: patch.socials?.custom ?? team.socials?.custom,
        },
      }
    })
    saveState()
  },
  async captainInviteByUsername(teamId, username) {
    const normalized = username.trim().replace(/^@/, '')
    const target = [...userDirectory.values()].find((item) => item.telegramUsername === normalized)
    if (!target) return
    ensurePlayerForUser(target.id, teamId, target.displayName)
    syncSessionLinks()
    saveState()
  },
}

export const playersRepository: PlayersRepository = {
  async getPlayers(teamId) {
    return teamId ? inMemoryPlayers.filter((p) => p.teamId === teamId) : inMemoryPlayers
  },
  async getPlayerById(playerId) {
    return inMemoryPlayers.find((p) => p.id === playerId) ?? null
  },
  async createPlayer(input) {
    ensurePlayerForUser(input.userId, input.teamId, input.fullName)
    syncSessionLinks()
    saveState()
  },
}

export const matchesRepository: MatchesRepository = {
  async getMatches(options) {
    return options?.includeArchived ? matches : matches.filter((match) => !match.archived)
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

let mockPlayoffGrid: { cells: any[]; lines: any[] } = { cells: [], lines: [] }
export const playoffGridRepository: PlayoffGridRepository = {
  async getPlayoffGrid() {
    return {
      cells: mockPlayoffGrid.cells.map((cell) => ({ ...cell, attachedMatchIds: [...cell.attachedMatchIds], attachedMatches: [...cell.attachedMatches] })),
      lines: mockPlayoffGrid.lines.map((line) => ({ ...line })),
    }
  },
  async validateDraft(_tournamentId, payload) {
    const occupied = new Set<string>()
    payload.cells.forEach((cell) => {
      const key = `${cell.col}:${cell.row}`
      if (occupied.has(key)) throw new Error('duplicate cell position')
      occupied.add(key)
      if (cell.attachedMatchIds.length > 3) throw new Error('too many attached matches')
    })
  },
  async getMatchCandidates(_tournamentId, matchId) {
    const targetMatch = matches.find((item) => item.id === matchId)
    if (!targetMatch) return []
    return mockPlayoffGrid.cells
      .filter((cell) => {
        if (!cell.homeTeamId || !cell.awayTeamId) return false
        const direct = cell.homeTeamId === targetMatch.homeTeamId && cell.awayTeamId === targetMatch.awayTeamId
        const reverse = cell.homeTeamId === targetMatch.awayTeamId && cell.awayTeamId === targetMatch.homeTeamId
        return direct || reverse
      })
      .filter((cell) => (cell.attachedMatchIds?.length ?? 0) < 3)
  },
  async attachMatch(playoffCellId, matchId) {
    mockPlayoffGrid = {
      ...mockPlayoffGrid,
      cells: mockPlayoffGrid.cells.map((cell) => {
        if (cell.id !== playoffCellId) {
          return { ...cell, attachedMatchIds: cell.attachedMatchIds.filter((currentId: string) => currentId !== matchId) }
        }
        if (cell.attachedMatchIds.includes(matchId) || cell.attachedMatchIds.length >= 3) return cell
        return { ...cell, attachedMatchIds: [...cell.attachedMatchIds, matchId] }
      }),
    }
  },
  async detachMatch(playoffCellId, matchId) {
    mockPlayoffGrid = {
      ...mockPlayoffGrid,
      cells: mockPlayoffGrid.cells.map((cell) => (
        cell.id === playoffCellId
          ? { ...cell, attachedMatchIds: cell.attachedMatchIds.filter((currentId: string) => currentId !== matchId) }
          : cell
      )),
    }
  },
  async savePlayoffGrid(tournamentId, payload) {
    await this.validateDraft(tournamentId, payload)
    const byRef = new Map<string, string>()
    const cells = payload.cells.map((cell, index) => {
      const id = cell.id ?? `pg_${Date.now()}_${index}`
      if (cell.tempId) byRef.set(cell.tempId, id)
      byRef.set(id, id)
      const attachedMatches = cell.attachedMatchIds.map((matchId) => ({
        id: matchId,
        status: 'scheduled' as const,
        homeScore: 0,
        awayScore: 0,
      }))
      return {
        id,
        homeTeamId: cell.homeTeamId,
        awayTeamId: cell.awayTeamId,
        col: cell.col,
        row: cell.row,
        attachedMatchIds: [...cell.attachedMatchIds],
        attachedMatches,
        aggregateHomeScore: attachedMatches.length ? attachedMatches.reduce((sum, m) => sum + m.homeScore, 0) : null,
        aggregateAwayScore: attachedMatches.length ? attachedMatches.reduce((sum, m) => sum + m.awayScore, 0) : null,
        winnerTeamId: null,
        allMatchesFinished: false,
      }
    })
    const lines = payload.lines.map((line, index) => ({
      id: line.id ?? `pl_${Date.now()}_${index}`,
      fromPlayoffId: byRef.get(line.fromRef) ?? line.fromRef,
      toPlayoffId: byRef.get(line.toRef) ?? line.toRef,
    }))
    mockPlayoffGrid = { cells, lines }
    return { cells, lines }
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

export const sessionRepository: SessionRepository = {
  async getSession() {
    syncSessionLinks()
    return inMemorySession
  },
  async startTelegramLogin() {
    return { authUrl: 'https://t.me/ufleague_auth_bot', requestId: 'mock_request', expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() }
  },
  async completeTelegramLoginWithCode() {
    inMemorySession = makeSessionByRole('superadmin')
    syncSessionLinks()
    saveState()
    return inMemorySession
  },
  async loginAsDevRole(role) {
    inMemorySession = makeSessionByRole(role)
    syncSessionLinks()
    saveState()
    return inMemorySession
  },
  async logout() {
    inMemorySession = makeSessionByRole('guest')
    saveState()
  },
}

export const searchRepository: SearchRepository = {
  async searchAll(query) {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const teamResults = inMemoryTeams
      .filter((t) => t.name.toLowerCase().includes(q))
      .map((t) => ({ id: `s_team_${t.id}`, type: 'team' as const, entityId: t.id, title: t.name, subtitle: t.city, route: `/teams/${t.id}` }))

    const playerResults = inMemoryPlayers
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
  telegramId: '10001',
  telegramUsername: 'mock_user',
  displayName: 'Mock User',
  firstName: 'Mock',
  lastName: 'User',
  bio: '',
  avatarUrl: '',
  socials: {} as Record<string, string>,
}

let mockTournamentCycles: Array<{ id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }> = [
  { id: 'cycle_2026', name: 'Сезон 2026', bracketTeamCapacity: 16 as const, isActive: true },
]

const persisted = loadState()
if (persisted) {
  inMemoryTeams = Array.isArray(persisted.teams) ? persisted.teams : inMemoryTeams
  inMemoryPlayers = Array.isArray(persisted.players) ? persisted.players : inMemoryPlayers
  inMemorySession = persisted.session ?? inMemorySession
  mockProfile = persisted.profile ?? mockProfile
  mockTournamentCycles = Array.isArray(persisted.tournamentCycles) ? persisted.tournamentCycles : mockTournamentCycles
}
userDirectory.clear()
bootstrapUsers()

export const cabinetRepository: CabinetRepository = {
  async getMyProfile() {
    return mockProfile
  },
  async updateMyProfile(input) {
    mockProfile = { ...mockProfile, ...input }
    saveState()
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
      { id: 'a1', action: 'comment.create', targetType: 'comment', targetId: '1', createdAt: new Date().toISOString(), route: '/comments/team/1#comment-1', metadata: { entity_type: 'team', entity_id: 1 } },
      { id: 'a2', action: 'event.create', targetType: 'event', targetId: '1', createdAt: new Date(Date.now() - 3600_000).toISOString(), route: '/events/1', metadata: { title: 'Mock event' } },
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
    saveState()
  },
  async setActiveTournamentCycle(cycleId) {
    mockTournamentCycles = mockTournamentCycles.map((cycle) => ({ ...cycle, isActive: cycle.id === cycleId }))
    saveState()
  },
  async updateTournamentBracketSettings(cycleId, settings) {
    mockTournamentCycles = mockTournamentCycles.map((cycle) => (cycle.id === cycleId ? { ...cycle, bracketTeamCapacity: settings.teamCapacity } : cycle))
    saveState()
  },
}

const buildUserCard = (user: { id: string; displayName: string; telegramUsername: string }): PublicUserCard => {
  const player = inMemoryPlayers.find((item) => item.userId === user.id)
  const teamId = player?.teamId
  const statuses: UserRole[] = []
  if (player) statuses.push('player')
  if (inMemoryTeams.some((team) => team.captainUserId === user.id)) statuses.push('captain')
  if (statuses.length === 0) statuses.push('guest')
  return {
    id: user.id,
    displayName: user.displayName,
    telegramUsername: user.telegramUsername,
    statuses,
    isOnline: false,
    playerId: player?.id,
    teamId,
  }
}

export const usersRepository: UsersRepository = {
  async getUserCard(userId) {
    const user = userDirectory.get(userId)
    if (!user) {
      return {
        id: userId,
        displayName: `Пользователь #${userId}`,
        statuses: ['guest'],
        isOnline: false,
      }
    }
    return buildUserCard(user)
  },
  async findByTelegramUsername(username) {
    const normalized = username.trim().replace(/^@/, '')
    if (!normalized) return null
    const user = [...userDirectory.values()].find((item) => item.telegramUsername === normalized)
    return user ? buildUserCard(user) : null
  },
  async getUserProfile(userId) {
    const user = userDirectory.get(userId)
    const player = inMemoryPlayers.find((item) => item.userId === userId)
    return {
      userId,
      username: userId,
      telegramId: userId,
      telegramUsername: user?.telegramUsername ?? userId,
      displayName: user?.displayName ?? `Пользователь #${userId}`,
      firstName: (user?.displayName ?? '').split(' ')[0] ?? '',
      lastName: (user?.displayName ?? '').split(' ').slice(1).join(' '),
      bio: player?.bio ?? '',
      avatarUrl: player?.avatar ?? '',
      socials: {},
    }
  },
  async updateUserProfile(userId, input) {
    const fullName = `${input.firstName} ${input.lastName}`.trim() || input.displayName
    const existing = userDirectory.get(userId)
    userDirectory.set(userId, {
      id: userId,
      displayName: input.displayName,
      telegramUsername: (existing?.telegramUsername ?? userId).replace(/^@/, ''),
    })
    inMemoryPlayers = inMemoryPlayers.map((player) => (
      player.userId === userId
        ? { ...player, displayName: fullName, bio: input.bio, avatar: input.avatarUrl || player.avatar }
        : player
    ))
    if (mockProfile.userId === userId) {
      mockProfile = { ...mockProfile, ...input, displayName: input.displayName }
    }
    saveState()
    return
  },
}

export const uploadsRepository: UploadsRepository = {
  async uploadImage(file) {
    return { url: await fileToDataUrl(file) }
  },
}

export const repositories = {
  teamsRepository,
  playersRepository,
  matchesRepository,
  standingsRepository,
  playoffGridRepository,
  searchRepository,
  commentsRepository,
  eventsRepository,
  sessionRepository,
  cabinetRepository,
  usersRepository,
  uploadsRepository,
}
