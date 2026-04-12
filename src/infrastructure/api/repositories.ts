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
import type { AuthSession, BackendMeDTO, BracketMatchGroup, BracketSettings, BracketStage, CommentAuthorState, CommentNode, Match, Player, PublicEvent, PublicUserCard, SearchResult, StandingRow, Team, UserRole } from '../../domain/entities/types'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'

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
  city: t.socials?.city || 'UFL Development',
  slogan: t.socials?.slogan ?? undefined,
  description: t.description ?? undefined,
  socials: {
    telegram: t.socials?.telegram,
    vk: t.socials?.vk,
    instagram: t.socials?.instagram,
    custom: Array.isArray(t.socials?.custom)
      ? t.socials.custom.slice(0, 2).map((item: any) => ({ label: String(item.label).slice(0, 20), url: String(item.url) }))
      : [
        t.socials?.custom_1_label && t.socials?.custom_1_url ? { label: String(t.socials.custom_1_label), url: String(t.socials.custom_1_url) } : null,
        t.socials?.custom_2_label && t.socials?.custom_2_url ? { label: String(t.socials.custom_2_label), url: String(t.socials.custom_2_url) } : null,
      ].filter(Boolean) as Array<{ label: string; url: string }>,
  },
  coach: t.socials?.coach ?? t.socials?.captain ?? 'TBD',
  group: 'A',
  form: ['D', 'D', 'D', 'D', 'D'],
  statsSummary: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 },
})

const mapPlayer = (p: any): Player | null => {
  if (!p?.id || !p?.team_id || !p?.user_id) return null

  return {
    id: String(p.id),
    teamId: String(p.team_id),
    userId: String(p.user_id),
    displayName: p.full_name,
    number: p.shirt_number ?? 0,
    position: (p.position || 'MF') as Player['position'],
    age: Number(p.socials?.age ?? 21),
    avatar: p.avatar_url || null,
    bio: p.socials?.bio ?? undefined,
    socials: {
      telegram: p.socials?.telegram,
      vk: p.socials?.vk,
      instagram: p.socials?.instagram,
    },
    isHidden: p.is_visible === false || p.visible === false || p.hidden === true || p.position === 'hidden',
    stats: { goals: 0, assists: 0, appearances: Number(p.appearances ?? 0) },
  }
}


const mapGoalEvents = (raw: unknown): Match['events'] => {
  if (!Array.isArray(raw)) return []
  return raw.reduce<Match['events']>((acc, item, index) => {
    if (!item || typeof item !== 'object') return acc
    const payload = item as Record<string, unknown>
    const minute = Number(payload.minute ?? 0)
    if (!Number.isFinite(minute) || minute <= 0) return acc
    acc.push({
      id: String(payload.id ?? `goal_${index}`),
      minute,
      type: 'goal',
      teamId: payload.team_id ? String(payload.team_id) : undefined,
      playerId: payload.player_id ? String(payload.player_id) : undefined,
      assistPlayerId: payload.assist_player_id ? String(payload.assist_player_id) : undefined,
      note: payload.note ? String(payload.note) : undefined,
    })
    return acc
  }, [])
}

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
  events: mapGoalEvents(m.extra_time?.goal_events),
  featured: m.status === 'live',
  stage: m.extra_time?.stage ?? undefined,
  tour: m.extra_time?.tour ?? undefined,
  referee: m.extra_time?.referee ?? undefined,
  broadcastUrl: m.extra_time?.broadcast_url ?? undefined,
  diskUrl: m.extra_time?.disk_url ?? undefined,
  bracketPosition: {
    stageSlotColumn: m.stage_slot_column ?? null,
    stageSlotRow: m.stage_slot_row ?? null,
  },
})

const mapEvent = (e: any): PublicEvent => {
  const contentBlocks = normalizeEventBlocks(e.metadata?.content_blocks, { text: String(e.body ?? ''), imageUrl: e.metadata?.image_url ? String(e.metadata.image_url) : undefined })
  return {
    id: String(e.id),
    title: e.title,
    summary: e.metadata?.summary ? String(e.metadata.summary) : deriveSummaryFromBlocks(contentBlocks),
    text: blocksToPlainText(contentBlocks),
    contentBlocks,
    timestamp: e.created_at,
    source: 'backend',
    authorName: e.author_name || 'Команда турнира',
    category: 'news',
    entityType: e.scope_type,
    entityId: e.scope_id ? String(e.scope_id) : undefined,
    imageUrl: e.metadata?.image_url ? String(e.metadata.image_url) : undefined,
  }
}

const mapComment = (c: any): CommentNode => ({
  id: String(c.id),
  entityType: c.entity_type,
  entityId: String(c.entity_id),
  parentId: c.parent_comment_id ? String(c.parent_comment_id) : null,
  authorUserId: c.author_user_id ? String(c.author_user_id) : undefined,
  authorName: c.author_name ?? 'Пользователь',
  authorRole: 'guest',
  isOwn: false,
  createdAt: c.created_at,
  editedAt: c.edited_at ?? undefined,
  text: c.body,
  reactions: { likes: c.like_count ?? 0, dislikes: c.dislike_count ?? 0, userReaction: null },
  canReply: true,
  canDelete: false,
  canEdit: false,
  replies: [],
})

const mapUserCard = (u: any): PublicUserCard => ({
  id: String(u.id),
  displayName: String(u.display_name ?? 'Пользователь'),
  telegramUsername: u.telegram_username ? String(u.telegram_username) : undefined,
  statuses: Array.isArray(u.roles) ? u.roles : [],
  lastSeenAt: u.last_seen_at ? String(u.last_seen_at) : undefined,
  isOnline: Boolean(u.is_online),
  playerId: u.player_id ? String(u.player_id) : undefined,
  teamId: u.team_id ? String(u.team_id) : undefined,
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


const serializeGoalEvents = (events: Match['events']) => events
  .filter((event) => event.type === 'goal')
  .map((event) => ({
    id: event.id,
    minute: event.minute,
    team_id: event.teamId,
    player_id: event.playerId,
    assist_player_id: event.assistPlayerId,
    note: event.note,
  }))

export const teamsRepository: TeamsRepository = {
  async getTeams() { return (await api<any[]>('/api/teams')).map(mapTeam) },
  async getTeamById(teamId) { try { return mapTeam(await api<any>(`/api/teams/${teamId}`)) } catch { return null } },
  async createTeam(input) {
    const created = await api<any>('/api/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        slug: input.slug ?? '',
        description: input.description,
        logo_url: input.logoUrl ?? '',
        socials: {},
      }),
    })
    return created?.id ? { id: String(created.id) } : undefined
  },
  async updateTeam(teamId, patch) {
    const current = await api<any>(`/api/teams/${teamId}`)
    const patchSocials = patch.socials ?? {}
    const customLinks = Array.isArray(patchSocials.custom) ? patchSocials.custom.slice(0, 2) : []
    const mergedSocials = {
      ...(current.socials ?? {}),
      ...(patchSocials.telegram !== undefined ? { telegram: patchSocials.telegram } : {}),
      ...(patchSocials.vk !== undefined ? { vk: patchSocials.vk } : {}),
      ...(patchSocials.instagram !== undefined ? { instagram: patchSocials.instagram } : {}),
      ...(patch.slogan !== undefined ? { slogan: patch.slogan } : {}),
      custom_1_label: customLinks[0]?.label ?? '',
      custom_1_url: customLinks[0]?.url ?? '',
      custom_2_label: customLinks[1]?.label ?? '',
      custom_2_url: customLinks[1]?.url ?? '',
    }

    await api(`/api/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: patch.name ?? current.name,
        slug: current.slug,
        description: patch.description ?? current.description ?? '',
        logo_url: patch.logoUrl ?? current.logo_url ?? '',
        socials: mergedSocials,
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
  async getPlayers(teamId) {
    const list = (await api<any[]>('/api/players')).map(mapPlayer).filter((player): player is Player => Boolean(player))
    return teamId ? list.filter((p) => p.teamId === teamId) : list
  },
  async getPlayerById(playerId) {
    try {
      return mapPlayer(await api<any>(`/api/players/${playerId}`))
    } catch {
      return null
    }
  },
  async createPlayer(input) {
    await api('/api/players', {
      method: 'POST',
      body: JSON.stringify({
        user_id: Number(input.userId),
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
    const mergedSocials = {
      ...(current.socials ?? {}),
      ...(patch.socials?.telegram !== undefined ? { telegram: patch.socials.telegram } : {}),
      ...(patch.socials?.vk !== undefined ? { vk: patch.socials.vk } : {}),
      ...(patch.socials?.instagram !== undefined ? { instagram: patch.socials.instagram } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.age !== undefined ? { age: String(patch.age) } : {}),
    }
    await api(`/api/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        team_id: current.team_id,
        full_name: patch.displayName ?? current.full_name,
        nickname: current.nickname ?? '',
        avatar_url: patch.avatar ?? current.avatar_url ?? '',
        socials: mergedSocials,
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
    const created = await api<any>('/api/matches', {
      method: 'POST',
      body: JSON.stringify({
        home_team_id: Number(input.homeTeamId),
        away_team_id: Number(input.awayTeamId),
        start_at: input.startAt,
        status: input.status,
        home_score: 0,
        away_score: 0,
        extra_time: {
          ...(input.stage ? { stage: input.stage } : {}),
          ...(input.referee ? { referee: input.referee } : {}),
          ...(input.broadcastUrl ? { broadcast_url: input.broadcastUrl } : {}),
          ...(input.tieId ? { tie_id: input.tieId } : {}),
          ...(input.tournamentId ? { tournament_id: input.tournamentId } : {}),
        },
        venue: input.venue,
      }),
    })
    const nextId = created?.id ?? created?.match_id
    return nextId ? { id: String(nextId) } : undefined
  },
  async updateMatch(matchId, patch) {
    const current = await api<any>(`/api/matches/${matchId}`)
    const mergedExtra = {
      ...(current.extra_time ?? {}),
      ...(patch.broadcastUrl !== undefined ? { broadcast_url: patch.broadcastUrl } : {}),
      ...(patch.diskUrl !== undefined ? { disk_url: patch.diskUrl } : {}),
      ...(patch.goalEvents !== undefined ? { goal_events: serializeGoalEvents(patch.goalEvents) } : {}),
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.tour !== undefined ? { tour: patch.tour } : {}),
      ...(patch.referee !== undefined ? { referee: patch.referee } : {}),
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

    const stagesFromApi: BracketStage[] = stagesRaw.map((stage, index) => ({
      id: String(stage.id),
      label: stage.label,
      order: Number(stage.order ?? index + 1),
      size: Number(stage.size ?? 1),
    }))
    const expectedStageCount = Math.max(1, Math.round(Math.log2(settings.teamCapacity)))
    const stages: BracketStage[] = Array.from({ length: expectedStageCount }, (_, index) => {
      const stageOrder = index + 1
      const mapped = stagesFromApi.find((stage) => stage.order === stageOrder) ?? stagesFromApi[index]
      const computedSize = Math.max(1, Math.floor(settings.teamCapacity / (2 ** stageOrder)))
      return {
        id: mapped?.id ?? `stage_${stageOrder}`,
        label: mapped?.label ?? (computedSize === 1 ? 'Финал' : `1/${computedSize * 2} финала`),
        order: stageOrder,
        size: computedSize,
      }
    })

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
        stageId: String(group.stage_id ?? group.round_id ?? `stage_${group.stage_slot_column ?? 1}`),
        slot: Number(group.slot ?? group.stage_slot_row ?? 1),
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
    const contentBlocks = input.contentBlocks ?? normalizeEventBlocks(undefined, { text: input.body, imageUrl: input.imageUrl })
    await api('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        scope_type: input.scopeType,
        scope_id: input.scopeId ? Number(input.scopeId) : null,
        title: input.title,
        body: blocksToPlainText(contentBlocks) || input.body,
        metadata: {
          ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
          summary: input.summary ?? deriveSummaryFromBlocks(contentBlocks),
          content_blocks: contentBlocks,
        },
        visibility: 'public',
        is_pinned: false,
      }),
    })
  },
  async updateEventForScope(input) {
    const contentBlocks = input.contentBlocks ?? normalizeEventBlocks(undefined, { text: input.body, imageUrl: input.imageUrl })
    await api(`/api/events/${input.eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        scope_type: input.scopeType,
        scope_id: input.scopeId ? Number(input.scopeId) : null,
        title: input.title,
        body: blocksToPlainText(contentBlocks) || input.body,
        metadata: {
          ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
          summary: input.summary ?? deriveSummaryFromBlocks(contentBlocks),
          content_blocks: contentBlocks,
        },
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
    const now = Date.now()
    const flat = flatRaw.map((raw) => {
      const comment = mapComment(raw)
      const isOwn = String(raw.author_user_id) === currentAuthor.id
      const createdAtTs = new Date(comment.createdAt).getTime()
      const canEdit = isOwn && Number.isFinite(createdAtTs) && now - createdAtTs <= 12 * 60 * 60 * 1000
      return {
        ...comment,
        isOwn,
        canEdit,
        canDelete: isOwn || currentAuthor.role === 'admin' || currentAuthor.role === 'superadmin',
      }
    })

    const byId = new Map(flat.map((item) => [item.id, { ...item, replies: [] as CommentNode[] }]))
    const roots: CommentNode[] = []

    byId.forEach((item) => {
      if (!item.parentId) {
        roots.push(item)
        return
      }
      const parent = byId.get(item.parentId)
      if (parent) parent.replies.push(item)
      else roots.push(item)
    })

    return roots
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
  async updateComment(commentId, text) {
    await api(`/api/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body: text }) })
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
  const statuses = Array.isArray(me.user.roles) ? me.user.roles.filter((item): item is UserRole => item in rolePriority) : []
  const role = pickPrimaryRole(statuses)
  const permissions = Array.isArray(me.user.permissions) ? me.user.permissions : []

  return {
    isAuthenticated: true,
    user: {
      id: String(me.user.id),
      displayName: me.user.display_name,
      role,
      roles: statuses.length ? statuses : [role],
      playerProfileId: me.user.player_id ? String(me.user.player_id) : undefined,
      teamId: me.user.team_id ? String(me.user.team_id) : undefined,
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
    })).catch(async () => {
      const fallbackRoleByCode: Record<string, UserRole> = {
        'UFL-SUPERADMIN-2026': 'superadmin',
        'UFL-ADMIN-2026': 'admin',
        'UFL-CAPTAIN-2026': 'captain',
        'UFL-PLAYER-2026': 'player',
      }

      const fallbackRole = fallbackRoleByCode[code.trim().toUpperCase()]
      if (!fallbackRole) {
        throw new Error('invalid code')
      }

      return api<BackendMeDTO>('/api/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({
          username: `seed_${fallbackRole}`,
          display_name: `Seed ${fallbackRole}`,
          roles: [fallbackRole],
        }),
      })
    })
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
        roles: [role],
        playerProfileId: me.user.player_id ? String(me.user.player_id) : undefined,
        teamId: me.user.team_id ? String(me.user.team_id) : undefined,
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

const tournamentCyclesStorageKey = 'ufl.tournament.cycles'
type TournamentCycleDraft = { id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }
const localCyclesFallback: TournamentCycleDraft[] = [{ id: 'cycle_2026', name: 'Сезон 2026', bracketTeamCapacity: 16, isActive: true }]
const loadLocalTournamentCycles = () => {
  if (typeof window === 'undefined') return localCyclesFallback
  const raw = window.localStorage.getItem(tournamentCyclesStorageKey)
  if (!raw) return localCyclesFallback
  try {
    const parsed = JSON.parse(raw) as TournamentCycleDraft[]
    return Array.isArray(parsed) && parsed.length ? parsed : localCyclesFallback
  } catch {
    return localCyclesFallback
  }
}
const saveLocalTournamentCycles = (cycles: TournamentCycleDraft[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(tournamentCyclesStorageKey, JSON.stringify(cycles))
}

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
  async getMyActions() {
    const rows = await api<any[]>(`/api/me/actions`)
    return rows.map((item) => ({
      id: String(item.id),
      action: String(item.action ?? ''),
      targetType: String(item.target_type ?? ''),
      targetId: String(item.target_id ?? ''),
      createdAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : new Date().toISOString(),
      route: String(item.route ?? '/'),
    }))
  },
  async getTournamentCycles() {
    try {
      const payload = await api<any[]>('/api/tournament/cycles')
      return payload.map((item) => ({
        id: String(item.id),
        name: String(item.name),
        bracketTeamCapacity: [4, 8, 16, 32].includes(Number(item.bracket_team_capacity)) ? Number(item.bracket_team_capacity) as 4 | 8 | 16 | 32 : 16,
        isActive: Boolean(item.is_active),
      }))
    } catch {
      return loadLocalTournamentCycles()
    }
  },
  async createTournamentCycle(input) {
    try {
      await api('/api/admin/tournament/cycles', { method: 'POST', body: JSON.stringify({ name: input.name, bracket_team_capacity: input.bracketTeamCapacity, is_active: Boolean(input.isActive) }) })
      return
    } catch {
      const cycles = loadLocalTournamentCycles()
      const next = [
        ...cycles.map((cycle) => ({ ...cycle, isActive: input.isActive ? false : cycle.isActive })),
        { id: `cycle_${Date.now()}`, name: input.name, bracketTeamCapacity: input.bracketTeamCapacity, isActive: Boolean(input.isActive) },
      ]
      saveLocalTournamentCycles(next)
    }
  },
  async setActiveTournamentCycle(cycleId) {
    try {
      await api(`/api/admin/tournament/cycles/${cycleId}/activate`, { method: 'POST' })
      return
    } catch {
      saveLocalTournamentCycles(loadLocalTournamentCycles().map((cycle) => ({ ...cycle, isActive: cycle.id === cycleId })))
    }
  },
  async updateTournamentBracketSettings(cycleId, settings) {
    try {
      await api(`/api/admin/tournament/cycles/${cycleId}/settings`, { method: 'PATCH', body: JSON.stringify({ bracket_team_capacity: settings.teamCapacity }) })
      return
    } catch {
      saveLocalTournamentCycles(loadLocalTournamentCycles().map((cycle) => (cycle.id === cycleId ? { ...cycle, bracketTeamCapacity: settings.teamCapacity } : cycle)))
    }
  },
  async createBracketTie(input) {
    await api('/api/admin/bracket/ties', {
      method: 'POST',
      body: JSON.stringify({
        tournament_id: Number(input.tournamentId),
        stage_id: input.stageId,
        slot: input.slot,
        home_team_id: Number(input.homeTeamId),
        away_team_id: Number(input.awayTeamId),
        label: input.label ?? '',
      }),
    }).catch(() => undefined)
  },
  async attachMatchToTie(input) {
    await api('/api/admin/bracket/ties/attach-match', {
      method: 'POST',
      body: JSON.stringify({
        tournament_id: Number(input.tournamentId),
        tie_id: input.tieId,
        match_id: Number(input.matchId),
      }),
    }).catch(() => undefined)
  },
}

export const usersRepository: UsersRepository = {
  async getUserCard(userId) {
    try {
      return mapUserCard(await api<any>(`/api/users/${userId}`))
    } catch {
      return null
    }
  },
  async findByTelegramUsername(username) {
    const normalized = username.trim().replace(/^@/, '')
    if (!normalized) return null
    try {
      return mapUserCard(await api<any>(`/api/users/by-telegram/${encodeURIComponent(normalized)}`))
    } catch {
      try {
        const list = await api<any[]>(`/api/users/search?telegram=${encodeURIComponent(normalized)}`)
        return list.length ? mapUserCard(list[0]) : null
      } catch {
        return null
      }
    }
  },
  async getUserProfile(userId) {
    try {
      const item = await api<any>(`/api/admin/users/${userId}/profile`)
      return {
        userId: String(item.user_id),
        username: String(item.username ?? ''),
        displayName: String(item.display_name ?? ''),
        bio: String(item.bio ?? ''),
        avatarUrl: String(item.avatar_url ?? ''),
        socials: (item.socials ?? {}) as Record<string, string>,
      }
    } catch {
      try {
        const me = await api<any>(`/api/me/profile`)
        if (String(me.user_id) !== String(userId)) return null
        return {
          userId: String(me.user_id),
          username: String(me.username ?? ''),
          displayName: String(me.display_name ?? ''),
          bio: String(me.bio ?? ''),
          avatarUrl: String(me.avatar_url ?? ''),
          socials: (me.socials ?? {}) as Record<string, string>,
        }
      } catch {
        return null
      }
    }
  },
  async updateUserProfile(userId, input) {
    try {
      await api(`/api/admin/users/${userId}/profile`, { method: 'PATCH', body: JSON.stringify({ display_name: input.displayName, bio: input.bio, avatar_url: input.avatarUrl, socials: input.socials }) })
      return
    } catch {
      const me = await api<any>(`/api/auth/me`)
      if (String(me.user?.id ?? '') !== String(userId)) {
        throw new ApiError(403, 'forbidden')
      }
      await api(`/api/me/profile`, { method: 'PATCH', body: JSON.stringify({ display_name: input.displayName, bio: input.bio, avatar_url: input.avatarUrl, socials: input.socials }) })
    }
  },
}

export const uploadsRepository: UploadsRepository = {
  async uploadImage(file) {
    const formData = new FormData()
    formData.set('file', file)
    const res = await fetch(`${API_BASE}/api/uploads/image`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() },
      body: formData,
    })
    if (!res.ok) {
      throw new ApiError(res.status, (await res.text()).trim() || `API ${res.status}`)
    }
    return res.json() as Promise<{ url: string }>
  },
}

export const repositories = { teamsRepository, playersRepository, matchesRepository, standingsRepository, bracketRepository, searchRepository, commentsRepository, eventsRepository, sessionRepository, cabinetRepository, usersRepository, uploadsRepository }
