import type { BracketMatch, BracketRound } from '../../domain/entities/types'

export const bracketRounds: BracketRound[] = [
  { id: 'r1', label: 'Четвертьфинал', order: 1 },
  { id: 'r2', label: 'Полуфинал', order: 2 },
  { id: 'r3', label: 'Финал', order: 3 },
]

export const bracketMatches: BracketMatch[] = [
  { id: 'bm1', roundId: 'r1', slot: 1, homeTeamId: 'team_5', awayTeamId: 'team_4', winnerTeamId: 'team_5', status: 'finished', linkedMatchId: 'm5', score: { home: 2, away: 0 } },
  { id: 'bm2', roundId: 'r1', slot: 2, homeTeamId: 'team_1', awayTeamId: 'team_2', status: 'live', linkedMatchId: 'm1', score: { home: 1, away: 1 } },
  { id: 'bm3', roundId: 'r2', slot: 1, homeTeamId: 'team_5', awayTeamId: null, status: 'scheduled' },
  { id: 'bm4', roundId: 'r3', slot: 1, homeTeamId: null, awayTeamId: null, status: 'scheduled' },
]
