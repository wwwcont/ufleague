import type { PropsWithChildren } from 'react'
import { repositories as mockRepositories } from '../../mocks/repositories'
import { repositories as apiRepositories } from '../../infrastructure/api/repositories'
import { RepositoriesContext } from './repositories-context'

const selected = import.meta.env.VITE_USE_BACKEND === 'true' ? apiRepositories : mockRepositories

export const RepositoriesProvider = ({ children }: PropsWithChildren) => (
  <RepositoriesContext.Provider value={selected}>{children}</RepositoriesContext.Provider>
)
