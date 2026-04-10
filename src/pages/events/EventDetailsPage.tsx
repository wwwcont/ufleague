import { PageContainer } from '../../layouts/containers/PageContainer'
import { useParams } from 'react-router-dom'
import { useEventDetails } from '../../hooks/data/useEventDetails'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EntityReactions } from '../../components/ui/EntityReactions'
import { CommentsSection } from '../../components/comments'
import { useSession } from '../../app/providers/use-session'
import { useTeams } from '../../hooks/data/useTeams'
import { canManageEvent } from '../../domain/services/accessControl'

export const EventDetailsPage = () => {
  const { eventId } = useParams()
  const { data: event, isLoading, error } = useEventDetails(eventId)
  const { session } = useSession()
  const { data: teams } = useTeams()

  if (isLoading) return <PageContainer><LoadingState title="Загружаем событие" /></PageContainer>
  if (error) return <PageContainer><ErrorState title="Ошибка события" subtitle="Не удалось получить данные события" /></PageContainer>
  if (!event) return <PageContainer><EmptyState title="Событие не найдено" /></PageContainer>
  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const canManage = canManageEvent(session, teamMap, event)

  return (
    <PageContainer>
      <article className="rounded-2xl border border-borderSubtle bg-panelBg p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between text-xs text-textMuted">
          <span>{event.source}</span>
          <span>{event.timestamp}</span>
        </div>
        <h2 className="text-2xl font-bold text-textPrimary">{event.title}</h2>
        <p className="mt-2 text-sm text-textSecondary">{event.summary}</p>
        {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="mt-4 h-44 w-full rounded-2xl object-cover" />}
        <p className="mt-4 text-base leading-relaxed text-textSecondary">{event.text}</p>
        {canManage && (
          <div className="mt-3 flex gap-2 text-xs">
            <button type="button" className="rounded-lg border border-borderSubtle px-3 py-1">Редактировать событие</button>
            <button type="button" className="rounded-lg border border-borderSubtle px-3 py-1">Удалить событие</button>
          </div>
        )}
        <div className="mt-4">
          <EntityReactions entityKey={`event:${event.id}`} />
        </div>
      </article>
      <CommentsSection entityType="event" entityId={event.id} title="Комментарии к событию" />
    </PageContainer>
  )
}
