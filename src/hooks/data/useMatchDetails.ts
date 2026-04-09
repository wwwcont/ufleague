import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useMatchDetails = (matchId?: string) => {
  const { matchesRepository } = useRepositories()
  const loader = useCallback(() => (matchId ? matchesRepository.getMatchById(matchId) : Promise.resolve(null)), [matchId, matchesRepository])
  return useQueryState(loader, (item) => !item)
}
