import type { ReactNode } from 'react'
import { repositories } from '../../mocks/repositories'
import { RepositoriesContext } from './repositories-context'

export const RepositoriesProvider = ({ children }: { children: ReactNode }) => (
  <RepositoriesContext.Provider value={repositories}>{children}</RepositoriesContext.Provider>
)
