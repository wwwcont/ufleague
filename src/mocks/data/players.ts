import type { Player } from '../../domain/entities/types'

const make = (id: string, userId: string, teamId: string, displayName: string, number: number, position: Player['position']): Player => ({
  id,
  userId,
  teamId,
  displayName,
  number,
  position,
  age: 20 + (number % 12),
  avatar: null,
  bio: 'Игрок основной обоймы, готов к ротации и высоким нагрузкам.',
  socials: {
    telegram: `https://t.me/${id}`,
  },
  stats: { goals: number % 6, assists: number % 4, appearances: 6 },
})

export const players: Player[] = [
  make('p1', 'u_player', 'team_1', 'М. Картер', 9, 'FW'), make('p2', 'u_captain', 'team_1', 'Д. Хейз', 8, 'MF'), make('p3', 'u_admin', 'team_1', 'Д. Куинн', 1, 'GK'),
  make('p4', 'u_superadmin', 'team_2', 'А. Белл', 10, 'FW'), make('p5', 'u_p5', 'team_2', 'Р. Мур', 6, 'MF'), make('p6', 'u_p6', 'team_2', 'Ф. Лэйн', 2, 'DF'),
  make('p7', 'u_p7', 'team_3', 'Н. Парк', 11, 'FW'), make('p8', 'u_p8', 'team_3', 'К. Лонг', 7, 'MF'), make('p9', 'u_p9', 'team_3', 'К. Вест', 4, 'DF'),
  make('p10', 'u_p10', 'team_4', 'П. Стоун', 9, 'FW'), make('p11', 'u_p11', 'team_4', 'И. Кросс', 5, 'MF'), make('p12', 'u_p12', 'team_4', 'Б. Росс', 1, 'GK'),
  make('p13', 'u_p13', 'team_5', 'Л. Грей', 9, 'FW'), make('p14', 'u_p14', 'team_5', 'С. Адамс', 8, 'MF'), make('p15', 'u_p15', 'team_5', 'Р. Коул', 3, 'DF'),
  make('p16', 'u_p16', 'team_6', 'Т. Янг', 9, 'FW'), make('p17', 'u_p17', 'team_6', 'В. Рид', 6, 'MF'), make('p18', 'u_p18', 'team_6', 'Э. Фокс', 1, 'GK'),
  make('p19', 'u_p19', 'team_7', 'Г. Уорд', 10, 'FW'), make('p20', 'u_p20', 'team_7', 'Х. Перри', 7, 'MF'), make('p21', 'u_p21', 'team_7', 'А. Кент', 2, 'DF'),
  make('p22', 'u_p22', 'team_8', 'О. Блейк', 9, 'FW'), make('p23', 'u_p23', 'team_8', 'И. Шоу', 6, 'MF'), make('p24', 'u_p24', 'team_8', 'У. Нэш', 1, 'GK'),
  make('p25', 'u_p25', 'team_9', 'Т. Марш', 9, 'FW'), make('p26', 'u_p26', 'team_9', 'Э. Райт', 8, 'MF'), make('p27', 'u_p27', 'team_9', 'Р. Грей', 1, 'GK'),
  make('p28', 'u_p28', 'team_10', 'К. Волш', 10, 'FW'), make('p29', 'u_p29', 'team_10', 'Ю. Льюис', 6, 'MF'), make('p30', 'u_p30', 'team_10', 'С. Кларк', 3, 'DF'),
  make('p31', 'u_p31', 'team_11', 'Н. Холл', 11, 'FW'), make('p32', 'u_p32', 'team_11', 'А. Ривз', 7, 'MF'), make('p33', 'u_p33', 'team_11', 'И. Кейн', 2, 'DF'),
  make('p34', 'u_p34', 'team_12', 'П. Оуэн', 9, 'FW'), make('p35', 'u_p35', 'team_12', 'В. Скотт', 6, 'MF'), make('p36', 'u_p36', 'team_12', 'Д. Хант', 1, 'GK'),
  make('p37', 'u_p37', 'team_13', 'С. Броди', 9, 'FW'), make('p38', 'u_p38', 'team_13', 'К. Дин', 8, 'MF'), make('p39', 'u_p39', 'team_13', 'О. Лоу', 4, 'DF'),
  make('p40', 'u_p40', 'team_14', 'Р. Кей', 10, 'FW'), make('p41', 'u_p41', 'team_14', 'Я. Пирс', 7, 'MF'), make('p42', 'u_p42', 'team_14', 'М. Филд', 2, 'DF'),
  make('p43', 'u_p43', 'team_15', 'Т. Рид', 9, 'FW'), make('p44', 'u_p44', 'team_15', 'Э. Бойл', 6, 'MF'), make('p45', 'u_p45', 'team_15', 'Ф. Ллойд', 1, 'GK'),
  make('p46', 'u_p46', 'team_16', 'Б. Симмс', 11, 'FW'), make('p47', 'u_p47', 'team_16', 'Л. Харрис', 8, 'MF'), make('p48', 'u_p48', 'team_16', 'Г. Прайс', 3, 'DF'),
]
