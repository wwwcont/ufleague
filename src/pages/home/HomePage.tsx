import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { useEvents } from '../../hooks/data/useEvents'
import { formatTimeOnlyMsk } from '../../lib/date-time'
import { useSession } from '../../app/providers/use-session'
import { isAdmin } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import { EventEditor } from '../../components/events'
import type { EventContentBlock, PublicEvent } from '../../domain/entities/types'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'

export const HomePage = () => {
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const { data: events, isLoading: eventsLoading } = useEvents({ entityType: 'global', limit: 3 })
  const { session } = useSession()
  const { eventsRepository, uploadsRepository } = useRepositories()
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [blocks, setBlocks] = useState<EventContentBlock[]>([])
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [createdLocal, setCreatedLocal] = useState<PublicEvent[]>([])

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const liveAndUpcoming = (matchList ?? []).filter((m) => m.status === 'live' || m.status === 'scheduled').slice(0, 5)
  const visibleEvents = useMemo(() => [...createdLocal, ...(events ?? [])], [createdLocal, events])
  const canCreateGlobalEvent = isAdmin(session)

  return (
    <PageContainer>
      <Link to="/search" state={{ fromHome: true }} viewTransition className="home-search-trigger flex items-center gap-2 rounded-2xl border border-borderSubtle bg-panelBg px-4 py-2.5 text-sm text-textSecondary shadow-soft transition hover:-translate-y-0.5 hover:text-textPrimary" aria-label="Открыть поиск">
        <Search size={15} className="text-accentYellow" />
        <span className="text-textMuted/70">Поиск по турниру</span>
      </Link>

      <SectionHeader title="Главные события" action={<Link to="/events" className="text-sm text-accentYellow">ВСЕ</Link>} />
      {canCreateGlobalEvent && (
        <section className="mb-2 rounded-2xl border border-borderSubtle bg-panelBg p-3">
          {!createOpen ? (
            <button type="button" className="w-full rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={() => setCreateOpen(true)}>
              Создать событие
            </button>
          ) : (
            <div className="space-y-2">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} placeholder="Короткое описание" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
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
                  const imageUrl = (await uploadsRepository.uploadImage(file)).url
                  next[index] = { ...next[index], imageUrl }
                  setBlocks(next)
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending || !title.trim()}
                  className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50"
                  onClick={async () => {
                    setPending(true)
                    setStatus('Публикуем событие...')
                    try {
                      const normalizedBlocks = normalizeEventBlocks(blocks, { text: '', imageUrl: undefined })
                      await eventsRepository.createEventForScope?.({
                        scopeType: 'global',
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
                        source: 'global',
                        authorName: session.user.displayName,
                        category: 'news',
                        entityType: 'global',
                        canEdit: true,
                        canDelete: true,
                      }, ...prev])
                      setCreateOpen(false)
                      setTitle('')
                      setSummary('')
                      setBlocks([])
                      setStatus('Событие создано')
                    } catch (error) {
                      setStatus(error instanceof Error ? error.message : 'Не удалось создать событие')
                    } finally {
                      setPending(false)
                    }
                  }}
                >
                  Сохранить
                </button>
                <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={() => {
                  setCreateOpen(false)
                  setTitle('')
                  setSummary('')
                  setBlocks([])
                  setStatus(null)
                }}>
                  Отмена
                </button>
              </div>
              {status && <p className="text-xs text-textMuted">{status}</p>}
            </div>
          )}
        </section>
      )}
      <div className="space-y-1.5">
        {eventsLoading && <p className="text-sm text-textMuted">Загрузка событий...</p>}
        {!eventsLoading && visibleEvents.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="flex items-center gap-3 rounded-xl border border-borderSubtle bg-panelBg px-3 py-2 transition hover:border-borderStrong">
            <span className="shrink-0 rounded-md border border-borderSubtle bg-mutedBg px-2 py-1 text-[11px] tabular-nums text-textMuted">{formatTimeOnlyMsk(event.timestamp)}</span>
            <span className="truncate text-sm text-textPrimary">{event.title}</span>
          </Link>
        ))}
      </div>

      <SectionHeader title="LIVE / Предстоящие" action={<Link to="/matches" className="text-sm text-accentYellow">ВСЕ</Link>} />
      {liveAndUpcoming.length === 0 || !teams ? (
        <EmptyState title="Матчи не найдены" />
      ) : (
        <div className="space-y-2">
          {liveAndUpcoming.map((match) => (
            <MatchCard key={match.id} match={match} home={teamMap[match.homeTeamId]} away={teamMap[match.awayTeamId]} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
