import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { EventFeedSection } from '../../components/events'
import { useEvents } from '../../hooks/data/useEvents'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { useSession } from '../../app/providers/use-session'
import { canManageTeam } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import type { EventContentBlock, PublicEvent } from '../../domain/entities/types'
import { EventEditor } from '../../components/events'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'

export const TeamEventsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { session } = useSession()
  const canManageCurrentTeam = canManageTeam(session, team)
  const { eventsRepository, uploadsRepository } = useRepositories()
  const { data } = useEvents(teamId ? { entityType: 'team', entityId: teamId } : undefined)
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [blocks, setBlocks] = useState<EventContentBlock[]>([])
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [createdLocal, setCreatedLocal] = useState<PublicEvent[]>([])

  const events = useMemo(() => [...createdLocal, ...(data ?? [])], [createdLocal, data])

  return (
    <PageContainer>
      <SectionHeader title={`Лента событий команды${team ? `: ${team.name}` : ''}`} action={teamId ? <Link to={`/teams/${teamId}`} className="text-sm text-accentYellow">К команде</Link> : undefined} />
      {canManageCurrentTeam && teamId && (
        <section className="mb-3 rounded-2xl border border-borderSubtle bg-panelBg p-4">
          {!createOpen ? (
            <button type="button" className="block w-full rounded-lg bg-accentYellow px-3 py-3 text-sm font-semibold text-app" onClick={() => {
              setCreateOpen(true)
              setStatus(null)
            }}>
              Создать событие
            </button>
          ) : (
            <div className="space-y-3">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={2} placeholder="Короткое summary (необязательно)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
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
                      const normalizedBlocks = normalizeEventBlocks(blocks, { text: '', imageUrl: undefined })
                      await eventsRepository.createEventForScope?.({
                        scopeType: 'team',
                        scopeId: teamId,
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
                        source: 'team',
                        authorName: session.user.displayName,
                        category: 'news',
                        entityType: 'team',
                        entityId: teamId,
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
                <button type="button" disabled={pending} onClick={() => {
                  setCreateOpen(false)
                  setTitle('')
                  setSummary('')
                  setBlocks([])
                  setStatus(null)
                }} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50">
                  Отмена
                </button>
              </div>
            </div>
          )}
          {status && <p className="mt-2 text-xs text-textMuted">{status}</p>}
        </section>
      )}
      <EventFeedSection title="События этой команды" layout="timeline" events={events} messageWhenEmpty="Событий пока нет." />
    </PageContainer>
  )
}
