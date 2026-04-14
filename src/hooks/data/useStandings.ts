import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useStandings = (tournamentId?: string) => {
  const { standingsRepository } = useRepositories()
  const loader = useCallback(() => standingsRepository.getStandings(tournamentId), [standingsRepository, tournamentId])
  return useQueryState(loader, (list) => list.length === 0)
}
