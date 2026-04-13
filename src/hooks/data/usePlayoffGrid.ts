import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const usePlayoffGrid = (tournamentId: string) => {
  const { playoffGridRepository } = useRepositories()
  const loader = useCallback(() => playoffGridRepository.getPlayoffGrid(tournamentId), [playoffGridRepository, tournamentId])
  return useQueryState(loader)
}
