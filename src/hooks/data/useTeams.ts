import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useTeams = () => {
  const { teamsRepository } = useRepositories()
  const loader = useCallback(() => teamsRepository.getTeams(), [teamsRepository])
  return useQueryState(loader, (list) => list.length === 0)
}
