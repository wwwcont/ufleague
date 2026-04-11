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
} from '../../domain/repositories/contracts'
import type { AuthSession, BackendMeDTO, BracketMatchGroup, BracketSettings, BracketStage, CommentAuthorState, CommentNode, Match, Player, PublicEvent, SearchResult, StandingRow, Team, UserRole } from '../../domain/entities/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getCsrfToken(): string {
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : 'dev-csrf-token'
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isWrite = (init?.method ?? 'GET').toUpperCase() !== 'GET'
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(isWrite ? { 'X-CSRF-Token': getCsrfToken() } : {}), ...(init?.headers ?? {}) }, ...init })
  if (!res.ok) {
    const message = (await res.text()).trim() || `API ${res.status}`
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const mapTeam = (t: any): Team => ({
  id: String(t.id),
  name: t.name,
  shortName: t.name?.slice(0, 3)?.toUpperCase() ?? 'TBD',
  logoUrl: t.logo_url || null,
  captainUserId: t.captain_user_id ? String(t.captain_user_id) : null,
  city: t.description || 'UFL Development',
  coach: t.socials?.coach ?? t.socials?.captain ?? 'TBD',
  group: 'A',
  form: ['D', 'D', 'D', 'D', 'D'],
  statsSummary: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
})

const mapPlayer = (p: any): Player => ({
  id: String(p.id),
  teamId: String(p.team_id ?? ''),
  displayName: p.full_name,
  number: p.shirt_number ?? 0,
  position: (p.position || 'MF') as Player['position'],
  age: 21,
  avatar: p.avatar_url || null,
  stats: { goals: 0, assists: 0, appearances: Number(p.appearances ?? 0) },
})

const mapMatch = (m: any): Match => ({
  id: String(m.id),
  round: `Round ${new Date(m.start_at).toISOString().slice(0, 10)}`,
  date: new Date(m.start_at).toISOString().slice(0, 10),
  time: new Date(m.start_at).toISOString().slice(11, 16),
  venue: m.venue || 'TBD',
  status: (m.status === 'live' || m.status === 'half_time' || m.status === 'finished' ? m.status : 'scheduled') as Match['status'],
  homeTeamId: String(m.home_team_id),
  awayTeamId: String(m.away_team_id),
  score: { home: m.home_score ?? 0, away: m.away_score ?? 0 },
  events: [],
  featured: m.status === 'live',
  stage: m.extra_time?.stage ?? undefined,
  tour: m.extra_time?.tour ?? undefined,
  referee: m.extra_time?.referee ?? undefined,
  broadcastUrl: m.extra_time?.broadcast_url ?? undefined,
  bracketPosition: {
    stageSlotColumn: m.stage_slot_column ?? null,
    stageSlotRow: m.stage_slot_row ?? null,
  },
})

const mapEvent = (e: any): PublicEvent => ({
  id: String(e.id),
  title: e.title,
  summary: e.body?.slice(0, 120) ?? '',
  text: e.body,
  timestamp: e.created_at,
  source: 'backend',
  authorName: e.author_name || 'Команда турнира',
  category: 'news',
  entityType: e.scope_type,
  entityId: e.scope_id ? String(e.scope_id) : undefined,
})

const mapComment = (c: any): CommentNode => ({
  id: String(c.id),
  entityType: c.entity_type,
  entityId: String(c.entity_id),
  parentId: c.parent_comment_id ? String(c.parent_comment_id) : null,
  authorName: c.author_name ?? 'Пользователь',
  authorRole: 'guest',
  isOwn: false,
  createdAt: c.created_at,
  text: c.body,
  reactions: { likes: c.like_count ?? 0, dislikes: c.dislike_count ?? 0, userReaction: null },
  canReply: true,
  canDelete: false,
  replies: [],
})

const guestAuthor: CommentAuthorState = { id: '0', name: 'Guest', role: 'guest', isGuest: true, canComment: true, cooldownSeconds: 30 }

const mapAuthorState = (payload: any): CommentAuthorState => ({
  id: String(payload.id ?? '0'),
  name: payload.name ?? 'Guest',
  role: (payload.role ?? 'guest') as CommentAuthorState['role'],
  isGuest: Boolean(payload.is_guest ?? payload.isGuest ?? true),
  canComment: Boolean(payload.can_comment ?? payload.canComment ?? true),
  cooldownSeconds: Number(payload.cooldown_seconds ?? payload.cooldownSeconds ?? 0),
  blockedReason: payload.blocked_reason ?? payload.blockedReason,
})

export const teamsRepository: TeamsRepository = {
  async getTeams() { return (await api<any[]>('/api/teams')).map(mapTeam) },
  async getTeamById(teamId) { try { return mapTeam(await api<any>(`/api/teams/${teamId}`)) } catch { return null } },
  async createTeam(input) {
    await api('/api/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        slug: input.slug,
        description: input.description,
        logo_url: input.logoUrl ?? '',
        socials: {},
      }),
    })
  },
  async updateTeam(teamId, patch) {
    const current = await api<any>(`/api/teams/${teamId}`)
    await api(`/api/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: patch.name ?? current.name,
        slug: current.slug,
        description: patch.city ?? current.description ?? '',
        logo_url: patch.logoUrl ?? current.logo_url ?? '',
        socials: current.socials ?? {},
      }),
    })
  },
  async captainInviteByUsername(teamId, username) {
    await api(`/api/captain/teams/${teamId}/invite`, { method: 'POST', body: JSON.stringify({ username }) })
  },
  async captainUpdateSocials(teamId, socials) {
    await api(`/api/captain/teams/${teamId}/socials`, { method: 'PATCH', body: JSON.stringify({ socials }) })
  },
  async captainSetRosterVisibility(teamId, playerId, isVisible) {
    await api(`/api/captain/teams/${teamId}/roster/${playerId}`, { method: 'PATCH', body: JSON.stringify({ visible: isVisible }) })
  },
  async adminTransferCaptain(teamId, newCaptainUserId) {
    await api(`/api/admin/teams/${teamId}/transfer-captain`, { method: 'POST', body: JSON.stringify({ new_captain_user_id: Number(newCaptainUserId) }) })
  },
}
export const playersRepository: PlayersRepository = {
  async getPlayers(teamId) { const list = (await api<any[]>('/api/players')).map(mapPlayer); return teamId ? list.filter((p) => p.teamId === teamId) : list },
  async getPlayerById(playerId) { try { return mapPlayer(await api<any>(`/api/players/${playerId}`)) } catch { return null } },
  async createPlayer(input) {
    await api('/api/players', {
      method: 'POST',
      body: JSON.stringify({
        team_id: Number(input.teamId),
        full_name: input.fullName,
        nickname: '',
        avatar_url: input.avatarUrl ?? '',
        socials: {},
        position: input.position,
        shirt_number: input.shirtNumber,
      }),
    })
  },
  async updatePlayer(playerId, patch) {
    const current = await api<any>(`/api/players/${playerId}`)
    await api(`/api/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        team_id: current.team_id,
        full_name: patch.displayName ?? current.full_name,
        nickname: current.nickname ?? '',
        avatar_url: patch.avatar ?? current.avatar_url ?? '',
        socials: current.socials ?? {},
        position: patch.position ?? current.position ?? 'MF',
        shirt_number: patch.number ?? current.shirt_number ?? 0,
      }),
    })
  },
}
export const matchesRepository: MatchesRepository = {
  async getMatches() { return (await api<any[]>('/api/matches')).map(mapMatch) },
  async getMatchById(matchId) { try { return mapMatch(await api<any>(`/api/matches/${matchId}`)) } catch { return null } },
  async createMatch(input) {
    await api('/api/matches', {
      method: 'POST',
      body: JSON.stringify({
        home_team_id: Number(input.homeTeamId),
        away_team_id: Number(input.awayTeamId),
        start_at: input.startAt,
        status: input.status,
        home_score: 0,
        away_score: 0,
        extra_time: {},
        venue: input.venue,
      }),
    })
  },
  async updateMatch(matchId, patch) {
    const current = await api<any>(`/api/matches/${matchId}`)
    const mergedExtra = {
      ...(current.extra_time ?? {}),
      ...(patch.broadcastUrl !== undefined ? { broadcast_url: patch.broadcastUrl } : {}),
    }
    await api(`/api/matches/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        home_team_id: current.home_team_id,
        away_team_id: current.away_team_id,
        start_at: current.start_at,
        status: patch.status ?? current.status,
        home_score: patch.homeScore ?? current.home_score,
        away_score: patch.awayScore ?? current.away_score,
        extra_time: mergedExtra,
        venue: patch.venue ?? current.venue ?? '',
      }),
    })
  },
}
export const standingsRepository: StandingsRepository = {
  async getStandings() {
    const rows = await api<any[]>('/api/standings')
    return rows.map((row): StandingRow => ({
      position: row.position,
      teamId: String(row.team_id),
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goals_for,
      goalsAgainst: row.goals_against,
      goalDiff: row.goal_diff,
      points: row.points,
    }))
  },
}
export const bracketRepository: BracketRepository = {
  async getBracket() {
    const data = await api<{ settings?: any; stages?: any[]; groups?: any[]; rounds?: any[]; matches?: any[] }>('/api/bracket')
    const stagesRaw = data.stages ?? data.rounds ?? []
    const groupsRaw = data.groups ?? data.matches ?? []

    const settings: BracketSettings = {
      teamCapacity: [4, 8, 16, 32].includes(Number(data.settings?.team_capacity)) ? Number(data.settings?.team_capacity) as BracketSettings['teamCapacity'] : 16,
    }

    const stages: BracketStage[] = stagesRaw.map((stage, index) => ({
      id: String(stage.id),
      label: stage.label,
      order: Number(stage.order ?? index + 1),
      size: Number(stage.size ?? 1),
    }))

    const groups: BracketMatchGroup[] = groupsRaw.map((group) => {
      const firstLegScore = group.first_leg_home_score !== undefined && group.first_leg_away_score !== undefined
        ? { home: Number(group.first_leg_home_score), away: Number(group.first_leg_away_score) }
        : group.home_score !== undefined && group.away_score !== undefined
          ? { home: Number(group.home_score), away: Number(group.away_score) }
          : undefined

      const secondLegScore = group.second_leg_home_score !== undefined && group.second_leg_away_score !== undefined
        ? { home: Number(group.second_leg_home_score), away: Number(group.second_leg_away_score) }
        : undefined

      return {
        id: String(group.id),
        stageId: String(group.stage_id ?? group.round_id),
        slot: Number(group.slot ?? 1),
        homeTeamId: group.home_team_id ? String(group.home_team_id) : null,
        awayTeamId: group.away_team_id ? String(group.away_team_id) : null,
        winnerTeamId: group.winner_team_id ? String(group.winner_team_id) : null,
        tieFormat: Number(group.tie_format ?? (secondLegScore ? 2 : 1)) === 2 ? 2 : 1,
        firstLeg: {
          matchId: group.first_leg_match_id ? String(group.first_leg_match_id) : group.linked_match_id ? String(group.linked_match_id) : null,
          status: (group.first_leg_status ?? group.status ?? 'scheduled') as Match['status'],
          score: firstLegScore,
        },
        secondLeg: Number(group.tie_format ?? (secondLegScore ? 2 : 1)) === 2 ? {
          matchId: group.second_leg_match_id ? String(group.second_leg_match_id) : null,
          status: (group.second_leg_status ?? 'scheduled') as Match['status'],
          score: secondLegScore,
        } : undefined,
        adminLockedWinner: Boolean(group.admin_locked_winner),
      }
    })

    return { settings, stages, groups }
  },
}
export const searchRepository: SearchRepository = {
  async searchAll(query: string): Promise<SearchResult[]> {
    const q = query.trim()
    if (!q) return []
    const list = await api<any[]>(`/api/search?q=${encodeURIComponent(q)}`)
    return list.map((item) => ({
      id: item.id,
      type: item.type,
      entityId: item.entity_id,
      title: item.title,
      subtitle: item.subtitle,
      route: item.route,
    }))
  },
}
export const eventsRepository: EventsRepository = {
  async getEvents() { return (await api<any[]>('/api/events')).map(mapEvent) },
  async getEventById(id) { try { return mapEvent(await api<any>(`/api/events/${id}`)) } catch { return null } },
  async createEventForScope(input) {
    await api('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        scope_type: input.scopeType,
        scope_id: input.scopeId ? Number(input.scopeId) : null,
        title: input.title,
        body: input.body,
        metadata: {},
        visibility: 'public',
        is_pinned: false,
      }),
    })
  },
  async updateEventForScope(input) {
    await api(`/api/events/${input.eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        scope_type: input.scopeType,
        scope_id: input.scopeId ? Number(input.scopeId) : null,
        title: input.title,
        body: input.body,
        metadata: {},
        visibility: 'public',
        is_pinned: false,
      }),
    })
  },
  async deleteEvent(eventId) {
    await api(`/api/events/${eventId}`, { method: 'DELETE' })
  },
}
export const commentsRepository: CommentsRepository = {
  async getComments(entityType, entityId) {
    const [flatRaw, author] = await Promise.all([
      api<any[]>(`/api/comments?entityType=${entityType}&entityId=${entityId}`),
      api<any>('/api/comments/author-state').catch(() => null),
    ])
    const currentAuthor = author ? mapAuthorState(author) : guestAuthor
    const flat = flatRaw.map((raw) => {
      const comment = mapComment(raw)
      const isOwn = String(raw.author_user_id) === currentAuthor.id
      return {
        ...comment,
        isOwn,
        canDelete: isOwn || currentAuthor.role === 'admin' || currentAuthor.role === 'superadmin',
      }
    })
    const roots = flat.filter((c) => c.parentId === null)
    return roots.map((r) => ({ ...r, replies: flat.filter((x) => x.parentId === r.id) }))
  },
  async getCurrentAuthor(): Promise<CommentAuthorState> {
    try {
      return mapAuthorState(await api<any>('/api/comments/author-state'))
    } catch {
      return guestAuthor
    }
  },
  async createComment(entityType, entityId, text) {
    await api('/api/comments', { method: 'POST', body: JSON.stringify({ entity_type: entityType, entity_id: Number(entityId), body: text }) })
  },
  async replyToComment(parentCommentId, text) {
    await api(`/api/comments/${parentCommentId}/reply`, { method: 'POST', body: JSON.stringify({ body: text }) })
  },
  async deleteComment(commentId) {
    await api(`/api/comments/${commentId}`, { method: 'DELETE' })
  },
  async setReaction(commentId, reaction) {
    await api(`/api/comments/${commentId}/reactions`, { method: 'POST', body: JSON.stringify({ reaction_type: reaction }) })
  },
}

const guestSession: AuthSession = { isAuthenticated: false, user: { id: '0', displayName: 'Guest', role: 'guest' }, permissions: [] }

const rolePriority: Record<UserRole, number> = {
  guest: 0,
  player: 1,
  captain: 2,
  admin: 3,
  superadmin: 4,
}

const pickPrimaryRole = (roles: unknown): UserRole => {
  if (!Array.isArray(roles) || roles.length === 0) return 'guest'
  return roles
    .map((role) => String(role))
    .filter((role): role is UserRole => role in rolePriority)
    .sort((a, b) => rolePriority[b] - rolePriority[a])[0] ?? 'guest'
}

const mapMeToSession = (me: BackendMeDTO): AuthSession => {
  const role = pickPrimaryRole(me.user.roles)
  const permissions = Array.isArray(me.user.permissions) ? me.user.permissions : []

  return {
    isAuthenticated: true,
    user: {
      id: String(me.user.id),
      displayName: me.user.display_name,
      role,
      telegramHandle: me.user.username ? `@${String(me.user.username).replace(/^@/, '')}` : undefined,
      telegramId: me.user.telegram_id ? String(me.user.telegram_id) : undefined,
    },
    permissions: permissions as AuthSession['permissions'],
    lastLoginAt: me.session.created_at,
  }
}

export const sessionRepository: SessionRepository = {
  async getSession() {
    try {
      const me = await api<BackendMeDTO>('/api/auth/me')
      return mapMeToSession(me)
    } catch {
      return guestSession
    }
  },
  async startTelegramLogin(role) {
    const data = await api<{ auth_url?: string; authUrl?: string; request_id?: string; requestId?: string; expires_at?: string; expiresAt?: string }>('/api/auth/telegram/start', {
      method: 'POST',
      body: JSON.stringify(role ? { role } : {}),
    })
    return {
      authUrl: data.authUrl ?? data.auth_url ?? 'https://t.me/ufleague_auth_bot',
      requestId: data.requestId ?? data.request_id ?? '',
      expiresAt: data.expiresAt ?? data.expires_at ?? new Date().toISOString(),
    }
  },
  async completeTelegramLoginWithCode(requestId: string, code: string) {
    const me = await api<BackendMeDTO>('/api/auth/telegram/mock-code-login', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, code }),
    }).catch(async () => api<BackendMeDTO>('/api/auth/telegram/complete-code', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, code }),
    }))
    return mapMeToSession(me)
  },
  async loginAsDevRole(role) {
    const seeds: Record<string, { username: string; displayName: string }> = {
      player: { username: 'player_test', displayName: 'Player Test' },
      captain: { username: 'captain_alpha', displayName: 'Captain Alpha' },
      admin: { username: 'admin_test', displayName: 'Admin Test' },
      superadmin: { username: 'superadmin', displayName: 'Super Admin' },
    }
    const seed = seeds[role] ?? { username: `dev_${role}`, displayName: `Dev ${role}` }
    const me = await api<any>('/api/auth/dev-login', { method: 'POST', body: JSON.stringify({ username: seed.username, display_name: seed.displayName, roles: [role] }) })
    return {
      isAuthenticated: true,
      user: {
        id: String(me.user.id),
        displayName: me.user.display_name,
        role,
        telegramHandle: me.user.username ? `@${String(me.user.username).replace(/^@/, '')}` : undefined,
        telegramId: me.user.telegram_id ? String(me.user.telegram_id) : undefined,
      },
      permissions: [],
      lastLoginAt: me.session?.created_at,
    }
  },
  async logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
  },
}

const mapProfile = (payload: any) => ({
  userId: String(payload.user_id),
  username: String(payload.username ?? ''),
  displayName: String(payload.display_name ?? ''),
  bio: String(payload.bio ?? ''),
  avatarUrl: String(payload.avatar_url ?? ''),
  socials: (payload.socials ?? {}) as Record<string, string>,
})

export const cabinetRepository: CabinetRepository = {
  async getMyProfile() {
    return mapProfile(await api<any>('/api/me/profile'))
  },
  async updateMyProfile(input) {
    await api('/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        display_name: input.displayName,
        bio: input.bio,
        avatar_url: input.avatarUrl,
        socials: input.socials,
      }),
    })
  },
  async createTeamEvent(input) {
    await api('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        scope_type: 'team',
        scope_id: Number(input.teamId),
        title: input.title,
        body: input.body,
        metadata: {},
        visibility: 'public',
        is_pinned: false,
      }),
    })
  },
  async adminModerateComment(commentId) {
    await api(`/api/admin/comments/${commentId}/moderate-delete`, { method: 'POST' })
  },
  async adminBlockComments(input) {
    await api(`/api/admin/users/${input.userId}/comment-block`, {
      method: 'POST',
      body: JSON.stringify({
        permanent: input.permanent,
        until_unix: input.untilUnix,
        reason: input.reason,
      }),
    })
  },
  async superadminAssignRoles(input) {
    await api(`/api/superadmin/users/${input.userId}/roles`, { method: 'POST', body: JSON.stringify({ roles: input.roles }) })
  },
  async superadminAssignPermissions(input) {
    await api(`/api/superadmin/users/${input.userId}/permissions`, { method: 'POST', body: JSON.stringify({ permissions: input.permissions }) })
  },
  async superadminAssignRestrictions(input) {
    await api(`/api/superadmin/users/${input.userId}/restrictions`, { method: 'POST', body: JSON.stringify({ restrictions: input.restrictions }) })
  },
  async superadminSetGlobalSetting(input) {
    await api(`/api/superadmin/settings/${encodeURIComponent(input.key)}`, { method: 'PUT', body: JSON.stringify({ value: input.value }) })
  },
}

export const repositories = { teamsRepository, playersRepository, matchesRepository, standingsRepository, bracketRepository, searchRepository, commentsRepository, eventsRepository, sessionRepository, cabinetRepository }
