import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { isAdmin } from '../../domain/services/accessControl'
import { formatDateTimeMsk } from '../../lib/date-time'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { useQueryState } from '../../hooks/data/useQueryState'

type EntityType = 'team' | 'player' | 'match' | 'user'

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
  visible: 'Видимость',
  permissions: 'Права',
  roles: 'Роли',
  restrictions: 'Ограничения',
  delta: 'Изменение',
  field: 'Поле',
  setting_key: 'Ключ настройки',
  value: 'Значение',
}

const actionLabels: Record<string, string> = {
  'team.update': 'Обновление команды',
  'player.update': 'Обновление игрока',
  'match.update': 'Обновление матча',
  'user.profile_update': 'Обновление профиля',
  'admin.user_profile_update': 'Обновление профиля (админ)',
  'captain.invite': 'Приглашение в команду',
  'captain.team_socials': 'Обновление соцсетей команды',
  'captain.roster_visibility': 'Изменение видимости в составе',
  'admin.assign_player_role': 'Назначение роли игрока',
  'admin.assign_captain_role': 'Назначение роли капитана',
  'admin.revoke_captain_role': 'Снятие роли капитана',
  'admin.remove_player_from_user': 'Отвязка игрока от пользователя',
  'superadmin.assign_roles': 'Назначение ролей',
  'superadmin.assign_permissions': 'Назначение прав',
  'superadmin.assign_restrictions': 'Назначение ограничений',
  'admin.manual_stats_adjustment.create': 'Ручная корректировка статистики',
  'admin.manual_stats_adjustment.delete': 'Удаление ручной корректировки',
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

const metadataLines = (metadata?: Record<string, unknown>) => {
  if (!metadata) return []
  const skipKeys = new Set(['changes', 'actor_name', 'actor_username', 'target_label'])
  return Object.entries(metadata)
    .filter(([key, value]) => !skipKeys.has(key) && value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${fieldLabels[key] ?? key}: ${stringify(value)}`)
}

export const EntityChangeHistoryPage = () => {
  const { entityType, entityId } = useParams<{ entityType: EntityType; entityId: string }>()
  const { session } = useSession()
  const { cabinetRepository, usersRepository } = useRepositories()
  const { data: team } = useTeamDetails(entityType === 'team' ? entityId : undefined)
  const { data: player } = usePlayerDetails(entityType === 'player' ? entityId : undefined)
  const userLoader = useCallback(() => {
    if (entityType !== 'user' || !entityId) return Promise.resolve(null)
    return usersRepository.getUserCard(entityId)
  }, [entityId, entityType, usersRepository])
  const { data: user } = useQueryState(userLoader, () => false)
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

  const targetFromAudit = String(items[0]?.metadata?.target_label ?? '').trim()
  let title = 'История изменений'
  if (entityType === 'team') title = `История изменений команды: ${team?.name ?? `#${entityId ?? ''}`}`
  if (entityType === 'player') title = `История изменений игрока: ${player?.displayName ?? `#${entityId ?? ''}`}`
  if (entityType === 'match') title = `История изменений матча: ${targetFromAudit || `#${entityId ?? ''}`}`
  if (entityType === 'user') title = `История изменений пользователя: ${user?.telegramUsername ? `@${user.telegramUsername}` : (user?.displayName ?? `#${entityId ?? ''}`)}`

  const backRoute = entityType === 'team'
    ? `/teams/${entityId}`
    : entityType === 'player'
      ? `/players/${entityId}`
      : entityType === 'match'
        ? `/matches/${entityId}`
        : `/users/${entityId}`

  if (!entityType || !entityId || !['team', 'player', 'match', 'user'].includes(entityType)) {
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
              const actorUsername = String(item.metadata?.actor_username ?? '')
              const targetLabel = String(item.metadata?.target_label ?? '').trim()
              const lines = changeLines(item.metadata)
              const details = metadataLines(item.metadata)
              return (
                <article key={item.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
                  <p className="text-sm font-semibold text-textPrimary">{actionLabels[item.action] ?? item.action}</p>
                  <p className="mt-1 text-xs text-textMuted">
                    {formatDateTimeMsk(item.createdAt)} · {actorName}{actorUsername ? ` (@${actorUsername})` : ''}
                  </p>
                  {targetLabel && <p className="mt-1 text-xs text-textSecondary">Объект: {targetLabel}</p>}
                  {lines.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {lines.map((line) => <p key={line} className="text-xs text-textSecondary">{line}</p>)}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-textMuted">Подробности изменений в формате "до/после" не переданы.</p>
                  )}
                  {details.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {details.map((line) => <p key={line} className="text-xs text-textSecondary">{line}</p>)}
                    </div>
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
