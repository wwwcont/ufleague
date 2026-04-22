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
import type { AuthSession, BackendMeDTO, CommentAuthorState, CommentNode, Match, Player, PlayoffGrid, PublicEvent, PublicUserCard, SearchResult, StandingRow, Team, TopScorer, UserAccessRow, UserRole } from '../../domain/entities/types'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'
import { normalizeImageForUpload } from '../../lib/image-upload'
import { notifyError, toRussianMessage } from '../../lib/notifications'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const getApiOrigin = (): string | null => {
  try {
    return new URL(API_BASE, window.location.origin).origin
  } catch {
    return null
  }
}

const normalizeMediaUrl = (rawUrl?: string | null): string | null => {
  if (!rawUrl) return null
  const value = String(rawUrl).trim()
  if (!value) return null

  const apiOrigin = getApiOrigin()
  if (value.startsWith('/')) {
    return apiOrigin ? `${apiOrigin}${value}` : value
  }
  if (!/^https?:\/\//i.test(value)) {
    return value
  }
  return value
}

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

type ApiRequestOptions = {
  silent?: boolean
}

async function api<T>(path: string, init?: RequestInit, options?: ApiRequestOptions): Promise<T> {
  const isWrite = (init?.method ?? 'GET').toUpperCase() !== 'GET'
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(isWrite ? { 'X-CSRF-Token': getCsrfToken() } : {}), ...(init?.headers ?? {}) }, ...init })
  if (!res.ok) {
    const rawMessage = (await res.text()).trim() || `API ${res.status}`
    const message = toRussianMessage(rawMessage)
    if (!options?.silent) {
      notifyError(message)
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const mapTeam = (t: any): Team => ({
  id: String(t.id),
  name: t.name,
  shortName: (t.short_name ? String(t.short_name) : t.name?.slice(0, 3)?.toUpperCase()) ?? 'TBD',
  logoUrl: normalizeMediaUrl(t.logo_url),
  archived: Boolean(t.archived),
  captainUserId: t.captain_user_id ? String(t.captain_user_id) : null,
  city: t.socials?.city || 'UFL Development',
  slogan: t.socials?.slogan ?? undefined,
  description: t.description ?? undefined,
  socials: {
    telegram: t.socials?.telegram,
    vk: t.socials?.vk,
    instagram: t.socials?.instagram,
    website: t.socials?.website,
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
    displayName: String(p.full_name ?? p.nickname ?? '').trim() || `@${String(p.user_id)}`,
    number: p.shirt_number ?? 0,
    position: (p.position || 'MF') as Player['position'],
    age: Number(p.socials?.age ?? 21),
    avatar: normalizeMediaUrl(p.avatar_url),
    bio: p.socials?.bio ?? undefined,
    socials: {
      telegram: p.socials?.telegram,
      vk: p.socials?.vk,
      instagram: p.socials?.instagram,
      website: p.socials?.website,
    },
    isHidden: p.is_visible === false || p.visible === false || p.hidden === true || p.position === 'hidden',
    stats: { goals: 0, assists: 0, appearances: Number(p.appearances ?? 0) },
  }
}


const mapMatchEvents = (raw: unknown): Match['events'] => {
  if (!Array.isArray(raw)) return []
  return raw.reduce<Match['events']>((acc, item, index) => {
    if (!item || typeof item !== 'object') return acc
    const payload = item as Record<string, unknown>
    const parsedMinute = payload.minute === undefined || payload.minute === null ? undefined : Number(payload.minute)
    const minute = Number.isFinite(parsedMinute) && Number(parsedMinute) >= 0 ? Number(parsedMinute) : undefined
    const rawType = String(payload.type ?? 'goal')
    const normalizedType: Match['events'][number]['type'] = rawType === 'own_goal' || rawType === 'yellow_card' || rawType === 'red_card' || rawType === 'substitution' ? rawType : 'goal'
    acc.push({
      id: String(payload.id ?? `match_event_${index}`),
      minute,
      type: normalizedType,
      teamId: payload.team_id ? String(payload.team_id) : undefined,
      playerId: payload.player_id ? String(payload.player_id) : undefined,
      assistPlayerId: payload.assist_player_id ? String(payload.assist_player_id) : undefined,
      linkedEventId: payload.linked_event_id ? String(payload.linked_event_id) : undefined,
      note: payload.note ? String(payload.note) : undefined,
    })
    return acc
  }, [])
}

const mapMatch = (m: any): Match => ({
  id: String(m.id),
  tournamentId: m.tournament_cycle_id ? String(m.tournament_cycle_id) : (m.extra_time?.tournament_id ? String(m.extra_time.tournament_id) : undefined),
  round: `Round ${new Date(m.start_at).toISOString().slice(0, 10)}`,
  date: new Date(m.start_at).toISOString().slice(0, 10),
  time: new Date(m.start_at).toISOString().slice(11, 16),
  venue: m.venue || 'TBD',
  status: (m.status === 'live' || m.status === 'half_time' || m.status === 'finished' ? m.status : 'scheduled') as Match['status'],
  homeTeamId: String(m.home_team_id),
  awayTeamId: String(m.away_team_id),
  score: { home: m.home_score ?? 0, away: m.away_score ?? 0 },
  events: mapMatchEvents(m.extra_time?.match_events ?? m.extra_time?.goal_events),
  featured: m.status === 'live',
  stage: m.extra_time?.stage ?? undefined,
  tour: m.extra_time?.tour ?? undefined,
  referee: m.extra_time?.referee ?? undefined,
  broadcastUrl: m.extra_time?.broadcast_url ?? undefined,
  diskUrl: m.extra_time?.disk_url ?? undefined,
  currentMinute: Number(m.extra_time?.match_minute ?? 0) || undefined,
  clockAnchorAt: m.extra_time?.clock_anchor_at ? String(m.extra_time.clock_anchor_at) : undefined,
  archived: Boolean(m.extra_time?.archived),
  playoffCellId: m.playoff_cell_id ? String(m.playoff_cell_id) : null,
})



const mapTopScorer = (item: any): TopScorer => ({
  playerId: String(item.player_id),
  teamId: String(item.team_id),
  goals: Number(item.goals ?? 0),
  assists: Number(item.assists ?? 0),
  yellowCards: Number(item.yellow_cards ?? 0),
  redCards: Number(item.red_cards ?? 0),
})
const derivePlayoffResult = (cell: { homeTeamId: string | null; awayTeamId: string | null; attachedMatches: Array<{ status: Match['status']; homeScore: number; awayScore: number }> }) => {
  const aggregate = cell.attachedMatches.reduce(({ home, away }, match) => ({ home: home + match.homeScore, away: away + match.awayScore }), { home: 0, away: 0 })
  const allMatchesFinished = cell.attachedMatches.length > 0 && cell.attachedMatches.every((match) => match.status === 'finished')
  const winnerTeamId = !allMatchesFinished
    ? null
    : aggregate.home > aggregate.away
      ? cell.homeTeamId
      : aggregate.away > aggregate.home
        ? cell.awayTeamId
        : null

  return {
    aggregateHomeScore: allMatchesFinished ? aggregate.home : null,
    aggregateAwayScore: allMatchesFinished ? aggregate.away : null,
    allMatchesFinished,
    winnerTeamId,
  }
}

const mapPlayoffCell = (cell: any): PlayoffGrid['cells'][number] => {
  const mapped = {
    id: String(cell.id),
    homeTeamId: cell.home_team_id ? String(cell.home_team_id) : null,
    awayTeamId: cell.away_team_id ? String(cell.away_team_id) : null,
    col: Number(cell.col),
    row: Number(cell.row),
    attachedMatchIds: Array.isArray(cell.attached_match_ids) ? cell.attached_match_ids.map((id: number) => String(id)) : [],
    attachedMatches: Array.isArray(cell.attached_matches) ? cell.attached_matches.map((match: any) => ({
      id: String(match.id),
      status: match.status as Match['status'],
      homeScore: Number(match.home_score ?? 0),
      awayScore: Number(match.away_score ?? 0),
    })) : [],
    aggregateHomeScore: cell.aggregate_home_score ?? null,
    aggregateAwayScore: cell.aggregate_away_score ?? null,
    winnerTeamId: cell.winner_team_id ? String(cell.winner_team_id) : null,
    allMatchesFinished: Boolean(cell.all_matches_finished),
  }

  const derived = derivePlayoffResult(mapped)
  return {
    ...mapped,
    aggregateHomeScore: derived.aggregateHomeScore,
    aggregateAwayScore: derived.aggregateAwayScore,
    winnerTeamId: derived.winnerTeamId,
    allMatchesFinished: derived.allMatchesFinished,
  }
}

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
    imageUrl: normalizeMediaUrl(e.metadata?.image_url ? String(e.metadata.image_url) : undefined) ?? undefined,
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

const mapUserAccessRow = (u: any): UserAccessRow => ({
  id: String(u.id),
  displayName: String(u.display_name ?? 'Пользователь'),
  telegramUsername: u.telegram_username ? String(u.telegram_username) : undefined,
  roles: Array.isArray(u.roles) ? u.roles : [],
  restrictions: Array.isArray(u.restrictions) ? u.restrictions.map((item: unknown) => String(item)) : [],
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


const serializeMatchEvents = (events: Match['events']) => events
  .map((event) => ({
    id: event.id,
    type: event.type,
    minute: event.minute ?? null,
    team_id: event.teamId,
    player_id: event.playerId,
    assist_player_id: event.assistPlayerId,
    linked_event_id: event.linkedEventId,
    note: event.note,
  }))

export const teamsRepository: TeamsRepository = {
  async getTeams(options) {
    const list = (await api<any[]>('/api/teams')).map(mapTeam)
    return options?.includeArchived ? list : list.filter((team) => !team.archived)
  },
  async getTeamById(teamId) { try { return mapTeam(await api<any>(`/api/teams/${teamId}`)) } catch { return null } },
  async createTeam(input) {
    const created = await api<any>('/api/teams', {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        short_name: input.shortName ?? input.name.slice(0, 3).toUpperCase(),
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
      ...(patchSocials.website !== undefined ? { website: patchSocials.website } : {}),
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
        short_name: patch.shortName ?? current.short_name ?? current.name?.slice(0, 3)?.toUpperCase() ?? 'TBD',
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
  async adminArchiveTeam(teamId, archived) {
    await api(`/api/admin/teams/${teamId}/archive`, { method: 'POST', body: JSON.stringify({ archived }) })
  },
  async adminDeleteTeam(teamId) {
    await api(`/api/admin/teams/${teamId}`, { method: 'DELETE' })
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
  async getTopScorers(options) {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.tournamentId) params.set('tournamentId', String(options.tournamentId))
    const suffix = params.toString() ? `?${params.toString()}` : ''
    return (await api<any[]>(`/api/stats/top-scorers${suffix}`)).map(mapTopScorer)
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
      ...(patch.socials?.website !== undefined ? { website: patch.socials.website } : {}),
      ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
      ...(patch.age !== undefined ? { age: String(patch.age) } : {}),
    }
    await api(`/api/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        user_id: current.user_id,
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
  async adminArchivePlayer(playerId, archived) {
    await api(`/api/admin/players/${playerId}/archive`, { method: 'POST', body: JSON.stringify({ archived }) })
  },
}
export const matchesRepository: MatchesRepository = {
  async getMatches(options) {
    const list = (await api<any[]>('/api/matches')).map(mapMatch)
    return options?.includeArchived ? list : list.filter((match) => !match.archived)
  },
  async getMatchById(matchId) { try { return mapMatch(await api<any>(`/api/matches/${matchId}`)) } catch { return null } },
  async createMatch(input) {
    const created = await api<any>('/api/matches', {
      method: 'POST',
      body: JSON.stringify({
        ...(input.tournamentId ? { tournament_cycle_id: Number(input.tournamentId) } : {}),
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
      ...(patch.matchEvents !== undefined ? { match_events: serializeMatchEvents(patch.matchEvents), goal_events: serializeMatchEvents(patch.matchEvents).filter((event) => event.type === 'goal') } : {}),
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.tour !== undefined ? { tour: patch.tour } : {}),
      ...(patch.referee !== undefined ? { referee: patch.referee } : {}),
      ...(patch.currentMinute !== undefined ? { match_minute: patch.currentMinute } : {}),
      ...(patch.clockAnchorAt !== undefined ? { clock_anchor_at: patch.clockAnchorAt } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
    }
    await api(`/api/matches/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...(current.tournament_cycle_id ? { tournament_cycle_id: Number(current.tournament_cycle_id) } : {}),
        home_team_id: current.home_team_id,
        away_team_id: current.away_team_id,
        start_at: patch.startAt ?? current.start_at,
        status: patch.status ?? current.status,
        home_score: patch.homeScore ?? current.home_score,
        away_score: patch.awayScore ?? current.away_score,
        extra_time: mergedExtra,
        venue: patch.venue ?? current.venue ?? '',
      }),
    })
  },
  async adminDeleteMatch(matchId) {
    await api(`/api/admin/matches/${matchId}`, { method: 'DELETE' })
  },
}
export const standingsRepository: StandingsRepository = {
  async getStandings(_tournamentId) {
    const teams = (await api<any[]>('/api/teams')).map(mapTeam)
    const matches = (await api<any[]>('/api/matches')).map(mapMatch).filter((match) => !match.archived && match.status === 'finished')
    const stats = new Map<string, StandingRow>()

    teams.forEach((team) => {
      stats.set(team.id, {
        position: 0,
        teamId: team.id,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      })
    })

    matches.forEach((match) => {
      const home = stats.get(match.homeTeamId)
      const away = stats.get(match.awayTeamId)
      if (!home || !away) return

      home.played += 1
      away.played += 1
      home.goalsFor += match.score.home
      home.goalsAgainst += match.score.away
      away.goalsFor += match.score.away
      away.goalsAgainst += match.score.home

      if (match.score.home > match.score.away) {
        home.won += 1
        away.lost += 1
        home.points += 3
      } else if (match.score.home < match.score.away) {
        away.won += 1
        home.lost += 1
        away.points += 3
      } else {
        home.drawn += 1
        away.drawn += 1
        home.points += 1
        away.points += 1
      }
    })

    const rows = [...stats.values()].map((row) => ({ ...row, goalDiff: row.goalsFor - row.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.teamId.localeCompare(b.teamId))
      .map((row, index) => ({ ...row, position: index + 1 }))

    return rows
  },
}
export const playoffGridRepository: PlayoffGridRepository = {
  async getPlayoffGrid(tournamentId) {
    try {
      const data = await api<any>(`/api/playoff-grid/${tournamentId}`)
      return {
        cells: (data.cells ?? []).map((cell: any) => mapPlayoffCell(cell)),
        lines: (data.lines ?? []).map((line: any) => ({
          id: String(line.id),
          fromPlayoffId: String(line.from_playoff_id),
          toPlayoffId: String(line.to_playoff_id),
        })),
      } satisfies PlayoffGrid
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return { cells: [], lines: [] }
      throw error
    }
  },
  async getMatchCandidates(tournamentId, matchId) {
    try {
      const data = await api<{ cells?: any[] }>(`/api/admin/playoff-grid/${tournamentId}/match-candidates?matchId=${encodeURIComponent(matchId)}`)
      return (data.cells ?? []).map((cell) => ({
        id: String(cell.id),
        homeTeamId: cell.home_team_id ? String(cell.home_team_id) : null,
        awayTeamId: cell.away_team_id ? String(cell.away_team_id) : null,
        col: Number(cell.col),
        row: Number(cell.row),
        attachedMatchIds: Array.isArray(cell.attached_match_ids) ? cell.attached_match_ids.map((id: number) => String(id)) : [],
        attachedMatches: [],
        aggregateHomeScore: null,
        aggregateAwayScore: null,
        winnerTeamId: null,
        allMatchesFinished: false,
      }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return []
      throw error
    }
  },
  async attachMatch(playoffCellId, matchId) {
    await api('/api/admin/playoff-grid/attach-match', {
      method: 'POST',
      body: JSON.stringify({ playoff_cell_id: Number(playoffCellId), match_id: Number(matchId) }),
    })
  },
  async detachMatch(playoffCellId, matchId) {
    await api('/api/admin/playoff-grid/detach-match', {
      method: 'POST',
      body: JSON.stringify({ playoff_cell_id: Number(playoffCellId), match_id: Number(matchId) }),
    })
  },
  async validateDraft(tournamentId, payload) {
    await api(`/api/admin/playoff-grid/${tournamentId}/draft-validate`, {
      method: 'POST',
      body: JSON.stringify({
        cells: payload.cells.map((cell) => ({
          id: cell.id ? Number(cell.id) : undefined,
          temp_id: cell.tempId,
          home_team_id: cell.homeTeamId ? Number(cell.homeTeamId) : null,
          away_team_id: cell.awayTeamId ? Number(cell.awayTeamId) : null,
          col: cell.col,
          row: cell.row,
          attached_match_ids: cell.attachedMatchIds.map((id) => Number(id)),
        })),
        lines: payload.lines.map((line) => ({
          id: line.id ? Number(line.id) : undefined,
          from_playoff_id: /^\d+$/.test(line.fromRef) ? Number(line.fromRef) : line.fromRef,
          to_playoff_id: /^\d+$/.test(line.toRef) ? Number(line.toRef) : line.toRef,
        })),
      }),
    })
  },
  async savePlayoffGrid(tournamentId, payload) {
    const data = await api<any>(`/api/admin/playoff-grid/${tournamentId}/save`, {
      method: 'POST',
      body: JSON.stringify({
        cells: payload.cells.map((cell) => ({
          id: cell.id ? Number(cell.id) : undefined,
          temp_id: cell.tempId,
          home_team_id: cell.homeTeamId ? Number(cell.homeTeamId) : null,
          away_team_id: cell.awayTeamId ? Number(cell.awayTeamId) : null,
          col: cell.col,
          row: cell.row,
          attached_match_ids: cell.attachedMatchIds.map((id) => Number(id)),
        })),
        lines: payload.lines.map((line) => ({
          id: line.id ? Number(line.id) : undefined,
          from_playoff_id: /^\d+$/.test(line.fromRef) ? Number(line.fromRef) : line.fromRef,
          to_playoff_id: /^\d+$/.test(line.toRef) ? Number(line.toRef) : line.toRef,
        })),
      }),
    })
    return {
      cells: (data.cells ?? []).map((cell: any) => mapPlayoffCell(cell)),
      lines: (data.lines ?? []).map((line: any) => ({
        id: String(line.id),
        fromPlayoffId: String(line.from_playoff_id),
        toPlayoffId: String(line.to_playoff_id),
      })),
    }
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
    const created = await api<any>('/api/events', {
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
    return mapEvent(created)
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
      const canDeleteOwn = isOwn && Number.isFinite(createdAtTs) && now - createdAtTs <= 12 * 60 * 60 * 1000
      return {
        ...comment,
        isOwn,
        canEdit,
        canDelete: canDeleteOwn || currentAuthor.role === 'admin' || currentAuthor.role === 'superadmin',
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

const guestSession: AuthSession = { isAuthenticated: false, user: { id: '0', displayName: 'Guest', role: 'guest' }, permissions: [], restrictions: [] }

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
  const restrictions = Array.isArray(me.user.restrictions) ? me.user.restrictions.map((item) => String(item)) : []

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
    restrictions,
    lastLoginAt: me.session.created_at,
  }
}

export const sessionRepository: SessionRepository = {
  async getSession() {
    try {
      const me = await api<BackendMeDTO>('/api/auth/me', undefined, { silent: true })
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
      authUrl: data.authUrl ?? data.auth_url ?? 'https://t.me/ufleague_bot',
      requestId: data.requestId ?? data.request_id ?? '',
      expiresAt: data.expiresAt ?? data.expires_at ?? new Date().toISOString(),
    }
  },
  async completeTelegramLoginWithCode(requestId: string, code: string) {
    const me = await api<BackendMeDTO>('/api/auth/telegram/mock-code-login', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }).catch(async () => api<BackendMeDTO>('/api/auth/telegram/complete-code', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId, code }),
    }))
    return mapMeToSession(me)
  },
  async logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
  },
}

const mapProfile = (payload: any) => ({
  userId: String(payload.user_id),
  username: String(payload.username ?? ''),
  telegramId: payload.telegram_id ? String(payload.telegram_id) : undefined,
  telegramUsername: payload.telegram_username ? String(payload.telegram_username) : undefined,
  displayName: String(payload.display_name ?? ''),
  firstName: String(payload.first_name ?? ''),
  lastName: String(payload.last_name ?? ''),
  bio: String(payload.bio ?? ''),
  avatarUrl: normalizeMediaUrl(String(payload.avatar_url ?? '')) ?? '',
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
        first_name: input.firstName,
        last_name: input.lastName,
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
  async adminAssignCaptainRole(userId) {
    await api(`/api/admin/users/${userId}/captain-role`, { method: 'POST' })
  },
  async adminRevokeCaptainRole(userId) {
    await api(`/api/admin/users/${userId}/captain-role`, { method: 'DELETE' })
  },
  async adminRemovePlayerFromUser(userId) {
    await api(`/api/admin/users/${userId}/player`, { method: 'DELETE' })
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
      metadata: (item.metadata ?? {}) as Record<string, unknown>,
    }))
  },
  async getPageChangeHistory() {
    const rows = await api<any[]>(`/api/admin/page-change-history`)
    return rows.map((item) => ({
      id: String(item.id),
      action: String(item.action ?? ''),
      targetType: String(item.target_type ?? ''),
      targetId: String(item.target_id ?? ''),
      createdAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : new Date().toISOString(),
      route: String(item.route ?? '/'),
      metadata: (item.metadata ?? {}) as Record<string, unknown>,
    }))
  },
  async getMyNotifications() {
    const rows = await api<any[]>(`/api/me/notifications`)
    return rows.map((item) => ({
      id: String(item.id),
      notificationType: String(item.notification_type ?? ''),
      title: String(item.title ?? ''),
      body: String(item.body ?? ''),
      route: String(item.route ?? '/'),
      status: String(item.status ?? ''),
      createdAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : new Date().toISOString(),
    }))
  },
  async getTelegramNotificationsEnabled() {
    const payload = await api<{ enabled?: boolean }>(`/api/me/telegram-notifications`)
    return payload.enabled !== false
  },
  async setTelegramNotificationsEnabled(enabled) {
    await api(`/api/me/telegram-notifications`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    })
  },
  async getTournamentCycles() {
    const payload = await api<any[]>('/api/tournament/cycles')
    return payload.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      bracketTeamCapacity: [4, 8, 16, 32].includes(Number(item.bracket_team_capacity)) ? Number(item.bracket_team_capacity) as 4 | 8 | 16 | 32 : 16,
      isActive: Boolean(item.is_active),
    }))
  },
  async createTournamentCycle(input) {
    await api('/api/admin/tournament/cycles', { method: 'POST', body: JSON.stringify({ name: input.name.trim(), bracket_team_capacity: input.bracketTeamCapacity, is_active: Boolean(input.isActive) }) })
  },
  async deleteTournamentCycle(cycleId) {
    await api(`/api/admin/tournament/cycles/${cycleId}`, { method: 'DELETE' })
  },
  async setActiveTournamentCycle(cycleId) {
    await api(`/api/admin/tournament/cycles/${cycleId}/activate`, { method: 'POST' })
  },
  async updateTournamentBracketSettings(cycleId, settings) {
    await api(`/api/admin/tournament/cycles/${cycleId}/settings`, { method: 'PATCH', body: JSON.stringify({ bracket_team_capacity: settings.teamCapacity }) })
  },
  async getUserAccessMatrix() {
    const rows = await api<any[]>('/api/admin/access-matrix')
    return rows.map(mapUserAccessRow)
  },
  async addManualStatAdjustment(input) {
    await api('/api/admin/stats/adjustments', {
      method: 'POST',
      body: JSON.stringify({
        tournament_cycle_id: Number(input.tournamentId),
        entity_type: input.entityType,
        entity_id: Number(input.entityId),
        field: input.field,
        delta: input.delta,
      }),
    })
  },
  async getManualStatAdjustments(tournamentId) {
    const suffix = tournamentId ? `?tournamentId=${encodeURIComponent(tournamentId)}` : ''
    const rows = await api<any[]>(`/api/admin/stats/adjustments${suffix}`)
    return rows.map((item) => ({
      id: String(item.id),
      tournamentId: String(item.tournament_cycle_id),
      entityType: item.entity_type === 'team' ? 'team' : 'player',
      entityId: String(item.entity_id),
      field: String(item.field ?? ''),
      delta: Number(item.delta ?? 0),
      authorUserId: String(item.author_user_id),
      createdAt: item.created_at ? new Date(Number(item.created_at) * 1000).toISOString() : new Date().toISOString(),
    }))
  },
  async deleteManualStatAdjustment(adjustmentId) {
    await api(`/api/admin/stats/adjustments/${adjustmentId}`, { method: 'DELETE' })
  },
}

export const usersRepository: UsersRepository = {
  async getUserCard(userId) {
    try {
      return mapUserCard(await api<any>(`/api/users/${userId}`, undefined, { silent: true }))
    } catch {
      return null
    }
  },
  async findByTelegramUsername(username) {
    const normalized = username.trim().replace(/^@/, '')
    if (!normalized) return null
    try {
      return mapUserCard(await api<any>(`/api/users/by-telegram/${encodeURIComponent(normalized)}`, undefined, { silent: true }))
    } catch {
      try {
        const list = await api<any[]>(`/api/users/search?telegram=${encodeURIComponent(normalized)}`, undefined, { silent: true })
        return list.length ? mapUserCard(list[0]) : null
      } catch {
        return null
      }
    }
  },
  async searchByTelegramUsername(username) {
    const normalized = username.trim().replace(/^@/, '')
    if (!normalized) return []
    try {
      const list = await api<any[]>(`/api/users/search?telegram=${encodeURIComponent(normalized)}`, undefined, { silent: true })
      return list.map(mapUserCard)
    } catch {
      return []
    }
  },
  async getUserProfile(userId) {
    try {
      const item = await api<any>(`/api/admin/users/${userId}/profile`, undefined, { silent: true })
      return mapProfile(item)
    } catch {
      try {
        const me = await api<any>(`/api/me/profile`, undefined, { silent: true })
        if (String(me.user_id) !== String(userId)) return null
        return mapProfile(me)
      } catch {
        return null
      }
    }
  },
  async updateUserProfile(userId, input) {
    try {
      await api(`/api/admin/users/${userId}/profile`, { method: 'PATCH', body: JSON.stringify({ display_name: input.displayName, first_name: input.firstName, last_name: input.lastName, bio: input.bio, avatar_url: input.avatarUrl, socials: input.socials }) })
      return
    } catch {
      const me = await api<any>(`/api/auth/me`, undefined, { silent: true })
      if (String(me.user?.id ?? '') !== String(userId)) {
        throw new ApiError(403, 'forbidden')
      }
      await api(`/api/me/profile`, { method: 'PATCH', body: JSON.stringify({ display_name: input.displayName, first_name: input.firstName, last_name: input.lastName, bio: input.bio, avatar_url: input.avatarUrl, socials: input.socials }) })
    }
  },
}

export const uploadsRepository: UploadsRepository = {
  async uploadImage(file) {
    const normalizedFile = await normalizeImageForUpload(file)
    const formData = new FormData()
    formData.set('file', normalizedFile)
    const res = await fetch(`${API_BASE}/api/uploads/image`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRF-Token': getCsrfToken() },
      body: formData,
    })
    if (!res.ok) {
      throw new ApiError(res.status, (await res.text()).trim() || `API ${res.status}`)
    }
    const payload = (await res.json()) as { url?: string }
    return { url: normalizeMediaUrl(payload.url) ?? '' }
  },
}

export const repositories = { teamsRepository, playersRepository, matchesRepository, standingsRepository, playoffGridRepository, searchRepository, commentsRepository, eventsRepository, sessionRepository, cabinetRepository, usersRepository, uploadsRepository }
