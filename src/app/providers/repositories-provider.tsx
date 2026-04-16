import type { PropsWithChildren } from 'react'
import { repositories as apiRepositories } from '../../infrastructure/api/repositories'
import { repositories as mockRepositories } from '../../mocks/repositories'
import { RepositoriesContext } from './repositories-context'

const useBackend = String(import.meta.env.VITE_USE_BACKEND ?? 'true').toLowerCase() !== 'false'
const activeRepositories = useBackend ? apiRepositories : mockRepositories

export const RepositoriesProvider = ({ children }: PropsWithChildren) => (
  <RepositoriesContext.Provider value={activeRepositories}>{children}</RepositoriesContext.Provider>
)
