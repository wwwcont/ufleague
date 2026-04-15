import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useMatches = (includeArchived = false) => {
  const { matchesRepository } = useRepositories()
  const loader = useCallback(() => matchesRepository.getMatches({ includeArchived }), [includeArchived, matchesRepository])
  return useQueryState(loader, (list) => list.length === 0)
}
