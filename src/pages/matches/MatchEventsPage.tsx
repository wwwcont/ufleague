import { Link, useParams } from 'react-router-dom'
import { CalendarPlus, Timer } from 'lucide-react'
import { useState } from 'react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useEvents } from '../../hooks/data/useEvents'
import { EventFeedSection } from '../../components/events'
import { useSession } from '../../app/providers/use-session'
import { canManageMatch } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'

export const MatchEventsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: events, isLoading, error } = useEvents({ entityType: 'match', entityId: matchId })
  const { session } = useSession()
  const { eventsRepository } = useRepositories()

  const [eventTitle, setEventTitle] = useState('')
  const [eventBody, setEventBody] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const canManage = canManageMatch(session)

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
        title={match ? `События: ${match.homeTeamId} vs ${match.awayTeamId}` : 'События матча'}
        action={<Link to={`/matches/${matchId}`} className="text-sm text-accentYellow">К матчу</Link>}
      />
      <p className="mt-[-10px] text-sm text-textMuted">Только события выбранного матча.</p>

      {canManage && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><CalendarPlus size={16} className="text-accentYellow" /> Добавить событие</h2>
          <div className="space-y-2">
            <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} placeholder="Заголовок события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
            <textarea value={eventBody} onChange={(event) => setEventBody(event.target.value)} rows={3} placeholder="Описание события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
            <button
              type="button"
              disabled={pending || !eventTitle.trim() || !eventBody.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-60"
              onClick={async () => {
                setPending(true)
                setStatus('Сохраняем событие...')
                try {
                  await eventsRepository.createEventForScope?.({
                    scopeType: 'match',
                    scopeId: matchId,
                    title: eventTitle.trim(),
                    summary: eventBody.trim().slice(0, 140),
                    body: eventBody.trim(),
                  })
                  setStatus('Событие создано')
                  setEventTitle('')
                  setEventBody('')
                } catch (cause) {
                  setStatus(actionError(cause))
                } finally {
                  setPending(false)
                }
              }}
            >
              <Timer size={12} /> Добавить событие
            </button>
            {status && <p className="text-xs text-textMuted">{status}</p>}
          </div>
        </section>
      )}

      <EventFeedSection
        title="Лента событий матча"
        layout="timeline"
        events={events ?? []}
        messageWhenEmpty={isLoading ? 'Загрузка событий...' : error ? 'Не удалось загрузить события матча.' : 'Событий для этого матча пока нет.'}
      />
    </PageContainer>
  )
}
