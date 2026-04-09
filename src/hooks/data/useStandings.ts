import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useStandings = () => {
  const { standingsRepository } = useRepositories()
  const loader = useCallback(() => standingsRepository.getStandings(), [standingsRepository])
  return useQueryState(loader, (list) => list.length === 0)
}
