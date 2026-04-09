import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useMatches = () => {
  const { matchesRepository } = useRepositories()
  const loader = useCallback(() => matchesRepository.getMatches(), [matchesRepository])
  return useQueryState(loader, (list) => list.length === 0)
}
