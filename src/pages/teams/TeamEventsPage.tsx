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
import type { PublicEvent } from '../../domain/entities/types'

export const TeamEventsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { session } = useSession()
  const canManageCurrentTeam = canManageTeam(session, team)
  const { eventsRepository } = useRepositories()
  const { data } = useEvents(teamId ? { entityType: 'team', entityId: teamId } : undefined)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [createdLocal, setCreatedLocal] = useState<PublicEvent[]>([])

  const events = useMemo(() => [...createdLocal, ...(data ?? [])], [createdLocal, data])

  return (
    <PageContainer>
      <SectionHeader title={`Лента событий команды${team ? `: ${team.name}` : ''}`} action={teamId ? <Link to={`/teams/${teamId}`} className="text-sm text-accentYellow">К команде</Link> : undefined} />
      {canManageCurrentTeam && teamId && (
        <section className="mb-3 rounded-2xl border border-borderSubtle bg-panelBg p-4">
          <button
            type="button"
            disabled={pending || !title.trim() || !body.trim()}
            onClick={async () => {
              setPending(true)
              setStatus('Публикуем событие...')
              try {
                await eventsRepository.createEventForScope?.({ scopeType: 'team', scopeId: teamId, title: title.trim(), body: body.trim() })
                setCreatedLocal((prev) => [{
                  id: `local_${Date.now()}`,
                  title: title.trim(),
                  summary: body.trim().slice(0, 140),
                  text: body.trim(),
                  contentBlocks: [],
                  timestamp: new Date().toISOString(),
                  source: 'team',
                  authorName: session.user.displayName,
                  category: 'news',
                  entityType: 'team',
                  entityId: teamId,
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
            className="mb-3 block w-full rounded-lg bg-accentYellow px-3 py-3 text-sm font-semibold text-app disabled:opacity-50"
          >
            Создать событие
          </button>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Заголовок события" className="mb-2 w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
          <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Текст события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
          {status && <p className="mt-2 text-xs text-textMuted">{status}</p>}
        </section>
      )}
      <EventFeedSection title="События этой команды" layout="timeline" events={events} messageWhenEmpty="Событий пока нет." />
    </PageContainer>
  )
}
