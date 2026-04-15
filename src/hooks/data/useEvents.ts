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

const normalizeForKey = (value?: string) => (value ?? '').trim().toLowerCase()

const dedupeEvents = <T extends { id: string; title: string; summary: string; timestamp: string; source: string; entityType: string; entityId?: string }>(events: T[]) => {
  const byKey = new Map<string, T>()

  events.forEach((event) => {
    const tsMinute = String(event.timestamp ?? '').slice(0, 16)
    const key = [
      event.entityType,
      event.entityId ?? '-',
      normalizeForKey(event.title),
      normalizeForKey(event.summary),
      tsMinute,
    ].join('|')
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, event)
      return
    }
    const existingIsSystem = normalizeForKey(existing.source).includes('system')
    const nextIsSystem = normalizeForKey(event.source).includes('system')
    if (existingIsSystem && !nextIsSystem) byKey.set(key, event)
  })

  return [...byKey.values()]
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
