import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useTopScorers = (options?: { limit?: number; tournamentId?: string }) => {
  const { playersRepository } = useRepositories()

  const loader = useCallback(async () => {
    if (!playersRepository.getTopScorers) return []
    return playersRepository.getTopScorers(options)
  }, [options, playersRepository])

  return useQueryState(loader, (rows) => rows.length === 0)
}
