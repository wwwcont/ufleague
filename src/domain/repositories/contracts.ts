import type {
  AuthSession,
  BracketMatch,
  BracketRound,
  CommentAuthorState,
  CommentEntityType,
  CommentNode,
  Match,
  Player,
  PublicEvent,
  SearchResult,
  StandingRow,
  Team,
  UserRole,
} from '../entities/types'

export interface TeamsRepository {
  getTeams(): Promise<Team[]>
  getTeamById(teamId: string): Promise<Team | null>
  updateTeam?(teamId: string, patch: Partial<Pick<Team, 'name' | 'city' | 'logoUrl'>>): Promise<void>
  captainInviteByUsername?(teamId: string, username: string): Promise<void>
  captainUpdateSocials?(teamId: string, socials: Record<string, string>): Promise<void>
  captainSetRosterVisibility?(teamId: string, playerId: string, isVisible: boolean): Promise<void>
  adminTransferCaptain?(teamId: string, newCaptainUserId: string): Promise<void>
}

export interface PlayersRepository {
  getPlayers(teamId?: string): Promise<Player[]>
  getPlayerById(playerId: string): Promise<Player | null>
  updatePlayer?(playerId: string, patch: Partial<Pick<Player, 'displayName' | 'position' | 'number' | 'avatar'>>): Promise<void>
}

export interface MatchesRepository {
  getMatches(): Promise<Match[]>
  getMatchById(matchId: string): Promise<Match | null>
  updateMatch?(matchId: string, patch: Partial<{ status: Match['status']; homeScore: number; awayScore: number; venue: string }>): Promise<void>
}

export interface StandingsRepository {
  getStandings(): Promise<StandingRow[]>
}

export interface BracketRepository {
  getBracket(): Promise<{ rounds: BracketRound[]; matches: BracketMatch[] }>
}

export interface SearchRepository {
  searchAll(query: string): Promise<SearchResult[]>
}

export interface CommentsRepository {
  getComments(entityType: CommentEntityType, entityId: string): Promise<CommentNode[]>
  getCurrentAuthor(): Promise<CommentAuthorState>
  createComment(entityType: CommentEntityType, entityId: string, text: string): Promise<void>
  replyToComment(parentCommentId: string, text: string): Promise<void>
  deleteComment(commentId: string): Promise<void>
  setReaction(commentId: string, reaction: Exclude<CommentNode['reactions']['userReaction'], null>): Promise<void>
}

export interface EventsRepository {
  getEvents(): Promise<PublicEvent[]>
  getEventById(eventId: string): Promise<PublicEvent | null>
  createEventForScope?(input: { scopeType: 'team' | 'player' | 'match' | 'global'; scopeId?: string; title: string; body: string }): Promise<void>
}

export interface SessionRepository {
  getSession(): Promise<AuthSession>
  startTelegramLogin(role?: UserRole): Promise<{ authUrl: string; requestId: string; expiresAt: string }>
  completeTelegramLoginWithCode(requestId: string, code: string): Promise<AuthSession>
  loginAsDevRole?(role: UserRole): Promise<AuthSession>
  logout(): Promise<void>
}

export interface CabinetRepository {
  getMyProfile(): Promise<{ userId: string; username: string; displayName: string; bio: string; avatarUrl: string; socials: Record<string, string> }>
  updateMyProfile(input: { displayName: string; bio: string; avatarUrl: string; socials: Record<string, string> }): Promise<void>
  createTeamEvent(input: { teamId: string; title: string; body: string }): Promise<void>
  adminModerateComment(commentId: string): Promise<void>
  adminBlockComments(input: { userId: string; permanent: boolean; untilUnix: number; reason: string }): Promise<void>
  superadminAssignRoles(input: { userId: string; roles: UserRole[] }): Promise<void>
  superadminAssignPermissions(input: { userId: string; permissions: string[] }): Promise<void>
  superadminAssignRestrictions(input: { userId: string; restrictions: string[] }): Promise<void>
  superadminSetGlobalSetting(input: { key: string; value: Record<string, unknown> }): Promise<void>
}
