import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useTeamDetails = (teamId?: string) => {
  const { teamsRepository } = useRepositories()
  const loader = useCallback(() => (teamId ? teamsRepository.getTeamById(teamId) : Promise.resolve(null)), [teamId, teamsRepository])
  return useQueryState(loader, (item) => !item)
}
