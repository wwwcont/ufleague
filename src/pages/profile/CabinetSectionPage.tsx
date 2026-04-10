import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Plus, Shield, UserCog } from 'lucide-react'
import type { UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'

const roleRank: Record<UserRole, number> = {
  guest: 0,
  player: 1,
  captain: 2,
  admin: 3,
  superadmin: 4,
}

interface SectionBlock {
  title: string
  kind: 'form' | 'table' | 'actions' | 'insights'
  fields: string[]
}

interface SectionMeta {
  title: string
  description: string
  minRole: UserRole
  blocks: SectionBlock[]
  primaryAction?: string
}

const sectionMeta: Record<string, SectionMeta> = {
  profile: {
    title: 'Профиль аккаунта',
    description: 'Публичная карточка, handle и настройки отображения.',
    minRole: 'guest',
    primaryAction: 'Сохранить профиль',
    blocks: [
      { title: 'Основные данные', kind: 'form', fields: ['display name', 'telegram handle', 'о себе'] },
      { title: 'Приватность', kind: 'actions', fields: ['публичный профиль', 'видимость активности', 'уведомления'] },
    ],
  },
  activity: {
    title: 'Мои комментарии',
    description: 'История комментариев и статусы модерации.',
    minRole: 'guest',
    blocks: [
      { title: 'Лента активности', kind: 'table', fields: ['дата', 'сущность', 'текст', 'статус'] },
      { title: 'Быстрые фильтры', kind: 'actions', fields: ['только ответы', 'удаленные', 'нужны правки'] },
    ],
  },
  reactions: {
    title: 'Мои реакции',
    description: 'Сводка ваших лайков/дизлайков и пересечений с контентом.',
    minRole: 'guest',
    blocks: [
      { title: 'Последние реакции', kind: 'table', fields: ['дата', 'тип', 'сущность', 'ссылка'] },
      { title: 'Аналитика', kind: 'insights', fields: ['всего реакций', 'топ сущностей', 'динамика за неделю'] },
    ],
  },
  permissions: {
    title: 'Доступные действия',
    description: 'Что доступно текущей роли в пользовательском контуре.',
    minRole: 'guest',
    blocks: [
      { title: 'Активные capability', kind: 'table', fields: ['permission', 'scope', 'source'] },
      { title: 'Запросы на расширение доступа', kind: 'actions', fields: ['создать запрос', 'статус запроса'] },
    ],
  },
  'player-profile': {
    title: 'Профиль игрока',
    description: 'Карточка игрока, позиция, номер, короткое био.',
    minRole: 'player',
    primaryAction: 'Сохранить карточку игрока',
    blocks: [
      { title: 'Игровые данные', kind: 'form', fields: ['позиция', 'номер', 'краткое био'] },
      { title: 'Связь с командой', kind: 'insights', fields: ['team id', 'текущий статус', 'роль'] },
    ],
  },
  'player-media': {
    title: 'Медиа и соцсети',
    description: 'Фото профиля и ссылки на внешние профили игрока.',
    minRole: 'player',
    blocks: [
      { title: 'Медиа assets', kind: 'form', fields: ['avatar', 'cover', 'галерея'] },
      { title: 'Соцсети', kind: 'table', fields: ['platform', 'url', 'visibility'] },
    ],
  },
  team: {
    title: 'Моя команда',
    description: 'Команда пользователя, роль и командный контекст.',
    minRole: 'player',
    blocks: [
      { title: 'Team snapshot', kind: 'insights', fields: ['название', 'капитан', 'состав', 'последние события'] },
    ],
  },
  roster: {
    title: 'Состав команды',
    description: 'Captain panel для управления видимостью и статусом ростера.',
    minRole: 'captain',
    primaryAction: 'Применить изменения состава',
    blocks: [
      { title: 'Roster table', kind: 'table', fields: ['игрок', 'роль', 'visibility', 'действия'] },
      { title: 'Backend hooks', kind: 'actions', fields: ['captain roster visibility', 'batch apply', 'audit note'] },
    ],
  },
  invites: {
    title: 'Приглашения',
    description: 'Captain invite workflow и статусы отправки.',
    minRole: 'captain',
    primaryAction: 'Отправить приглашение',
    blocks: [
      { title: 'Новый invite', kind: 'form', fields: ['username', 'роль', 'комментарий'] },
      { title: 'Журнал приглашений', kind: 'table', fields: ['пользователь', 'статус', 'дата', 'действия'] },
    ],
  },
  'team-socials': {
    title: 'Соцсети команды',
    description: 'Управление публичными ссылками и контактами команды.',
    minRole: 'captain',
    blocks: [
      { title: 'Social links', kind: 'form', fields: ['telegram', 'instagram', 'youtube', 'website'] },
      { title: 'Preview', kind: 'insights', fields: ['карточка команды', 'валидность ссылок', 'published status'] },
    ],
  },
  'team-events': {
    title: 'События команды',
    description: 'Создание и редактирование новостей/ивентов команды.',
    minRole: 'captain',
    blocks: [
      { title: 'Event composer', kind: 'form', fields: ['title', 'summary', 'scope', 'publish'] },
      { title: 'Список публикаций', kind: 'table', fields: ['заголовок', 'статус', 'дата', 'действия'] },
    ],
  },
  tournament: {
    title: 'Быстрые действия турнира',
    description: 'Admin-операции по командам, игрокам и матчам.',
    minRole: 'admin',
    blocks: [
      { title: 'Quick create', kind: 'actions', fields: ['создать команду', 'создать игрока', 'создать матч'] },
      { title: 'Operations queue', kind: 'table', fields: ['тип', 'инициатор', 'объект', 'статус'] },
    ],
  },
  moderation: {
    title: 'Модерация',
    description: 'Панель модератора по комментариям и событиям.',
    minRole: 'admin',
    blocks: [
      { title: 'Review queue', kind: 'table', fields: ['тип', 'author', 'reason', 'action'] },
      { title: 'Модерационные действия', kind: 'actions', fields: ['delete', 'warn', 'escalate'] },
    ],
  },
  'comment-blocks': {
    title: 'Блокировки комментариев',
    description: 'Управление comment blocks и ограничениями пользователей.',
    minRole: 'admin',
    blocks: [
      { title: 'Block user', kind: 'form', fields: ['user id', 'restriction', 'until', 'reason'] },
      { title: 'История ограничений', kind: 'table', fields: ['user', 'restriction', 'period', 'actor'] },
    ],
  },
  roles: {
    title: 'Управление ролями',
    description: 'Superadmin панель назначения ролей.',
    minRole: 'superadmin',
    blocks: [
      { title: 'Role assignment', kind: 'form', fields: ['user id', 'roles[]', 'audit note'] },
      { title: 'Последние изменения', kind: 'table', fields: ['user', 'before', 'after', 'actor'] },
    ],
  },
  rbac: {
    title: 'Управление правами',
    description: 'Назначение granular permissions по пользователям.',
    minRole: 'superadmin',
    blocks: [
      { title: 'Permission editor', kind: 'table', fields: ['permission', 'enabled', 'source'] },
      { title: 'Apply permissions', kind: 'actions', fields: ['assign permissions', 'dry-run', 'apply'] },
    ],
  },
  restrictions: {
    title: 'Ограничения',
    description: 'Управление restrictions и safety policy.',
    minRole: 'superadmin',
    blocks: [
      { title: 'Restriction builder', kind: 'form', fields: ['user', 'type', 'scope', 'expires_at'] },
      { title: 'Restriction registry', kind: 'table', fields: ['user', 'restriction', 'active', 'updated_at'] },
    ],
  },
  settings: {
    title: 'Глобальные настройки',
    description: 'Platform settings и feature toggles.',
    minRole: 'superadmin',
    blocks: [
      { title: 'Global keys', kind: 'table', fields: ['key', 'value', 'updated_by', 'updated_at'] },
      { title: 'Control actions', kind: 'actions', fields: ['update setting', 'rollback', 'export'] },
    ],
  },
}

const panelIcon = (kind: SectionBlock['kind']) => {
  if (kind === 'table') return <Shield size={14} className="text-accentYellow" />
  if (kind === 'actions') return <Plus size={14} className="text-accentYellow" />
  if (kind === 'insights') return <CheckCircle2 size={14} className="text-accentYellow" />
  return <UserCog size={14} className="text-accentYellow" />
}

export const CabinetSectionPage = () => {
  const { section } = useParams()
  const { session } = useSession()

  const meta = section ? sectionMeta[section] : null

  if (!meta) {
    return (
      <PageContainer>
        <section className="matte-panel p-4">
          <h2 className="text-lg font-semibold">Раздел не найден</h2>
          <p className="mt-1 text-sm text-textMuted">Проверьте ссылку или вернитесь в корень кабинета.</p>
          <Link to="/profile" className="mt-3 inline-flex text-sm text-accentYellow">Вернуться в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  const allowed = roleRank[session.user.role] >= roleRank[meta.minRole]

  if (!allowed) {
    return (
      <PageContainer>
        <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
          <h2 className="text-lg font-semibold text-textPrimary">{meta.title}</h2>
          <div className="mt-3 rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="flex items-center gap-2"><AlertTriangle size={14} className="text-accentYellow" /> Недостаточно прав для этого раздела.</p>
            <p className="mt-1 text-xs text-textMuted">Минимальная роль: {meta.minRole}. Текущая роль: {session.user.role}.</p>
          </div>
          <Link to="/profile" className="mt-4 inline-flex text-sm text-accentYellow">← Назад в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-lg font-semibold text-textPrimary">{meta.title}</h2>
        <p className="mt-1 text-sm text-textSecondary">{meta.description}</p>
        {meta.primaryAction && <button type="button" className="mt-3 inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">{meta.primaryAction}</button>}
      </section>

      <div className="space-y-3">
        {meta.blocks.map((block) => (
          <section key={`${block.title}_${block.kind}`} className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary">
              {panelIcon(block.kind)}
              {block.title}
            </h3>
            <div className={block.kind === 'table' ? 'overflow-x-auto rounded-xl border border-borderSubtle' : 'space-y-2'}>
              {block.kind === 'table' ? (
                <table className="min-w-full text-xs text-textSecondary">
                  <thead className="bg-mutedBg text-textMuted">
                    <tr>
                      {block.fields.map((field) => <th key={field} className="px-2 py-2 text-left font-medium uppercase tracking-[0.08em]">{field}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-borderSubtle">
                      {block.fields.map((field) => <td key={field} className="px-2 py-2">mock data</td>)}
                    </tr>
                  </tbody>
                </table>
              ) : (
                block.fields.map((field) => (
                  <div key={field} className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs text-textSecondary">
                    {field}
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-xs text-textMuted shadow-soft">
        <p>Панель уже готова к подключению backend actions: captain invite, roster visibility, moderation, assign roles/permissions, restrictions, settings.</p>
        <Link to="/profile" className="mt-3 inline-flex text-sm text-accentYellow">← Назад в кабинет</Link>
      </section>
    </PageContainer>
  )
}
