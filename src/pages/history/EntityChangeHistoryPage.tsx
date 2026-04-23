import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { isAdmin } from '../../domain/services/accessControl'
import { formatDateTimeMsk } from '../../lib/date-time'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'

type EntityType = 'team' | 'player'

type ChangeItem = {
  id: string
  action: string
  targetType: string
  targetId: string
  createdAt: string
  route: string
  metadata?: Record<string, unknown>
}

const fieldLabels: Record<string, string> = {
  name: 'Название',
  short_name: 'Короткое название',
  description: 'Описание',
  logo_url: 'Логотип',
  socials: 'Соцсети',
  full_name: 'ФИО',
  nickname: 'Псевдоним',
  avatar_url: 'Аватар',
  position: 'Позиция',
  shirt_number: 'Номер',
  team_id: 'Команда',
}

const stringify = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const changeLines = (metadata?: Record<string, unknown>) => {
  const changes = (metadata?.changes ?? {}) as Record<string, { from?: unknown; to?: unknown }>
  return Object.entries(changes).map(([field, value]) => {
    const label = fieldLabels[field] ?? field
    return `${label}: ${stringify(value?.from)} → ${stringify(value?.to)}`
  })
}

export const EntityChangeHistoryPage = () => {
  const { entityType, entityId } = useParams<{ entityType: EntityType; entityId: string }>()
  const { session } = useSession()
  const { cabinetRepository } = useRepositories()
  const { data: team } = useTeamDetails(entityType === 'team' ? entityId : undefined)
  const { data: player } = usePlayerDetails(entityType === 'player' ? entityId : undefined)
  const [items, setItems] = useState<ChangeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!entityType || !entityId || !cabinetRepository.getPageChangeHistory) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    void cabinetRepository.getPageChangeHistory()
      .then((rows) => {
        const filtered = rows.filter((row) => row.targetType === entityType && row.targetId === entityId)
        setItems(filtered)
      })
      .catch((reason) => setError((reason as Error).message))
      .finally(() => setLoading(false))
  }, [cabinetRepository, entityId, entityType])

  const title = useMemo(() => {
    if (entityType === 'team') return `История изменений команды: ${team?.name ?? `#${entityId ?? ''}`}`
    if (entityType === 'player') return `История изменений игрока: ${player?.displayName ?? `#${entityId ?? ''}`}`
    return 'История изменений'
  }, [entityId, entityType, player?.displayName, team?.name])

  const backRoute = entityType === 'team' ? `/teams/${entityId}` : `/players/${entityId}`

  if (!entityType || !entityId || !['team', 'player'].includes(entityType)) {
    return <Navigate to="/" replace />
  }

  if (!session.isAuthenticated || !isAdmin(session)) {
    return <Navigate to={backRoute} replace />
  }

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h1 className="text-lg font-semibold text-textPrimary">{title}</h1>
        <p className="mt-1 text-xs text-textMuted">Показываются записи аудита по этому профилю (если backend их сохранил).</p>
        <Link to={backRoute} className="mt-3 inline-flex text-sm text-accentYellow">← Назад к профилю</Link>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        {loading && <p className="text-sm text-textMuted">Загрузка истории…</p>}
        {error && <p className="text-sm text-red-300">Не удалось загрузить историю: {error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-sm text-textMuted">Записей пока нет. Вероятно, по этому типу действий backend ещё не пишет аудит.</p>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => {
              const actorName = String(item.metadata?.actor_name ?? 'Система')
              const lines = changeLines(item.metadata)
              return (
                <article key={item.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
                  <p className="text-sm font-semibold text-textPrimary">{item.action}</p>
                  <p className="mt-1 text-xs text-textMuted">{formatDateTimeMsk(item.createdAt)} · {actorName}</p>
                  {lines.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {lines.map((line) => <p key={line} className="text-xs text-textSecondary">{line}</p>)}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-textMuted">Подробности изменений не переданы.</p>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </PageContainer>
  )
}
