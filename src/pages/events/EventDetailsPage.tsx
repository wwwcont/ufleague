import { PageContainer } from '../../layouts/containers/PageContainer'
import { useNavigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useEventDetails } from '../../hooks/data/useEventDetails'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EntityReactions } from '../../components/ui/EntityReactions'
import { CommentsSection } from '../../components/comments'
import { useSession } from '../../app/providers/use-session'
import { useTeams } from '../../hooks/data/useTeams'
import { canManageEvent } from '../../domain/services/accessControl'
import { formatDateTimeMsk } from '../../lib/date-time'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'

export const EventDetailsPage = () => {
  const { eventId } = useParams()
  const { data: event, isLoading, error } = useEventDetails(eventId)
  const { session } = useSession()
  const { data: teams } = useTeams()
  const { eventsRepository } = useRepositories()
  const navigate = useNavigate()
  const [status, setStatus] = useState<string | null>(null)

  if (isLoading) return <PageContainer><LoadingState title="Загружаем событие" /></PageContainer>
  if (error) return <PageContainer><ErrorState title="Ошибка события" subtitle="Не удалось получить данные события" /></PageContainer>
  if (!event) return <PageContainer><EmptyState title="Событие не найдено" /></PageContainer>
  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const canManage = canManageEvent(session, teamMap, event)
  const actionError = (err: unknown) => {
    if (err instanceof ApiError) return `Ошибка API ${err.status}: ${err.message}`
    return err instanceof Error ? err.message : 'Операция не выполнена'
  }

  return (
    <PageContainer>
      <article className="rounded-2xl border border-borderSubtle bg-panelBg p-5 shadow-soft">
        <div className="mb-2 flex items-center justify-between text-xs text-textMuted">
          <span>{event.source}</span>
          <span>{formatDateTimeMsk(event.timestamp)}</span>
        </div>
        <h2 className="text-2xl font-bold text-textPrimary">{event.title}</h2>
        <p className="mt-2 text-sm text-textSecondary">{event.summary}</p>
        {event.imageUrl && <img src={event.imageUrl} alt={event.title} className="mt-4 h-44 w-full rounded-2xl object-cover" />}
        <p className="mt-4 text-base leading-relaxed text-textSecondary">{event.text}</p>
        {canManage && (
          <div className="mt-3 flex gap-2 text-xs">
            <button
              type="button"
              className="rounded-lg border border-borderSubtle px-3 py-1"
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
            >Редактировать событие</button>
            <button
              type="button"
              className="rounded-lg border border-borderSubtle px-3 py-1"
              onClick={async () => {
                if (!window.confirm('Удалить событие?')) return
                try {
                  await eventsRepository.deleteEvent?.(event.id)
                  navigate('/events')
                } catch (err) {
                  setStatus(actionError(err))
                }
              }}
            >Удалить событие</button>
          </div>
        )}
        {status && <p className="mt-2 text-xs text-textMuted">{status}</p>}
        <div className="mt-4">
          <EntityReactions entityKey={`event:${event.id}`} />
        </div>
      </article>
      <CommentsSection entityType="event" entityId={event.id} title="Комментарии к событию" />
    </PageContainer>
  )
}
