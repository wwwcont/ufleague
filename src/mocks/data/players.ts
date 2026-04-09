import type { Player } from '../../domain/entities/types'

const make = (id: string, teamId: string, displayName: string, number: number, position: Player['position']): Player => ({
  id,
  teamId,
  displayName,
  number,
  position,
  age: 20 + (number % 12),
  avatar: null,
  stats: { goals: number % 6, assists: number % 4, appearances: 6 },
})

export const players: Player[] = [
  make('p1', 'team_1', 'М. Картер', 9, 'FW'), make('p2', 'team_1', 'Д. Хейз', 8, 'MF'), make('p3', 'team_1', 'Д. Куинн', 1, 'GK'),
  make('p4', 'team_2', 'А. Белл', 10, 'FW'), make('p5', 'team_2', 'Р. Мур', 6, 'MF'), make('p6', 'team_2', 'Ф. Лэйн', 2, 'DF'),
  make('p7', 'team_3', 'Н. Парк', 11, 'FW'), make('p8', 'team_3', 'К. Лонг', 7, 'MF'), make('p9', 'team_3', 'К. Вест', 4, 'DF'),
  make('p10', 'team_4', 'П. Стоун', 9, 'FW'), make('p11', 'team_4', 'И. Кросс', 5, 'MF'), make('p12', 'team_4', 'Б. Росс', 1, 'GK'),
  make('p13', 'team_5', 'Л. Грей', 9, 'FW'), make('p14', 'team_5', 'С. Адамс', 8, 'MF'), make('p15', 'team_5', 'Р. Коул', 3, 'DF'),
  make('p16', 'team_6', 'Т. Янг', 9, 'FW'), make('p17', 'team_6', 'В. Рид', 6, 'MF'), make('p18', 'team_6', 'Э. Фокс', 1, 'GK'),
  make('p19', 'team_7', 'Г. Уорд', 10, 'FW'), make('p20', 'team_7', 'Х. Перри', 7, 'MF'), make('p21', 'team_7', 'А. Кент', 2, 'DF'),
  make('p22', 'team_8', 'О. Блейк', 9, 'FW'), make('p23', 'team_8', 'И. Шоу', 6, 'MF'), make('p24', 'team_8', 'У. Нэш', 1, 'GK'),
]
