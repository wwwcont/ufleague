import type { PublicEvent } from '../entities/types'

const normalized = (value?: string) => String(value ?? '').trim().toLowerCase()

export const isSystemMatchFeedEvent = (event: PublicEvent) => {
  if (event.entityType !== 'match') return false
  const source = normalized(event.source)
  const title = normalized(event.title)
  const summary = normalized(event.summary)
  const text = normalized(event.text)

  if (source.includes('system')) return true
  if (title.startsWith('система:')) return true
  if (summary.startsWith('система:')) return true
  if (text.startsWith('система:')) return true
  return false
}

