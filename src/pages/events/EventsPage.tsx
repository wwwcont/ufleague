import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useEvents } from '../../hooks/data/useEvents'
import { EventEditor, EventFeedSection } from '../../components/events'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { useSession } from '../../app/providers/use-session'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { canManageTeam, isAdmin } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import type { EventContentBlock, PublicEvent } from '../../domain/entities/types'
import { notifyError, notifyInfo, notifySuccess, toRussianMessage } from '../../lib/notifications'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'

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
  const canCreateInScope = (teamId && canManageCurrentTeam) || canCreateGlobal
  const { eventsRepository, uploadsRepository } = useRepositories()

  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [blocks, setBlocks] = useState<EventContentBlock[]>([])
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
    if (message.toLowerCase().includes('не удалось') || message.toLowerCase().includes('ошиб')) {
      notifyError(message)
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

      {canCreateInScope ? (
        <section className="mb-3 rounded-2xl border border-borderSubtle bg-panelBg p-4">
          {!createOpen ? (
            <button
              type="button"
              className="block w-full rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app"
              onClick={() => {
                setCreateOpen(true)
                setStatus(null)
              }}
            >
              Создать событие
            </button>
          ) : (
            <div className="space-y-3">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} placeholder="Короткое описание (необязательно)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <EventEditor
                blocks={blocks}
                onChange={setBlocks}
                onImageUpload={async (blockId, file) => {
                  const next = [...blocks]
                  const index = next.findIndex((item) => item.id === blockId)
                  if (index < 0) return
                  if (!file) {
                    next[index] = { ...next[index], imageUrl: '' }
                    setBlocks(next)
                    return
                  }
                  try {
                    const imageUrl = (await uploadsRepository.uploadImage(file)).url
                    next[index] = { ...next[index], imageUrl }
                    setBlocks(next)
                  } catch (uploadError) {
                    setStatus((uploadError as Error).message)
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || !title.trim()}
                  onClick={async () => {
                    setPending(true)
                    setStatus('Публикуем событие...')
                    try {
                      const scopeType = (teamId ? 'team' : 'global') as 'team' | 'global'
                      const normalizedBlocks = normalizeEventBlocks(blocks, { text: '', imageUrl: undefined })
                      await eventsRepository.createEventForScope?.({
                        scopeType,
                        scopeId: scopeType === 'team' ? teamId : undefined,
                        title: title.trim(),
                        summary: summary.trim() || deriveSummaryFromBlocks(normalizedBlocks),
                        body: blocksToPlainText(normalizedBlocks) || summary.trim(),
                        imageUrl: normalizedBlocks.find((item) => item.type === 'image')?.imageUrl,
                        contentBlocks: normalizedBlocks,
                      })
                      setCreatedLocal((prev) => [{
                        id: `local_${Date.now()}`,
                        title: title.trim(),
                        summary: summary.trim() || deriveSummaryFromBlocks(normalizedBlocks),
                        text: blocksToPlainText(normalizedBlocks),
                        contentBlocks: normalizedBlocks,
                        timestamp: new Date().toISOString(),
                        source: scopeType,
                        authorName: session.user.displayName,
                        category: 'news',
                        entityType: scopeType,
                        entityId: scopeType === 'team' ? teamId : undefined,
                        imageUrl: normalizedBlocks.find((item) => item.type === 'image')?.imageUrl,
                        canEdit: true,
                        canDelete: true,
                      }, ...prev])
                      setTitle('')
                      setSummary('')
                      setBlocks([])
                      setCreateOpen(false)
                      setStatus('Событие создано')
                    } catch (createError) {
                      setStatus((createError as Error).message)
                    } finally {
                      setPending(false)
                    }
                  }}
                  className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setCreateOpen(false)
                    setTitle('')
                    setSummary('')
                    setBlocks([])
                    setStatus(null)
                  }}
                  className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
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
