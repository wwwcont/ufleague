import { Link, useParams } from 'react-router-dom'
import { CalendarPlus, Timer } from 'lucide-react'
import { useState } from 'react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useEvents } from '../../hooks/data/useEvents'
import { EventFeedSection } from '../../components/events'
import { useSession } from '../../app/providers/use-session'
import { canCreateEvent, canManageMatch } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { EventEditor } from '../../components/events'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'
import { isSystemMatchFeedEvent } from '../../domain/services/eventFeedFilters'
import { useTeams } from '../../hooks/data/useTeams'
import type { EventContentBlock } from '../../domain/entities/types'

export const MatchEventsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: events, isLoading, error } = useEvents({ entityType: 'match', entityId: matchId })
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { eventsRepository, uploadsRepository } = useRepositories()

  const [eventTitle, setEventTitle] = useState('')
  const [eventSummary, setEventSummary] = useState('')
  const [eventBlocks, setEventBlocks] = useState<EventContentBlock[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const canManage = canManageMatch(session)
  const canCreate = canCreateEvent(session)
  const visibleEvents = (events ?? []).filter((event) => !isSystemMatchFeedEvent(event))
  const homeTeamName = match ? teams?.find((team) => team.id === match.homeTeamId)?.shortName ?? teams?.find((team) => team.id === match.homeTeamId)?.name ?? `Команда ${match.homeTeamId}` : null
  const awayTeamName = match ? teams?.find((team) => team.id === match.awayTeamId)?.shortName ?? teams?.find((team) => team.id === match.awayTeamId)?.name ?? `Команда ${match.awayTeamId}` : null

  const actionError = (cause: unknown) => {
    if (cause instanceof ApiError) {
      if (cause.status === 403) return 'Недостаточно прав (403).'
      return `Ошибка API ${cause.status}: ${cause.message}`
    }
    return cause instanceof Error ? cause.message : 'Не удалось выполнить действие'
  }

  if (!matchId) {
    return (
      <PageContainer>
        <SectionHeader title="События матча" action={<Link to="/matches" className="text-sm text-accentYellow">К матчам</Link>} />
        <p className="text-sm text-textMuted">Матч не найден.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <SectionHeader
        title={match ? `События: ${homeTeamName} vs ${awayTeamName}` : 'События матча'}
        action={<Link to={`/matches/${matchId}`} className="text-sm text-accentYellow">К матчу</Link>}
      />
      <p className="mt-[-10px] text-sm text-textMuted">Только события выбранного матча.</p>

      {canManage && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><CalendarPlus size={16} className="text-accentYellow" /> Добавить событие</h2>
          {!canCreate && <p className="mb-2 text-xs text-rose-300">Для вашего аккаунта сейчас запрещена публикация событий.</p>}
          {!createOpen ? (
            <button type="button" disabled={!canCreate} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-60" onClick={() => {
              setCreateOpen(true)
              setStatus(null)
            }}>
              <Timer size={12} /> Создать событие
            </button>
          ) : (
            <div className="space-y-2">
              <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Заголовок события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <textarea value={eventSummary} onChange={(event) => setEventSummary(event.target.value)} rows={2} placeholder="Короткое summary (необязательно)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <EventEditor
                blocks={eventBlocks}
                onChange={setEventBlocks}
                onImageUpload={async (blockId, file) => {
                  const next = [...eventBlocks]
                  const index = next.findIndex((item) => item.id === blockId)
                  if (index < 0) return
                  if (!file) {
                    next[index] = { ...next[index], imageUrl: '' }
                    setEventBlocks(next)
                    return
                  }
                  try {
                    const imageUrl = (await uploadsRepository.uploadImage(file)).url
                    next[index] = { ...next[index], imageUrl }
                    setEventBlocks(next)
                  } catch (cause) {
                    setStatus(actionError(cause))
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || !eventTitle.trim() || !canCreate}
                  className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-60"
                  onClick={async () => {
                    setPending(true)
                    setStatus('Сохраняем событие...')
                    try {
                      const normalizedBlocks = normalizeEventBlocks(eventBlocks, { text: '', imageUrl: undefined })
                      await eventsRepository.createEventForScope?.({
                        scopeType: 'match',
                        scopeId: matchId,
                        title: eventTitle.trim(),
                        summary: eventSummary.trim() || deriveSummaryFromBlocks(normalizedBlocks),
                        body: blocksToPlainText(normalizedBlocks) || eventSummary.trim(),
                        imageUrl: normalizedBlocks.find((item) => item.type === 'image')?.imageUrl,
                        contentBlocks: normalizedBlocks,
                      })
                      setStatus('Событие создано')
                      setEventTitle('')
                      setEventSummary('')
                      setEventBlocks([])
                      setCreateOpen(false)
                    } catch (cause) {
                      setStatus(actionError(cause))
                    } finally {
                      setPending(false)
                    }
                  }}
                >
                  <Timer size={12} /> Сохранить
                </button>
                <button type="button" disabled={pending} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-60" onClick={() => {
                  setCreateOpen(false)
                  setEventTitle('')
                  setEventSummary('')
                  setEventBlocks([])
                  setStatus(null)
                }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
          {status && <p className="mt-2 text-xs text-textMuted">{status}</p>}
        </section>
      )}

      <EventFeedSection
        title="Лента событий матча"
        layout="timeline"
        events={visibleEvents}
        notificationScopeKey={`events:match:${matchId}`}
        messageWhenEmpty={isLoading ? 'Загрузка событий...' : error ? 'Не удалось загрузить события матча.' : 'Событий для этого матча пока нет.'}
      />
    </PageContainer>
  )
}
