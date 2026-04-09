import { createBrowserRouter } from 'react-router-dom'
import { PublicShell } from '../../layouts/public-shell/PublicShell'
import { BracketPage } from '../../pages/bracket/BracketPage'
import { HomePage } from '../../pages/home/HomePage'
import { LoginPage } from '../../pages/login/LoginPage'
import { MatchDetailsPage } from '../../pages/matches/MatchDetailsPage'
import { MatchesPage } from '../../pages/matches/MatchesPage'
import { PlayerDetailsPage } from '../../pages/players/PlayerDetailsPage'
import { PlayersPage } from '../../pages/players/PlayersPage'
import { ProfilePage } from '../../pages/profile/ProfilePage'
import { SearchPage } from '../../pages/search/SearchPage'
import { TablePage } from '../../pages/table/TablePage'
import { TeamDetailsPage } from '../../pages/teams/TeamDetailsPage'
import { TeamsPage } from '../../pages/teams/TeamsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/:matchId', element: <MatchDetailsPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:teamId', element: <TeamDetailsPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:playerId', element: <PlayerDetailsPage /> },
      { path: 'table', element: <TablePage /> },
      { path: 'bracket', element: <BracketPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])
