import { useContext } from 'react'
import { RepositoriesContext } from './repositories-context'

export const useRepositories = () => useContext(RepositoriesContext)
