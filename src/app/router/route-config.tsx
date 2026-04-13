import { createBrowserRouter } from 'react-router-dom'
import { PublicShell } from '../../layouts/public-shell/PublicShell'
import { EventDetailsPage } from '../../pages/events/EventDetailsPage'
import { EventsPage } from '../../pages/events/EventsPage'
import { CommentsPage } from '../../pages/comments/CommentsPage'
import { HomePage } from '../../pages/home/HomePage'
import { LoginPage } from '../../pages/login/LoginPage'
import { MatchDetailsPage } from '../../pages/matches/MatchDetailsPage'
import { MatchEventsPage } from '../../pages/matches/MatchEventsPage'
import { MatchesPage } from '../../pages/matches/MatchesPage'
import { PlayerDetailsPage } from '../../pages/players/PlayerDetailsPage'
import { PlayersPage } from '../../pages/players/PlayersPage'
import { ProfilePage } from '../../pages/profile/ProfilePage'
import { CabinetSectionPage } from '../../pages/profile/CabinetSectionPage'
import { SearchPage } from '../../pages/search/SearchPage'
import { TablePage } from '../../pages/table/TablePage'
import { TeamDetailsPage } from '../../pages/teams/TeamDetailsPage'
import { TeamEventsPage } from '../../pages/teams/TeamEventsPage'
import { TeamRosterPage } from '../../pages/teams/TeamRosterPage'
import { TeamsPage } from '../../pages/teams/TeamsPage'
import { UserDetailsPage } from '../../pages/users/UserDetailsPage'
import { AppRouteError } from './AppRouteError'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicShell />,
    errorElement: <AppRouteError />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'matches', element: <MatchesPage /> },
      { path: 'matches/:matchId', element: <MatchDetailsPage /> },
      { path: 'matches/:matchId/events', element: <MatchEventsPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'teams/:teamId', element: <TeamDetailsPage /> },
      { path: 'teams/:teamId/roster', element: <TeamRosterPage /> },
      { path: 'teams/:teamId/events', element: <TeamEventsPage /> },
      { path: 'players', element: <PlayersPage /> },
      { path: 'players/:playerId', element: <PlayerDetailsPage /> },
      { path: 'table', element: <TablePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:eventId', element: <EventDetailsPage /> },
      { path: 'comments/:entityType/:entityId', element: <CommentsPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'profile/:section', element: <CabinetSectionPage /> },
      { path: 'users/:userId', element: <UserDetailsPage /> },
    ],
  },
])
