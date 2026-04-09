import { useMemo } from 'react'
import { events } from '../../mocks/data/events'

export const useEvents = () => {
  const data = useMemo(() => events, [])
  return { data }
}
