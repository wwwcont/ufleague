import type { Team } from '../../domain/entities/types'

export const teams: Team[] = [
  { id: 'team_1', name: 'Северные Соколы', shortName: 'ССК', logoUrl: null, city: 'Североград', coach: 'А. Морозов', group: 'A', form: ['W', 'W', 'D', 'L', 'W'], statsSummary: { played: 6, won: 4, drawn: 1, lost: 1, goalsFor: 10, goalsAgainst: 5, goalDiff: 5, points: 13 } },
  { id: 'team_2', name: 'Столичные Роверы', shortName: 'СРВ', logoUrl: null, city: 'Столица', coach: 'Л. Перес', group: 'A', form: ['W', 'D', 'W', 'W', 'D'], statsSummary: { played: 6, won: 3, drawn: 3, lost: 0, goalsFor: 9, goalsAgainst: 4, goalDiff: 5, points: 12 } },
  { id: 'team_3', name: 'Прибрежный Юнайтед', shortName: 'ПЮН', logoUrl: null, city: 'Приморск', coach: 'Р. Сингх', group: 'A', form: ['L', 'W', 'D', 'W', 'L'], statsSummary: { played: 6, won: 2, drawn: 2, lost: 2, goalsFor: 7, goalsAgainst: 8, goalDiff: -1, points: 8 } },
  { id: 'team_4', name: 'Железные Волки', shortName: 'ЖВЛ', logoUrl: null, city: 'Железнодол', coach: 'К. Новак', group: 'A', form: ['D', 'L', 'W', 'D', 'L'], statsSummary: { played: 6, won: 1, drawn: 2, lost: 3, goalsFor: 4, goalsAgainst: 8, goalDiff: -4, points: 5 } },
  { id: 'team_5', name: 'Метро Старс', shortName: 'МТС', logoUrl: null, city: 'Метрополис', coach: 'И. Чэнь', group: 'B', form: ['W', 'W', 'W', 'D', 'W'], statsSummary: { played: 6, won: 5, drawn: 1, lost: 0, goalsFor: 13, goalsAgainst: 3, goalDiff: 10, points: 16 } },
  { id: 'team_6', name: 'Портовые Короли', shortName: 'ПКР', logoUrl: null, city: 'Портовск', coach: 'С. Хан', group: 'B', form: ['L', 'W', 'D', 'W', 'D'], statsSummary: { played: 6, won: 3, drawn: 2, lost: 1, goalsFor: 8, goalsAgainst: 5, goalDiff: 3, points: 11 } },
  { id: 'team_7', name: 'Долинные Рейнджеры', shortName: 'ДРН', logoUrl: null, city: 'Долина', coach: 'М. Ортега', group: 'B', form: ['L', 'D', 'L', 'W', 'L'], statsSummary: { played: 6, won: 1, drawn: 1, lost: 4, goalsFor: 5, goalsAgainst: 11, goalDiff: -6, points: 4 } },
  { id: 'team_8', name: 'Королевская Кузня', shortName: 'ККЗ', logoUrl: null, city: 'Роялтон', coach: 'Т. Силва', group: 'B', form: ['D', 'L', 'D', 'L', 'D'], statsSummary: { played: 6, won: 0, drawn: 3, lost: 3, goalsFor: 3, goalsAgainst: 10, goalDiff: -7, points: 3 } },
]
