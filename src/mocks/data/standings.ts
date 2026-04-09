import type { StandingRow } from '../../domain/entities/types'

export const standings: StandingRow[] = [
  { position: 1, teamId: 'team_1', played: 6, won: 4, drawn: 1, lost: 1, goalsFor: 10, goalsAgainst: 5, goalDiff: 5, points: 13 },
  { position: 2, teamId: 'team_2', played: 6, won: 3, drawn: 3, lost: 0, goalsFor: 9, goalsAgainst: 4, goalDiff: 5, points: 12 },
  { position: 3, teamId: 'team_3', played: 6, won: 2, drawn: 2, lost: 2, goalsFor: 7, goalsAgainst: 8, goalDiff: -1, points: 8 },
  { position: 4, teamId: 'team_4', played: 6, won: 1, drawn: 2, lost: 3, goalsFor: 4, goalsAgainst: 8, goalDiff: -4, points: 5 },
  { position: 5, teamId: 'team_5', played: 6, won: 5, drawn: 1, lost: 0, goalsFor: 13, goalsAgainst: 3, goalDiff: 10, points: 16 },
  { position: 6, teamId: 'team_6', played: 6, won: 3, drawn: 2, lost: 1, goalsFor: 8, goalsAgainst: 5, goalDiff: 3, points: 11 },
  { position: 7, teamId: 'team_7', played: 6, won: 1, drawn: 1, lost: 4, goalsFor: 5, goalsAgainst: 11, goalDiff: -6, points: 4 },
  { position: 8, teamId: 'team_8', played: 6, won: 0, drawn: 3, lost: 3, goalsFor: 3, goalsAgainst: 10, goalDiff: -7, points: 3 },
]
