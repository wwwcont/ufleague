import { PageContainer } from '../../layouts/containers/PageContainer'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useEventDetails } from '../../hooks/data/useEventDetails'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { EntityReactions } from '../../components/ui/EntityReactions'
import { CommentsSection } from '../../components/comments'
import { useSession } from '../../app/providers/use-session'
import { useTeams } from '../../hooks/data/useTeams'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useMatches } from '../../hooks/data/useMatches'
import { canManageEvent } from '../../domain/services/accessControl'
import { formatDateTimeMsk } from '../../lib/date-time'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { EditableSection, EditableSectionHeader, EditableTextField, EditableTextareaField, SectionActionBar } from '../../components/ui/editable'
import { EventContentRenderer, EventEditor } from '../../components/events'
import type { EventContentBlock } from '../../domain/entities/types'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'
import { resolveEventSourceLabel } from '../../domain/services/eventSourceLabel'

export const EventDetailsPage = () => {
  const { eventId } = useParams()
  const { data: event, isLoading, error } = useEventDetails(eventId)
  const { session } = useSession()
  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { data: matches } = useMatches()
  const { eventsRepository, uploadsRepository, matchesRepository } = useRepositories()
  const navigate = useNavigate()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [editableTitle, setEditableTitle] = useState('')
  const [editableSummary, setEditableSummary] = useState('')
  const [contentBlocks, setContentBlocks] = useState<EventContentBlock[]>([])

  const syncDraft = () => {
    if (!event) return
    setEditableTitle(event.title)
    setEditableSummary(event.summary)
    setContentBlocks(normalizeEventBlocks(event.contentBlocks, { text: event.text, imageUrl: event.imageUrl }))
  }

  useEffect(() => {
    if (!event) return
    syncDraft()
    setIsEditing(false)
    setIsSaving(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id])

  if (isLoading) return <PageContainer><LoadingState title="Загружаем событие" /></PageContainer>
  if (error) return <PageContainer><ErrorState title="Ошибка события" subtitle="Не удалось получить данные события" /></PageContainer>
  if (!event) return <PageContainer><EmptyState title="Событие не найдено" /></PageContainer>

  const teamMap = Object.fromEntries((teams ?? []).map((team) => [team.id, team]))
  const playerMap = Object.fromEntries((players ?? []).map((player) => [player.id, player]))
  const matchMap = Object.fromEntries((matches ?? []).map((match) => [match.id, match]))
  const canManage = canManageEvent(session, teamMap, event, playerMap)
  const sourceLabel = resolveEventSourceLabel({ event, teamsById: teamMap, playersById: playerMap, matchesById: matchMap })

  const actionError = (err: unknown) => {
    if (err instanceof ApiError) return `Ошибка API ${err.status}: ${err.message}`
    return err instanceof Error ? err.message : 'Операция не выполнена'
  }

  return (
    <PageContainer>
      <EditableSection isEditing={isEditing} className="p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-textMuted">
          <span>{sourceLabel}</span>
          <span>{formatDateTimeMsk(event.timestamp)}</span>
        </div>

        <EditableSectionHeader
          title={isEditing ? editableTitle || 'Без названия' : event.title}
          subtitle="Материал события"
          canEdit={canManage}
          isEditing={isEditing}
          onStartEdit={() => {
            syncDraft()
            setStatus(null)
            setStatusTone('idle')
            setIsEditing(true)
          }}
          onCancelEdit={() => {
            syncDraft()
            setStatus(null)
            setStatusTone('idle')
            setIsEditing(false)
          }}
          actions={canManage ? (
            <button
              type="button"
              className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textSecondary"
              onClick={async () => {
                if (!window.confirm('Удалить событие?')) return
                try {
                  await eventsRepository.deleteEvent?.(event.id)
                  if (event.entityType === 'match' && event.entityId) {
                    const targetMatch = matches?.find((item) => item.id === event.entityId)
                    if (targetMatch) {
                      const nextMatchEvents = targetMatch.events.filter((item) => item.linkedEventId !== event.id)
                      if (nextMatchEvents.length !== targetMatch.events.length) {
                        await matchesRepository.updateMatch?.(targetMatch.id, {
                          homeScore: targetMatch.score.home,
                          awayScore: targetMatch.score.away,
                          matchEvents: nextMatchEvents,
                        })
                      }
                    }
                  }
                  navigate('/events')
                } catch (err) {
                  setStatus(actionError(err))
                  setStatusTone('error')
                }
              }}
            >
              Удалить
            </button>
          ) : undefined}
        />

        {isEditing ? (
          <div className="space-y-3">
            <EditableTextField label="Заголовок" value={editableTitle} onChange={setEditableTitle} isEditing placeholder="Название события" />
            <EditableTextareaField label="Summary" value={editableSummary} onChange={setEditableSummary} isEditing rows={2} placeholder="Короткая выжимка события" />
            <EventEditor
              blocks={contentBlocks}
              onChange={setContentBlocks}
              onImageUpload={async (blockId, file) => {
                const next = [...contentBlocks]
                const index = next.findIndex((item) => item.id === blockId)
                if (index < 0) return
                if (!file) {
                  next[index] = { ...next[index], imageUrl: '' }
                  setContentBlocks(next)
                  return
                }
                try {
                  const imageUrl = (await uploadsRepository.uploadImage(file)).url
                  next[index] = { ...next[index], imageUrl }
                  setContentBlocks(next)
                } catch (err) {
                  setStatus(actionError(err))
                  setStatusTone('error')
                }
              }}
            />
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-textSecondary">{event.summary}</p>
            <EventContentRenderer blocks={event.contentBlocks} />
          </>
        )}

        <SectionActionBar
          isEditing={isEditing}
          isPending={isSaving}
          statusMessage={status}
          statusTone={statusTone}
          onCancel={() => {
            syncDraft()
            setStatus(null)
            setStatusTone('idle')
            setIsEditing(false)
          }}
          onSave={async () => {
            setIsSaving(true)
            setStatus('Сохраняем событие...')
            setStatusTone('idle')
            try {
              const blocks = normalizeEventBlocks(contentBlocks, { text: '', imageUrl: undefined })
              await eventsRepository.updateEventForScope?.({
                eventId: event.id,
                scopeType: event.entityType,
                scopeId: event.entityId,
                title: editableTitle || event.title,
                summary: editableSummary || deriveSummaryFromBlocks(blocks),
                body: blocksToPlainText(blocks) || event.text,
                imageUrl: blocks.find((item) => item.type === 'image')?.imageUrl,
                contentBlocks: blocks,
              })
              setStatus('Событие обновлено')
              setStatusTone('success')
              setIsEditing(false)
            } catch (err) {
              setStatus(actionError(err))
              setStatusTone('error')
            } finally {
              setIsSaving(false)
            }
          }}
        />

        <div className="mt-4">
          <EntityReactions entityKey={`event:${event.id}`} />
        </div>
      </EditableSection>
      <CommentsSection entityType="event" entityId={event.id} title="Комментарии к событию" />
    </PageContainer>
  )
}
