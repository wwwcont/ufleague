import type { Match, Player, PublicEvent, Team } from '../../domain/entities/types'
import { EventCard } from './EventCard'

interface EventTimelineItemProps {
  event: PublicEvent
  isLast?: boolean
  teamsById?: Record<string, Team | undefined>
  playersById?: Record<string, Player | undefined>
  matchesById?: Record<string, Match | undefined>
}

export const EventTimelineItem = ({ event, isLast, teamsById, playersById, matchesById }: EventTimelineItemProps) => (
  <div className="relative pl-4">
    <span className="absolute left-0 top-3 h-2 w-2 rounded-full bg-accentYellow" />
    {!isLast && <span className="absolute left-[3px] top-6 h-[calc(100%-8px)] w-px bg-borderSubtle" />}
    <EventCard event={event} teamsById={teamsById} playersById={playersById} matchesById={matchesById} />
  </div>
)
