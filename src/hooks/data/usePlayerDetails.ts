import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const usePlayerDetails = (playerId?: string) => {
  const { playersRepository } = useRepositories()
  const loader = useCallback(() => (playerId ? playersRepository.getPlayerById(playerId) : Promise.resolve(null)), [playerId, playersRepository])
  return useQueryState(loader, (item) => !item)
}
