import { RouterProvider } from 'react-router-dom'
import { RepositoriesProvider } from './providers/repositories-provider'
import { SessionProvider } from './providers/session-provider'
import { NotificationsProvider } from './providers/notifications-provider'
import { router } from './router/route-config'

export const App = () => (
  <RepositoriesProvider>
    <SessionProvider>
      <NotificationsProvider>
        <RouterProvider router={router} />
      </NotificationsProvider>
    </SessionProvider>
  </RepositoriesProvider>
)
