import type { PublicEvent } from '../../domain/entities/types'
import { EventCard } from './EventCard'

export const EventTimelineItem = ({ event, isLast }: { event: PublicEvent; isLast?: boolean }) => (
  <div className="relative pl-4">
    <span className="absolute left-0 top-3 h-2 w-2 rounded-full bg-accentYellow" />
    {!isLast && <span className="absolute left-[3px] top-6 h-[calc(100%-8px)] w-px bg-borderSubtle" />}
    <EventCard event={event} />
  </div>
)
