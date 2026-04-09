import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useBracket = () => {
  const { bracketRepository } = useRepositories()
  const loader = useCallback(() => bracketRepository.getBracket(), [bracketRepository])
  return useQueryState(loader)
}
