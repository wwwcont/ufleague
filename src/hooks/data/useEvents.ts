import { useCallback } from 'react'
import type { EventCategory, EventEntityType } from '../../domain/entities/types'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from './useQueryState'

interface UseEventsFilters {
  entityType?: EventEntityType
  entityId?: string
  category?: EventCategory
  limit?: number
}

export const useEvents = (filters?: UseEventsFilters) => {
  const { eventsRepository } = useRepositories()
  const entityType = filters?.entityType
  const entityId = filters?.entityId
  const category = filters?.category
  const limit = filters?.limit

  const loader = useCallback(async () => {
    const all = await eventsRepository.getEvents()

    return all
      .filter((event) => {
        if (entityType && event.entityType !== entityType) return false
        if (entityId && event.entityId !== entityId) return false
        if (category && event.category !== category) return false
        return true
      })
      .slice(0, limit ?? all.length)
  }, [category, entityId, entityType, eventsRepository, limit])

  return useQueryState(loader, (list) => list.length === 0)
}
