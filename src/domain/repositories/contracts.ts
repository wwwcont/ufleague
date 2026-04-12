import type {
  AuthSession,
  BracketSize,
  BracketMatchGroup,
  BracketSettings,
  BracketStage,
  CommentAuthorState,
  CommentEntityType,
  CommentNode,
  Match,
  Player,
  PublicEvent,
  PublicUserCard,
  SearchResult,
  StandingRow,
  Team,
  TournamentAggregate,
  TournamentBracketSettings,
  TournamentBracketStage,
  TournamentBracketTie,
  TournamentStandingsContext,
  UserRole,
} from '../entities/types'

export interface TeamsRepository {
  getTeams(): Promise<Team[]>
  getTeamById(teamId: string): Promise<Team | null>
  createTeam?(input: { name: string; slug?: string; description: string; logoUrl?: string }): Promise<{ id: string } | void>
  updateTeam?(teamId: string, patch: Partial<Pick<Team, 'name' | 'logoUrl' | 'description' | 'slogan' | 'socials'>>): Promise<void>
  captainInviteByUsername?(teamId: string, username: string): Promise<void>
  captainUpdateSocials?(teamId: string, socials: Record<string, string>): Promise<void>
  captainSetRosterVisibility?(teamId: string, playerId: string, isVisible: boolean): Promise<void>
  adminTransferCaptain?(teamId: string, newCaptainUserId: string): Promise<void>
}

export interface PlayersRepository {
  getPlayers(teamId?: string): Promise<Player[]>
  getPlayerById(playerId: string): Promise<Player | null>
  createPlayer?(input: { userId: string; teamId: string; fullName: string; position: string; shirtNumber: number; avatarUrl?: string }): Promise<void>
  updatePlayer?(playerId: string, patch: Partial<Pick<Player, 'displayName' | 'position' | 'number' | 'avatar' | 'bio' | 'age' | 'socials'>>): Promise<void>
}

export interface MatchesRepository {
  getMatches(): Promise<Match[]>
  getMatchById(matchId: string): Promise<Match | null>
  createMatch?(input: { homeTeamId: string; awayTeamId: string; startAt: string; status: Match['status']; venue: string; referee?: string; broadcastUrl?: string; stage?: string; tieId?: string; tournamentId?: string }): Promise<{ id: string } | void>
  updateMatch?(matchId: string, patch: Partial<{ status: Match['status']; homeScore: number; awayScore: number; venue: string; broadcastUrl: string; diskUrl: string; goalEvents: Match['events']; stage: string; tour: string; referee: string }>): Promise<void>
}

export interface StandingsRepository {
  getStandings(): Promise<StandingRow[]>
}

export interface BracketRepository {
  getBracket(): Promise<{ stages: BracketStage[]; groups: BracketMatchGroup[]; settings: BracketSettings }>
}

export interface TournamentRepository {
  getTournaments?(): Promise<TournamentAggregate[]>
  createTournament?(input: { name: string; bracketSize: BracketSize; isActive?: boolean }): Promise<{ id: string }>
  setActiveTournament?(tournamentId: string): Promise<void>
  getBracketSettings?(tournamentId: string): Promise<TournamentBracketSettings | null>
  updateBracketSettings?(tournamentId: string, patch: Partial<Pick<TournamentBracketSettings, 'bracketSize' | 'legsPerTieDefault'>>): Promise<void>
}

export interface BracketAdminRepository {
  getStagesByTournament?(tournamentId: string): Promise<TournamentBracketStage[]>
  createTie?(input: { tournamentId: string; stageId: string; slot: number; homeTeamId?: string | null; awayTeamId?: string | null; legsPlanned?: 1 | 2 }): Promise<{ id: string }>
  attachMatchToTie?(input: { tournamentId: string; tieId: string; matchId: string; legNumber: number }): Promise<void>
  getTiesByStage?(stageId: string): Promise<TournamentBracketTie[]>
  getStandingsContexts?(tournamentId: string): Promise<TournamentStandingsContext[]>
}

export interface SearchRepository {
  searchAll(query: string): Promise<SearchResult[]>
}

export interface CommentsRepository {
  getComments(entityType: CommentEntityType, entityId: string): Promise<CommentNode[]>
  getCurrentAuthor(): Promise<CommentAuthorState>
  createComment(entityType: CommentEntityType, entityId: string, text: string): Promise<void>
  replyToComment(parentCommentId: string, text: string): Promise<void>
  updateComment(commentId: string, text: string): Promise<void>
  deleteComment(commentId: string): Promise<void>
  setReaction(commentId: string, reaction: Exclude<CommentNode['reactions']['userReaction'], null>): Promise<void>
}

export interface EventsRepository {
  getEvents(): Promise<PublicEvent[]>
  getEventById(eventId: string): Promise<PublicEvent | null>
  createEventForScope?(input: { scopeType: 'team' | 'player' | 'match' | 'global'; scopeId?: string; title: string; body: string; imageUrl?: string; summary?: string; contentBlocks?: PublicEvent['contentBlocks'] }): Promise<void>
  updateEventForScope?(input: { eventId: string; scopeType: 'team' | 'player' | 'match' | 'global'; scopeId?: string; title: string; body: string; imageUrl?: string; summary?: string; contentBlocks?: PublicEvent['contentBlocks'] }): Promise<void>
  deleteEvent?(eventId: string): Promise<void>
}

export interface SessionRepository {
  getSession(): Promise<AuthSession>
  startTelegramLogin(role?: UserRole): Promise<{ authUrl: string; requestId: string; expiresAt: string }>
  completeTelegramLoginWithCode(requestId: string, code: string): Promise<AuthSession>
  loginAsDevRole?(role: UserRole): Promise<AuthSession>
  logout(): Promise<void>
}

export interface UsersRepository {
  getUserCard(userId: string): Promise<PublicUserCard | null>
  getUserProfile?(userId: string): Promise<{ userId: string; username: string; displayName: string; bio: string; avatarUrl: string; socials: Record<string, string> } | null>
  updateUserProfile?(userId: string, input: { displayName: string; bio: string; avatarUrl: string; socials: Record<string, string> }): Promise<void>
  findByTelegramUsername?(username: string): Promise<PublicUserCard | null>
}

export interface UploadsRepository {
  uploadImage(file: File): Promise<{ url: string }>
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
  getMyActions?(): Promise<Array<{ id: string; action: string; targetType: string; targetId: string; createdAt: string; route: string }>>
  getTournamentCycles?(): Promise<Array<{ id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }>>
  createTournamentCycle?(input: { name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive?: boolean }): Promise<void>
  setActiveTournamentCycle?(cycleId: string): Promise<void>
  updateTournamentBracketSettings?(cycleId: string, settings: { teamCapacity: 4 | 8 | 16 | 32 }): Promise<void>
  createBracketTie?(input: { tournamentId: string; stageId: string; slot: number; homeTeamId: string; awayTeamId: string; label?: string }): Promise<{ id: string } | void>
  attachMatchToTie?(input: { tournamentId: string; tieId: string; matchId: string }): Promise<void>
}
