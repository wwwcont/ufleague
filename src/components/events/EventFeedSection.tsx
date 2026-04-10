import type { PublicEvent } from '../../domain/entities/types'
import { EventCard } from './EventCard'
import { EventEmptyState } from './EventEmptyState'
import { EventTimelineItem } from './EventTimelineItem'

interface EventFeedSectionProps {
  title: string
  events: PublicEvent[]
  layout?: 'cards' | 'timeline'
  messageWhenEmpty?: string
}

export const EventFeedSection = ({ title, events, layout = 'cards', messageWhenEmpty }: EventFeedSectionProps) => (
  <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
    <h2 className="mb-3 text-base font-semibold text-textPrimary">{title}</h2>

    {events.length === 0 ? (
      <EventEmptyState message={messageWhenEmpty} />
    ) : layout === 'timeline' ? (
      <div className="space-y-2">
        {events.map((event, index) => (
          <EventTimelineItem key={event.id} event={event} isLast={index === events.length - 1} />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    )}
  </section>
)
