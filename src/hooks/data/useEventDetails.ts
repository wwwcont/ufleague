import { useCallback } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

export const useEventDetails = (eventId?: string) => {
  const { eventsRepository } = useRepositories()
  const loader = useCallback(() => (eventId ? eventsRepository.getEventById(eventId) : Promise.resolve(null)), [eventId, eventsRepository])
  return useQueryState(loader, (item) => !item)
}
