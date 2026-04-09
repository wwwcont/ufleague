import { PageContainer } from '../../layouts/containers/PageContainer'
import { useParams } from 'react-router-dom'
import { useEventDetails } from '../../hooks/data/useEventDetails'
import { EmptyState } from '../../components/ui/EmptyState'

export const EventDetailsPage = () => {
  const { eventId } = useParams()
  const { data: event } = useEventDetails(eventId)

  if (!event) return <PageContainer><EmptyState title="Событие не найдено" /></PageContainer>

  return (
    <PageContainer>
      <article className="matte-panel p-5">
        <h2 className="text-2xl font-bold">{event.title}</h2>
        <p className="mt-2 text-sm text-textMuted">{event.date} • {event.author}</p>
        {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="mt-4 h-44 w-full rounded-2xl object-cover" />}
        <p className="mt-4 text-base leading-relaxed text-textSecondary">{event.text}</p>
      </article>
    </PageContainer>
  )
}
