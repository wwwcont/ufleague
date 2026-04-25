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

const dedupeEvents = <T extends { id: string }>(events: T[]) => {
  const byId = new Map<string, T>()
  events.forEach((event) => {
    if (!byId.has(event.id)) byId.set(event.id, event)
  })
  return [...byId.values()]
}

export const useEvents = (filters?: UseEventsFilters) => {
  const { eventsRepository } = useRepositories()
  const entityType = filters?.entityType
  const entityId = filters?.entityId
  const category = filters?.category
  const limit = filters?.limit

  const loader = useCallback(async () => {
    const all = await eventsRepository.getEvents()

    const filtered = all
      .filter((event) => {
        if (entityType && event.entityType !== entityType) return false
        if (entityId && event.entityId !== entityId) return false
        if (category && event.category !== category) return false
        return true
      })

    return dedupeEvents(filtered).slice(0, limit ?? filtered.length)
  }, [category, entityId, entityType, eventsRepository, limit])

  return useQueryState(loader, (list) => list.length === 0)
}
