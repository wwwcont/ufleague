import { useMemo } from 'react'
import { events } from '../../mocks/data/events'

export const useEventDetails = (eventId?: string) => {
  const data = useMemo(() => events.find((event) => event.id === eventId) ?? null, [eventId])
  return { data }
}
