import { createContext } from 'react'
import { repositories } from '../../infrastructure/api/repositories'

export const RepositoriesContext = createContext(repositories)
