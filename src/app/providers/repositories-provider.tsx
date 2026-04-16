import type { PropsWithChildren } from 'react'
import { repositories as apiRepositories } from '../../infrastructure/api/repositories'
import { RepositoriesContext } from './repositories-context'

export const RepositoriesProvider = ({ children }: PropsWithChildren) => (
  <RepositoriesContext.Provider value={apiRepositories}>{children}</RepositoriesContext.Provider>
)
