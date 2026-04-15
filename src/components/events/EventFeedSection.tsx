import { Link } from 'react-router-dom'
import { Bell, BellOff } from 'lucide-react'
import type { PublicEvent } from '../../domain/entities/types'
import { EventCard } from './EventCard'
import { EventEmptyState } from './EventEmptyState'
import { EventTimelineItem } from './EventTimelineItem'
import { useSession } from '../../app/providers/use-session'
import { useUserPreferences } from '../../hooks/app/useUserPreferences'

interface EventFeedSectionProps {
  title: string
  events: PublicEvent[]
  layout?: 'cards' | 'timeline'
  messageWhenEmpty?: string
  linkToAll?: string
  notificationScopeKey?: string
}

export const EventFeedSection = ({ title, events, layout = 'cards', messageWhenEmpty, linkToAll, notificationScopeKey }: EventFeedSectionProps) => {
  const { session } = useSession()
  const { isFeedMuted, toggleFeedMuted } = useUserPreferences()
  const feedKey = notificationScopeKey ?? title
  const muted = session.isAuthenticated ? isFeedMuted(feedKey) : false

  return (
    <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-textPrimary">{title}</h2>
        <div className="flex items-center gap-2">
          {session.isAuthenticated && (
            <button
              type="button"
              aria-label={muted ? 'Включить уведомления по ленте' : 'Выключить уведомления по ленте'}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${muted ? 'border-borderSubtle text-textMuted' : 'border-accentYellow/60 text-accentYellow'} bg-panelBg`}
              onClick={() => toggleFeedMuted(feedKey)}
            >
              {muted ? <BellOff size={14} /> : <Bell size={14} />}
            </button>
          )}
          {linkToAll && <Link to={linkToAll} className="text-xs text-accentYellow hover:underline">ВСЕ</Link>}
        </div>
      </div>

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
}
