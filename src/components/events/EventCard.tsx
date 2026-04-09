import { Link } from 'react-router-dom'
import type { PublicEvent } from '../../domain/entities/types'

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
  <article className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-textMuted">
      <span className="rounded-md border border-borderSubtle px-1.5 py-0.5">{categoryLabel[event.category] ?? event.category}</span>
      <span>{event.timestamp}</span>
    </div>

    <Link to={`/events/${event.id}`} className="block">
      <h3 className="text-sm font-semibold text-textPrimary hover:text-accentYellow">{event.title}</h3>
      <p className="mt-1 text-xs text-textSecondary">{event.summary}</p>
    </Link>

    <p className="mt-2 text-xs text-textMuted">{event.source} · {event.authorName}</p>

    {showRoleActions && (
      <div className="mt-2 flex items-center gap-2 text-xs text-textMuted">
        <button type="button" className="rounded-lg border border-dashed border-borderStrong px-2 py-1">добавить событие</button>
        <button type="button" className="rounded-lg border border-dashed border-borderStrong px-2 py-1" disabled={!event.canEdit}>редактировать</button>
        <button type="button" className="rounded-lg border border-dashed border-borderStrong px-2 py-1" disabled={!event.canDelete}>удалить</button>
      </div>
    )}
  </article>
)
