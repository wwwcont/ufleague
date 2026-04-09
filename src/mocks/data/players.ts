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
  make('p1', 'team_1', 'M. Carter', 9, 'FW'), make('p2', 'team_1', 'D. Hayes', 8, 'MF'), make('p3', 'team_1', 'J. Quinn', 1, 'GK'),
  make('p4', 'team_2', 'A. Bell', 10, 'FW'), make('p5', 'team_2', 'R. Moore', 6, 'MF'), make('p6', 'team_2', 'F. Lane', 2, 'DF'),
  make('p7', 'team_3', 'N. Park', 11, 'FW'), make('p8', 'team_3', 'K. Long', 7, 'MF'), make('p9', 'team_3', 'C. West', 4, 'DF'),
  make('p10', 'team_4', 'P. Stone', 9, 'FW'), make('p11', 'team_4', 'I. Cross', 5, 'MF'), make('p12', 'team_4', 'B. Ross', 1, 'GK'),
  make('p13', 'team_5', 'L. Gray', 9, 'FW'), make('p14', 'team_5', 'S. Adams', 8, 'MF'), make('p15', 'team_5', 'R. Cole', 3, 'DF'),
  make('p16', 'team_6', 'T. Young', 9, 'FW'), make('p17', 'team_6', 'V. Reed', 6, 'MF'), make('p18', 'team_6', 'E. Fox', 1, 'GK'),
  make('p19', 'team_7', 'G. Ward', 10, 'FW'), make('p20', 'team_7', 'H. Perry', 7, 'MF'), make('p21', 'team_7', 'A. Kent', 2, 'DF'),
  make('p22', 'team_8', 'O. Blake', 9, 'FW'), make('p23', 'team_8', 'Y. Shaw', 6, 'MF'), make('p24', 'team_8', 'U. Nash', 1, 'GK'),
]
