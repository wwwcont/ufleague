import type { BracketMatch, BracketRound } from '../../domain/entities/types'

export const bracketRounds: BracketRound[] = [
  { id: 'r1', label: '1/8 финала', order: 1 },
  { id: 'r2', label: '1/4 финала', order: 2 },
  { id: 'r3', label: 'Полуфинал', order: 3 },
  { id: 'r4', label: 'Финал', order: 4 },
]

export const bracketMatches: BracketMatch[] = [
  { id: 'bm1', roundId: 'r1', slot: 1, homeTeamId: 'team_1', awayTeamId: 'team_16', winnerTeamId: 'team_1', status: 'finished', score: { home: 2, away: 0 } },
  { id: 'bm2', roundId: 'r1', slot: 2, homeTeamId: 'team_8', awayTeamId: 'team_9', winnerTeamId: 'team_9', status: 'finished', score: { home: 1, away: 3 } },
  { id: 'bm3', roundId: 'r1', slot: 3, homeTeamId: 'team_5', awayTeamId: 'team_12', winnerTeamId: 'team_5', status: 'finished', score: { home: 2, away: 1 } },
  { id: 'bm4', roundId: 'r1', slot: 4, homeTeamId: 'team_4', awayTeamId: 'team_13', winnerTeamId: 'team_13', status: 'finished', score: { home: 0, away: 1 } },
  { id: 'bm5', roundId: 'r1', slot: 5, homeTeamId: 'team_2', awayTeamId: 'team_15', status: 'live', score: { home: 1, away: 1 }, linkedMatchId: 'm1' },
  { id: 'bm6', roundId: 'r1', slot: 6, homeTeamId: 'team_7', awayTeamId: 'team_10', status: 'scheduled' },
  { id: 'bm7', roundId: 'r1', slot: 7, homeTeamId: 'team_3', awayTeamId: 'team_14', status: 'scheduled' },
  { id: 'bm8', roundId: 'r1', slot: 8, homeTeamId: 'team_6', awayTeamId: 'team_11', status: 'scheduled' },

  { id: 'bm9', roundId: 'r2', slot: 1, homeTeamId: 'team_1', awayTeamId: 'team_9', status: 'scheduled' },
  { id: 'bm10', roundId: 'r2', slot: 2, homeTeamId: 'team_5', awayTeamId: 'team_13', status: 'scheduled' },
  { id: 'bm11', roundId: 'r2', slot: 3, homeTeamId: null, awayTeamId: null, status: 'scheduled' },
  { id: 'bm12', roundId: 'r2', slot: 4, homeTeamId: null, awayTeamId: null, status: 'scheduled' },

  { id: 'bm13', roundId: 'r3', slot: 1, homeTeamId: null, awayTeamId: null, status: 'scheduled' },
  { id: 'bm14', roundId: 'r3', slot: 2, homeTeamId: null, awayTeamId: null, status: 'scheduled' },

  { id: 'bm15', roundId: 'r4', slot: 1, homeTeamId: null, awayTeamId: null, status: 'scheduled' },
]
