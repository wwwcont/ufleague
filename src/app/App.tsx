import { RouterProvider } from 'react-router-dom'
import { RepositoriesProvider } from './providers/repositories-provider'
import { router } from './router/route-config'

export const App = () => (
  <RepositoriesProvider>
    <RouterProvider router={router} />
  </RepositoriesProvider>
)
