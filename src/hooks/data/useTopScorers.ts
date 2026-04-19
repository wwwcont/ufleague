import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useTopScorers = (options?: { limit?: number; tournamentId?: string }) => {
  const { playersRepository } = useRepositories()
  const limit = options?.limit
  const tournamentId = options?.tournamentId

  const loader = useCallback(async () => {
    if (!playersRepository.getTopScorers) return []
    return playersRepository.getTopScorers({ limit, tournamentId })
  }, [limit, playersRepository, tournamentId])

  return useQueryState(loader, (rows) => rows.length === 0)
}
