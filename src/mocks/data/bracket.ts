import type { BracketMatchGroup, BracketStage, BracketSettings } from '../../domain/entities/types'

export const bracketSettings: BracketSettings = {
  teamCapacity: 16,
}

export const bracketStages: BracketStage[] = [
  { id: 's1', label: '1/8 финала', order: 1, size: 8 },
  { id: 's2', label: '1/4 финала', order: 2, size: 4 },
  { id: 's3', label: 'Полуфинал', order: 3, size: 2 },
  { id: 's4', label: 'Финал', order: 4, size: 1 },
]

export const bracketGroups: BracketMatchGroup[] = [
  {
    id: 'bg1',
    stageId: 's1',
    slot: 1,
    homeTeamId: 'team_1',
    awayTeamId: 'team_16',
    tieFormat: 2,
    firstLeg: { matchId: 'm1', score: { home: 2, away: 0 }, status: 'finished' },
    secondLeg: { matchId: 'm2', score: { home: 1, away: 1 }, status: 'finished' },
    winnerTeamId: 'team_1',
  },
  {
    id: 'bg2',
    stageId: 's1',
    slot: 2,
    homeTeamId: 'team_8',
    awayTeamId: 'team_9',
    tieFormat: 1,
    firstLeg: { matchId: 'm3', score: { home: 1, away: 3 }, status: 'finished' },
    winnerTeamId: 'team_9',
  },
  {
    id: 'bg3',
    stageId: 's1',
    slot: 3,
    homeTeamId: 'team_5',
    awayTeamId: 'team_12',
    tieFormat: 2,
    firstLeg: { matchId: null, status: 'scheduled' },
    secondLeg: { matchId: null, status: 'scheduled' },
  },
  {
    id: 'bg4',
    stageId: 's1',
    slot: 4,
    homeTeamId: 'team_4',
    awayTeamId: 'team_13',
    tieFormat: 2,
    firstLeg: { matchId: null, status: 'scheduled' },
    secondLeg: { matchId: null, status: 'scheduled' },
  },
  { id: 'bg5', stageId: 's1', slot: 5, homeTeamId: 'team_2', awayTeamId: 'team_15', tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },
  { id: 'bg6', stageId: 's1', slot: 6, homeTeamId: 'team_7', awayTeamId: 'team_10', tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },
  { id: 'bg7', stageId: 's1', slot: 7, homeTeamId: null, awayTeamId: null, tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },

  { id: 'bg9', stageId: 's2', slot: 1, homeTeamId: 'team_1', awayTeamId: 'team_9', tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },
  { id: 'bg10', stageId: 's2', slot: 2, homeTeamId: null, awayTeamId: null, tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },

  { id: 'bg13', stageId: 's3', slot: 1, homeTeamId: null, awayTeamId: null, tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },
  { id: 'bg14', stageId: 's3', slot: 2, homeTeamId: null, awayTeamId: null, tieFormat: 2, firstLeg: { matchId: null, status: 'scheduled' }, secondLeg: { matchId: null, status: 'scheduled' } },

  { id: 'bg15', stageId: 's4', slot: 1, homeTeamId: null, awayTeamId: null, tieFormat: 1, firstLeg: { matchId: null, status: 'scheduled' } },
]
