import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const usePlayers = (teamId?: string) => {
  const { playersRepository } = useRepositories()
  const loader = useCallback(() => playersRepository.getPlayers(teamId), [playersRepository, teamId])
  return useQueryState(loader, (list) => list.length === 0)
}
