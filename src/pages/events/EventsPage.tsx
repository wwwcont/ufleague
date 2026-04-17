import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useEvents } from '../../hooks/data/useEvents'
import { EventFeedSection } from '../../components/events'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useSession } from '../../app/providers/use-session'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { canManageTeam, isAdmin } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import type { PublicEvent } from '../../domain/entities/types'
import { notifyInfo, notifySuccess, toRussianMessage } from '../../lib/notifications'

export const EventsPage = () => {
  const [searchParams] = useSearchParams()
  const scope = searchParams.get('scope') ?? 'global'
  const scopeId = searchParams.get('id') ?? undefined
  const teamId = scope === 'team' ? scopeId : undefined
  const { data, isLoading, error } = useEvents(
    scope === 'all'
      ? undefined
      : scope === 'global'
        ? { entityType: 'global' }
        : { entityType: scope as 'team' | 'player' | 'match', entityId: scopeId },
  )
  const { session } = useSession()
  const { data: team } = useTeamDetails(teamId)
  const canManageCurrentTeam = canManageTeam(session, team)
  const canCreateGlobal = isAdmin(session) && scope === 'global'
  const { eventsRepository } = useRepositories()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [createdLocal, setCreatedLocal] = useState<PublicEvent[]>([])

  useEffect(() => {
    if (!status) return
    const message = toRussianMessage(status)
    if (message === 'Публикуем событие...') {
      notifyInfo(message, 1800)
      return
    }
    notifySuccess(message)
  }, [status])
  const events = useMemo(
    () => [...createdLocal, ...((data ?? []).map((event) => (teamId && canManageCurrentTeam ? { ...event, canEdit: true, canDelete: true } : event)))],
    [canManageCurrentTeam, createdLocal, data, teamId],
  )
  const pageTitle = scope === 'all'
    ? 'Все события'
    : teamId
      ? `События команды${team ? `: ${team.name}` : ''}`
      : 'События турнира'

  return (
    <PageContainer>
      <SectionHeader title={pageTitle} action={<Link to="/" className="text-sm text-accentYellow">На главную</Link>} />
      {(teamId && canManageCurrentTeam) || canCreateGlobal ? (
        <section className="mb-3 rounded-2xl border border-borderSubtle bg-panelBg p-4">
          <button
            type="button"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={async () => {
              setPending(true)
              setStatus('Публикуем событие...')
              try {
                const scopeType = (teamId ? 'team' : 'global') as 'team' | 'global'
                await eventsRepository.createEventForScope?.({
                  scopeType,
                  scopeId: scopeType === 'team' ? teamId : undefined,
                  title: title.trim(),
                  body: body.trim(),
                })
                setCreatedLocal((prev) => [{
                  id: `local_${Date.now()}`,
                  title: title.trim(),
                  summary: body.trim().slice(0, 140),
                  text: body.trim(),
                  contentBlocks: [],
                  timestamp: new Date().toISOString(),
                  source: scopeType,
                  authorName: session.user.displayName,
                  category: 'news',
                  entityType: scopeType,
                  entityId: scopeType === 'team' ? teamId : undefined,
                  canEdit: true,
                  canDelete: true,
                }, ...prev])
                setTitle('')
                setBody('')
                setStatus('Событие создано')
              } catch (createError) {
                setStatus((createError as Error).message)
              } finally {
                setPending(false)
              }
            }}
            className="mb-3 block w-full rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50"
          >
            Создать событие
          </button>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок события" className="mb-2 w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Текст события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
          {status && <p className="mt-2 text-xs text-textMuted">{status}</p>}
        </section>
      ) : null}
      {isLoading && <LoadingState title="Загружаем ленту событий" />}
      {error && <ErrorState title="Ошибка ленты" subtitle="Не удалось загрузить события" />}
      {!isLoading && !error && (
        <EventFeedSection
          title={teamId ? 'Лента событий команды' : scope === 'all' ? 'Общая лента событий' : 'Лента главных событий'}
          layout="timeline"
          events={events}
          notificationScopeKey={`events:${scope}:${scopeId ?? 'all'}`}
          messageWhenEmpty="Событий пока нет."
        />
      )}
    </PageContainer>
  )
}
