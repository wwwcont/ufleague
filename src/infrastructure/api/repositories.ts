import type {
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
import type { AuthSession, CommentAuthorState, CommentNode, Match, Player, PublicEvent, SearchResult, Team, UserRole } from '../../domain/entities/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

function getCsrfToken(): string {
  const m = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
  return m ? decodeURIComponent(m[1]) : 'dev-csrf-token'
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const isWrite = (init?.method ?? 'GET').toUpperCase() !== 'GET'
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(isWrite ? { 'X-CSRF-Token': getCsrfToken() } : {}), ...(init?.headers ?? {}) }, ...init })
  if (!res.ok) throw new Error(`API ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const mapTeam = (t: any): Team => ({
  id: String(t.id),
  name: t.name,
  shortName: t.name?.slice(0, 3)?.toUpperCase() ?? 'TBD',
  logoUrl: t.logo_url || null,
  city: t.description || 'N/A',
  coach: 'TBD',
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
  age: 18,
  avatar: p.avatar_url || null,
  stats: { goals: 0, assists: 0, appearances: 0 },
})

const mapMatch = (m: any): Match => ({
  id: String(m.id),
  round: 'Round 1',
  date: new Date(m.start_at).toISOString().slice(0, 10),
  time: new Date(m.start_at).toISOString().slice(11, 16),
  venue: m.venue || 'TBD',
  status: m.status,
  homeTeamId: String(m.home_team_id),
  awayTeamId: String(m.away_team_id),
  score: { home: m.home_score ?? 0, away: m.away_score ?? 0 },
  events: [],
  featured: false,
})

const mapEvent = (e: any): PublicEvent => ({
  id: String(e.id),
  title: e.title,
  summary: e.body?.slice(0, 120) ?? '',
  text: e.body,
  timestamp: e.created_at,
  source: 'backend',
  authorName: `user:${e.author_user_id}`,
  category: 'news',
  entityType: e.scope_type,
  entityId: e.scope_id ? String(e.scope_id) : undefined,
})

const mapComment = (c: any): CommentNode => ({
  id: String(c.id),
  entityType: c.entity_type,
  entityId: String(c.entity_id),
  parentId: c.parent_comment_id ? String(c.parent_comment_id) : null,
  authorName: `user:${c.author_user_id}`,
  authorRole: 'guest',
  isOwn: false,
  createdAt: c.created_at,
  text: c.body,
  reactions: { likes: c.like_count ?? 0, dislikes: c.dislike_count ?? 0, userReaction: null },
  canReply: true,
  canDelete: false,
  replies: [],
})

export const teamsRepository: TeamsRepository = {
  async getTeams() { return (await api<any[]>('/api/teams')).map(mapTeam) },
  async getTeamById(teamId) { try { return mapTeam(await api<any>(`/api/teams/${teamId}`)) } catch { return null } },
}
export const playersRepository: PlayersRepository = {
  async getPlayers(teamId) { const list = (await api<any[]>('/api/players')).map(mapPlayer); return teamId ? list.filter((p) => p.teamId === teamId) : list },
  async getPlayerById(playerId) { try { return mapPlayer(await api<any>(`/api/players/${playerId}`)) } catch { return null } },
}
export const matchesRepository: MatchesRepository = {
  async getMatches() { return (await api<any[]>('/api/matches')).map(mapMatch) },
  async getMatchById(matchId) { try { return mapMatch(await api<any>(`/api/matches/${matchId}`)) } catch { return null } },
}
export const standingsRepository: StandingsRepository = { async getStandings() { return [] } }
export const bracketRepository: BracketRepository = { async getBracket() { return { rounds: [], matches: [] } } }
export const searchRepository: SearchRepository = { async searchAll(query: string): Promise<SearchResult[]> { return query ? [] : [] } }
export const eventsRepository: EventsRepository = {
  async getEvents() { return (await api<any[]>('/api/events')).map(mapEvent) },
  async getEventById(id) { try { return mapEvent(await api<any>(`/api/events/${id}`)) } catch { return null } },
}
export const commentsRepository: CommentsRepository = {
  async getComments(entityType, entityId) {
    const flat = (await api<any[]>(`/api/comments?entityType=${entityType}&entityId=${entityId}`)).map(mapComment)
    const roots = flat.filter((c) => c.parentId === null)
    return roots.map((r) => ({ ...r, replies: flat.filter((x) => x.parentId === r.id) }))
  },
  async getCurrentAuthor(): Promise<CommentAuthorState> { return { id: '0', name: 'You', role: 'guest', isGuest: false, canComment: true, cooldownSeconds: 0 } },
}

let sessionCache: AuthSession = { isAuthenticated: false, user: { id: '0', displayName: 'Guest', role: 'guest' }, permissions: [] }
export const sessionRepository: SessionRepository = {
  async getSession() { try { const me = await api<any>('/api/auth/me'); const role = (me.user.roles?.[0] ?? 'guest') as UserRole; sessionCache = { isAuthenticated: true, user: { id: String(me.user.id), displayName: me.user.display_name, role }, permissions: [] }; return sessionCache } catch { return sessionCache } },
  async setSessionByRole(role) {
    const me = await api<any>('/api/auth/dev-login', { method: 'POST', body: JSON.stringify({ username: `dev_${role}`, display_name: `Dev ${role}`, roles: [role] }) })
    sessionCache = { isAuthenticated: true, user: { id: String(me.user.id), displayName: me.user.display_name, role }, permissions: [] }
    return sessionCache
  },
  async clearSession() { await api('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': 'dev' } }).catch(() => undefined); sessionCache = { isAuthenticated: false, user: { id: '0', displayName: 'Guest', role: 'guest' }, permissions: [] } },
}

export const repositories = { teamsRepository, playersRepository, matchesRepository, standingsRepository, bracketRepository, searchRepository, commentsRepository, eventsRepository, sessionRepository }
