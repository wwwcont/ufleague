import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublicEvent } from '../../domain/entities/types'
import { EntityReactions } from '../ui/EntityReactions'
import { formatDateTimeMsk } from '../../lib/date-time'
import { MediaPreviewModal } from '../ui/MediaPreviewModal'

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
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const coverImageUrl = useMemo(
    () => event.imageUrl ?? event.contentBlocks?.find((block) => block.type === 'image')?.imageUrl ?? null,
    [event.contentBlocks, event.imageUrl],
  )

  return (
    <>
      <article className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-textMuted">
          <span className="rounded-md border border-borderSubtle px-1.5 py-0.5">{categoryLabel[event.category] ?? event.category}</span>
          <span>{formatDateTimeMsk(event.timestamp)}</span>
        </div>

        {coverImageUrl && (
          <button type="button" className="mb-2 block w-full overflow-hidden rounded-xl" onClick={() => setPreviewImage(coverImageUrl)}>
            <img src={coverImageUrl} alt={event.title} className="h-40 w-full rounded-xl object-cover transition hover:opacity-95 sm:h-44" />
          </button>
        )}

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
            {event.canEdit && <Link to={`/events/${event.id}`} className="rounded-lg border border-dashed border-borderStrong px-2 py-1">редактировать</Link>}
            {event.canDelete && <Link to={`/events/${event.id}`} className="rounded-lg border border-dashed border-borderStrong px-2 py-1">удалить</Link>}
          </div>
        )}
      </article>
      <MediaPreviewModal isOpen={Boolean(previewImage)} imageUrl={previewImage} alt={event.title} onClose={() => setPreviewImage(null)} />
    </>
  )
}
