import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'
import type { PlayoffGrid } from '../../domain/entities/types'

export const usePlayoffGrid = (tournamentId: string) => {
  const { playoffGridRepository } = useRepositories()
  const loader = useCallback(async () => {
    try {
      return await playoffGridRepository.getPlayoffGrid(tournamentId)
    } catch {
      return { cells: [], lines: [] } satisfies PlayoffGrid
    }
  }, [playoffGridRepository, tournamentId])
  return useQueryState(loader)
}
