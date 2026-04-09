import type { Match } from '../../domain/entities/types'

export const matches: Match[] = [
  { id: 'm1', round: 'Round 7', date: '2026-04-10', time: '18:00', venue: 'North Arena', status: 'live', homeTeamId: 'team_1', awayTeamId: 'team_2', score: { home: 1, away: 1 }, events: [{ id: 'e1', minute: 23, type: 'goal', teamId: 'team_1' }, { id: 'e2', minute: 39, type: 'goal', teamId: 'team_2' }], featured: true },
  { id: 'm2', round: 'Round 7', date: '2026-04-10', time: '20:00', venue: 'Coastal Park', status: 'scheduled', homeTeamId: 'team_3', awayTeamId: 'team_4', score: { home: 0, away: 0 }, events: [], featured: false },
  { id: 'm3', round: 'Round 7', date: '2026-04-11', time: '18:00', venue: 'Metro Dome', status: 'scheduled', homeTeamId: 'team_5', awayTeamId: 'team_6', score: { home: 0, away: 0 }, events: [], featured: false },
  { id: 'm4', round: 'Round 7', date: '2026-04-11', time: '20:00', venue: 'Royal Field', status: 'scheduled', homeTeamId: 'team_7', awayTeamId: 'team_8', score: { home: 0, away: 0 }, events: [], featured: false },
  { id: 'm5', round: 'Quarter-final', date: '2026-04-05', time: '19:00', venue: 'National Stadium', status: 'finished', homeTeamId: 'team_5', awayTeamId: 'team_4', score: { home: 2, away: 0 }, events: [{ id: 'e3', minute: 15, type: 'goal', teamId: 'team_5' }, { id: 'e4', minute: 78, type: 'goal', teamId: 'team_5' }], featured: false },
]
