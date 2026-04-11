import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicEvent } from '../../domain/entities/types'
import { EntityReactions } from '../ui/EntityReactions'
import { formatDateTimeMsk } from '../../lib/date-time'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'

const categoryLabel: Record<string, string> = {
  news: 'Новость',
  announcement: 'Анонс',
  report: 'Отчет',
  injury: 'Медицина',
  discipline: 'Дисциплина',
  tactical: 'Тактика',
}

interface EventCardProps {
  event: PublicEvent
  showRoleActions?: boolean
}

export const EventCard = ({ event, showRoleActions = true }: EventCardProps) => (
  <EventCardInner event={event} showRoleActions={showRoleActions} />
)

const EventCardInner = ({ event, showRoleActions }: EventCardProps) => {
  const { eventsRepository } = useRepositories()
  const [status, setStatus] = useState<string | null>(null)

  const actionError = (err: unknown) => {
    if (err instanceof ApiError) return `Ошибка API ${err.status}: ${err.message}`
    return err instanceof Error ? err.message : 'Операция не выполнена'
  }

  return (
    <article className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-textMuted">
      <span className="rounded-md border border-borderSubtle px-1.5 py-0.5">{categoryLabel[event.category] ?? event.category}</span>
      <span>{formatDateTimeMsk(event.timestamp)}</span>
    </div>

    <Link to={`/events/${event.id}`} className="block">
      <h3 className="text-sm font-semibold text-textPrimary hover:text-accentYellow">{event.title}</h3>
      <p className="mt-1 text-xs text-textSecondary">{event.summary}</p>
    </Link>

    <div className="mt-2 flex items-center justify-between gap-2">
      <p className="text-xs text-textMuted">{event.source} · {event.authorName}</p>
      <EntityReactions entityKey={`event:${event.id}`} compact />
    </div>

    {showRoleActions && (
      <div className="mt-2 flex items-center gap-2 text-xs text-textMuted">
        <button type="button" className="rounded-lg border border-dashed border-borderStrong px-2 py-1" disabled>добавить событие</button>
        <button
          type="button"
          className="rounded-lg border border-dashed border-borderStrong px-2 py-1"
          disabled={!event.canEdit}
          onClick={async () => {
            const nextTitle = window.prompt('Новое название события', event.title)
            if (!nextTitle) return
            try {
              await eventsRepository.updateEventForScope?.({
                eventId: event.id,
                scopeType: event.entityType,
                scopeId: event.entityId,
                title: nextTitle,
                body: event.text,
              })
              setStatus('Событие обновлено')
            } catch (err) {
              setStatus(actionError(err))
            }
          }}
        >редактировать</button>
        <button
          type="button"
          className="rounded-lg border border-dashed border-borderStrong px-2 py-1"
          disabled={!event.canDelete}
          onClick={async () => {
            if (!window.confirm('Удалить событие?')) return
            try {
              await eventsRepository.deleteEvent?.(event.id)
              setStatus('Событие удалено, обновите страницу.')
            } catch (err) {
              setStatus(actionError(err))
            }
          }}
        >удалить</button>
      </div>
    )}
    {status && <p className="mt-2 text-[11px] text-textMuted">{status}</p>}
  </article>
)
}
