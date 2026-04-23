import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, LayoutPanelTop } from 'lucide-react'
import type { Match, PublicUserCard, Team, UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { notifyError, notifySuccess, toRussianMessage } from '../../lib/notifications'
import { toAppRoute } from '../../lib/links'
import { useRepositories } from '../../app/providers/use-repositories'
import { useTeams } from '../../hooks/data/useTeams'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useMatches } from '../../hooks/data/useMatches'
import { useUserPreferences } from '../../hooks/app/useUserPreferences'
import { CircularImageCropField } from '../../components/ui/CircularImageCropField'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchField } from '../../components/ui/SearchField'
import { buildCircularCropUploadFile, type CircleCrop } from '../../lib/image-upload'
import { formatDateTimeMsk } from '../../lib/date-time'

const roleRank: Record<UserRole, number> = {
  guest: 0,
  player: 1,
  captain: 2,
  admin: 3,
  superadmin: 4,
}

const sectionRoles: Record<string, UserRole> = {
  profile: 'guest',
  'profile-settings': 'guest',
  edit: 'guest',
  activity: 'guest',
  'my-user': 'player',
  'my-actions': 'guest',
  'my-notifications': 'guest',
  favorites: 'guest',
  'user-settings': 'player',
  reactions: 'guest',
  'player-profile': 'player',
  'my-player': 'player',
  'player-events': 'player',
  'player-media': 'player',
  team: 'captain',
  'my-team': 'player',
  'team-events': 'captain',
  invites: 'captain',
  users: 'admin',
  'users-access-management': 'admin',
  'grant-access': 'admin',
  'revoke-access': 'admin',
  'issue-restriction': 'admin',
  'admins-list': 'admin',
  'captains-list': 'admin',
  'ban-list': 'admin',
  'create-match': 'admin',
  'page-change-history': 'admin',
  'matches-archive': 'admin',
  'teams-archive': 'admin',
  'tournament-management': 'admin',
  'stats-manual-edit': 'admin',
  'stats-change-history': 'admin',
  'team-socials': 'captain',
  roster: 'captain',
  moderation: 'admin',
  'comment-blocks': 'admin',
  tournament: 'captain',
  roles: 'superadmin',
  rbac: 'superadmin',
  restrictions: 'superadmin',
  settings: 'player',
}

const sectionMeta: Record<string, { title: string; description: string; tips: string[] }> = {
  profile: { title: 'Мой профиль', description: 'Редактирование карточки аккаунта и контактов.', tips: ['Проверьте ФИО и дату рождения.', 'Обновите bio и ссылку на аватар.'] },
  'profile-settings': { title: 'Настройки профиля', description: 'Безопасное обновление user/player profile.', tips: ['Форма автоматически загружается из backend.', 'Сохранение отправляет merged payload, чтобы не затирать данные.'] },
  edit: { title: 'Редактирование профиля', description: 'Рабочая форма профиля пользователя.', tips: ['Используйте загрузку данных перед сохранением.', 'Поля socials поддерживают key=value.'] },
  activity: { title: 'Моя активность', description: 'Работа с комментариями и реакциями.', tips: ['Откройте сущность и оставьте комментарий.', 'Проверьте ограничения доступа в реальном потоке.'] },
  'my-user': { title: 'Профиль пользователя', description: 'Быстрый переход в карточку пользователя.', tips: ['Открывается ваш user-профиль.', 'Редактирование доступно владельцу.'] },
  'my-actions': { title: 'Мои действия', description: 'История ваших действий.', tips: [] },
  'my-notifications': { title: 'Мои уведомления', description: 'Ваши уведомления.', tips: [] },
  favorites: { title: 'Избранное', description: 'Список любимых команд и игроков.', tips: [] },
  'user-settings': { title: 'Настройки', description: 'Персональные настройки пользователя.', tips: ['Секция подготовлена под будущий функционал.'] },
  'player-profile': { title: 'Профиль игрока', description: 'Игровой профиль пользователя (отдельно от user-профиля).', tips: ['Переходите в user-профиль для ФИО/био.', 'Проверяйте связь user ↔ player profile.'] },
  'my-player': { title: 'Профиль игрока', description: 'Мгновенный переход в профиль игрока.', tips: ['Используется playerProfileId из сессии.', 'Если profile не привязан — показывается сообщение.'] },
  'player-events': { title: 'Мои события', description: 'Все события, связанные с профилем игрока.', tips: ['События открываются на странице игрока.', 'Используйте фильтр по игроку в ленте.'] },
  'player-media': { title: 'Player media', description: 'Фото и медиа-поля профиля игрока.', tips: ['Используйте изображения с доступным URL.', 'Сохраняйте медиа отдельно от спортивных данных.'] },
  team: { title: 'Управление командой', description: 'Создание команды и переход к разделам капитана.', tips: ['Если команды нет — показать создание.', 'Если есть команда — только Состав и Лента событий.'] },
  'my-team': { title: 'Моя команда', description: 'Мгновенный переход на страницу команды.', tips: ['Если команда не найдена — открыть список команд.', 'Для капитана учитывается передача капитанства.'] },
  invites: { title: 'Приглашения', description: 'Приглашение игроков в команду.', tips: ['Укажите корректный ID команды.', 'Username вводится без @.'] },
  users: { title: 'Пользователи', description: 'Управление captain/admin правами и team membership.', tips: ['Поиск только по Telegram @username.', 'Destructive actions требуют подтверждения.'] },
  'users-access-management': { title: 'Управление правами юзеров', description: 'Единый раздел для выдачи/снятия ролей и точечной настройки прав.', tips: ['Найдите пользователя по Telegram-логину.', 'Все изменения прав выполняются только после подтверждения.'] },
  'grant-access': { title: 'Выдать права', description: 'Выдача ролей по Telegram-логину.', tips: ['Сначала найдите пользователя по @username.', 'Кнопка выдачи admin доступна только superadmin.'] },
  'revoke-access': { title: 'Забрать права', description: 'Снятие captain/admin прав.', tips: ['Сначала найдите пользователя по @username.', 'Действие требует подтверждения.'] },
  'issue-restriction': { title: 'Выдать ограничение', description: 'Ограничение комментирования пользователя.', tips: ['Укажите причину ограничения.', 'Можно выдать постоянный или временный блок.'] },
  'admins-list': { title: 'Список администраторов', description: 'Текущий список пользователей с ролью admin/superadmin.', tips: ['Данные формируются на основе ролей пользователя.', 'Можно быстро открыть профиль пользователя/игрока.'] },
  'captains-list': { title: 'Список капитанов', description: 'Текущий список пользователей с ролью captain.', tips: ['Капитаны с ролью admin тоже отображаются.', 'Показываются связанные player/team профили.'] },
  'ban-list': { title: 'Бан-лист', description: 'Пользователи с ограничениями (comments/events и др.).', tips: ['Список включает любое ограничение из user_restrictions.', 'Проверьте причину и при необходимости снимите ограничение.'] },
  'create-match': { title: 'Создать матч', description: 'Быстрое создание матча турнира.', tips: ['Выберите домашнюю и гостевую команды.', 'Проверьте RFC3339 для даты старта.'] },
  'page-change-history': { title: 'История изменений страниц', description: 'Журнал изменений информации по игрокам, командам и матчам.', tips: ['Показывает что изменили, на что и кто выполнил правку.', 'Каждая запись ведет на измененную страницу.'] },
  'matches-archive': { title: 'Архив матчей', description: 'Скрытые матчи, исключенные из лент и статистики.', tips: ['Откройте матч из архива для проверки.', 'При необходимости верните матч обратно.'] },
  'teams-archive': { title: 'Архив команд', description: 'Скрытые команды. Их матчи автоматически архивируются.', tips: ['Архивирование команды отправляет связанные матчи в архив.', 'Возврат команды из архива возвращает и ее матчи.'] },
  'tournament-management': { title: 'Управление турниром', description: 'Центр админ-инструментов по статистике и истории изменений турнира.', tips: ['Здесь собраны статистические и контрольные разделы админов.', 'Откройте нужный подпункт для работы с корректировками и журналами.'] },
  'stats-manual-edit': { title: 'Изменить статистику вручную', description: 'Ручные корректировки статистики команд и игроков по турнирам.', tips: ['Изменения сохраняются как отдельные записи.', 'Корректировки можно удалить через историю.'] },
  'stats-change-history': { title: 'Список изменений статистики', description: 'История всех ручных правок статистики.', tips: ['Записи привязаны к турниру и автору.', 'Удаление отменяет конкретную корректировку.'] },
  roster: { title: 'Управление составом', description: 'Состав команды с действиями по каждому игроку.', tips: ['Откроется страница команды в режиме состава.', 'Кнопки: глаз, карандаш, крестик.'] },
  'team-events': { title: 'События команды', description: 'Лента событий вашей команды.', tips: ['Кнопка создания доступна только капитану этой команды.', 'Редактирование/удаление скрыто для остальных.'] },
  'team-socials': { title: 'Соцсети команды', description: 'Обновление публичных ссылок команды.', tips: ['Формат ввода: key=value.', 'Сохраняйте только валидные URL.'] },
  tournament: { title: 'Турнирный workspace', description: 'Создание команд/игроков/матчей.', tips: ['Матчи доступны admin/superadmin.', 'Команды и игроки создаются через API.'] },
  moderation: { title: 'Модерация', description: 'Управление комментариями.', tips: ['Используйте ID комментария.', 'Действие логируется на backend.'] },
  'comment-blocks': { title: 'Блокировки', description: 'Ограничение комментариев пользователей.', tips: ['Заполните reason и срок.', 'Permanent отключает временной лимит.'] },
  roles: { title: 'Роли пользователей', description: 'Назначение ролей вручную.', tips: ['Роли вводятся через запятую.', 'Используйте только разрешенные role codes.'] },
  rbac: { title: 'Permissions', description: 'Точная настройка прав.', tips: ['Permissions задаются CSV-списком.', 'Проверяйте влияние на роль после назначения.'] },
  restrictions: { title: 'Restrictions', description: 'Глобальные ограничения пользователя.', tips: ['Restrictions задаются CSV-списком.', 'Проверяйте итоговые ограничения в профиле.'] },
  settings: { title: 'Глобальные настройки', description: 'Системные флаги и конфигурации.', tips: ['Value должно быть валидным JSON.', 'Глобальные изменения — только superadmin.'] },
}

const sectionPermissionOverrides: Record<string, string[]> = {
  'users-access-management': ['admin.permissions.manage', 'role.player.assign', 'role.captain.assign', 'role.player.revoke', 'role.captain.revoke'],
  'issue-restriction': ['comments.ban.issue'],
  'comment-blocks': ['comments.ban.issue'],
  'create-match': ['match.create'],
  'matches-archive': ['archive.manage', 'archive.delete'],
  'teams-archive': ['archive.manage', 'archive.delete'],
  'stats-manual-edit': ['stats.manual.manage'],
  'stats-change-history': ['stats.manual.manage'],
  'tournament-management': ['tournament.edit', 'playoff.grid.edit'],
}

const parseCSV = (raw: string) => raw.split(',').map((item) => item.trim()).filter(Boolean)
const granularAdminPermissions: Array<{ key: string; label: string; superadminOnly?: boolean }> = [
  { key: 'comments.ban.issue', label: 'Выдача блокировок' },
  { key: 'role.player.assign', label: 'Выдача роли игрока' },
  { key: 'role.captain.assign', label: 'Выдача роли капитана' },
  { key: 'role.player.revoke', label: 'Снятие роли игрока' },
  { key: 'role.captain.revoke', label: 'Снятие роли капитана' },
  { key: 'playoff.grid.edit', label: 'Редактирование сетки' },
  { key: 'tournament.edit', label: 'Редактирование турнира' },
  { key: 'stats.manual.manage', label: 'Ручная настройка статистики' },
  { key: 'event.full.create', label: 'Полноправное создание событий' },
  { key: 'match.score.manage.full', label: 'Введение счёта матча' },
  { key: 'archive.manage', label: 'Архивация и разархивация' },
  { key: 'archive.delete', label: 'Удаление матчей и команд' },
  { key: 'match.create', label: 'Создание матчей' },
  { key: 'comment.delete.any', label: 'Удаление комментариев' },
  { key: 'admin.permissions.manage', label: 'Настройка прав админов', superadminOnly: true },
]
const mskOffsetMinutes = 3 * 60
const matchStatusOptions: Array<{ value: Match['status']; label: string }> = [
  { value: 'scheduled', label: 'Запланирован' },
  { value: 'live', label: 'LIVE' },
  { value: 'half_time', label: 'Перерыв' },
  { value: 'finished', label: 'Завершен' },
]

const toMskDateTimeInput = (iso?: string) => {
  if (!iso) return ''
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return ''
  const shifted = new Date(parsed.getTime() + mskOffsetMinutes * 60_000)
  const yyyy = shifted.getUTCFullYear()
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(shifted.getUTCDate()).padStart(2, '0')
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mi = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
}

const fromMskDateTimeInput = (value: string) => {
  if (!value) return ''
  const [datePart, timePart] = value.split('T')
  if (!datePart || !timePart) return ''
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return ''
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0)).toISOString()
}

const toMskDisplay = (iso?: string) => {
  if (!iso) return ''
  const raw = toMskDateTimeInput(iso)
  if (!raw) return ''
  const [datePart, timePart] = raw.split('T')
  if (!datePart || !timePart) return ''
  const [year, month, day] = datePart.split('-')
  return `${day}.${month}.${year} ${timePart}`
}

const toDateInputFromDdMmYyyy = (value: string) => {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) return ''
  const [dd, mm, yyyy] = value.split('.')
  return `${yyyy}-${mm}-${dd}`
}

const toDdMmYyyyFromDateInput = (value: string) => {
  const [yyyy, mm, dd] = value.split('-')
  if (!yyyy || !mm || !dd) return ''
  return `${dd}.${mm}.${yyyy}`
}

const formatActionTitle = (action: string, metadata?: Record<string, unknown>) => {
  if (action === 'auth.register') return 'Регистрация в системе'
  if (action === 'comment.create') return 'Опубликован комментарий'
  if (action === 'comment.reply') return 'Опубликован ответ в комментариях'
  if (action === 'event.create') return 'Опубликовано событие'
  if (action === 'comment.react') {
    const reaction = String(metadata?.reaction_type ?? '')
    if (reaction === 'like') return 'Поставлен лайк'
    if (reaction === 'dislike') return 'Поставлен дизлайк'
    return 'Реакция на комментарий'
  }
  if (action === 'user.profile_update') return 'Обновление профиля'
  return action
}

const formatActionDetails = (action: string, metadata?: Record<string, unknown>) => {
  if (!metadata) return null
  if (action === 'comment.create' || action === 'comment.reply') {
    const body = String(metadata.body ?? '').trim()
    return body ? `Текст: ${body}` : 'Комментарий добавлен'
  }
  if (action === 'comment.react') {
    const reaction = String(metadata.reaction_type ?? '')
    return reaction === 'like' ? 'Вы отметили комментарий как полезный' : reaction === 'dislike' ? 'Вы поставили отрицательную реакцию' : 'Реакция обновлена'
  }
  if (action === 'event.create') {
    const title = String(metadata.title ?? '').trim()
    return title ? `Событие: ${title}` : 'Создано новое событие'
  }
  if (action.includes('profile_update')) {
    const firstName = metadata.first_name as { from?: string; to?: string } | undefined
    const lastName = metadata.last_name as { from?: string; to?: string } | undefined
    const displayName = metadata.display_name as { from?: string; to?: string } | undefined
    return `Имя: ${firstName?.from ?? '—'} → ${firstName?.to ?? '—'} · Фамилия: ${lastName?.from ?? '—'} → ${lastName?.to ?? '—'} · Display: ${displayName?.from ?? '—'} → ${displayName?.to ?? '—'}`
  }
  return null
}

const pageChangeTargetTypeLabels: Record<string, string> = {
  team: 'Команда',
  player: 'Игрок',
  match: 'Матч',
  user: 'Пользователь',
}

const pageChangeFieldLabels: Record<string, string> = {
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
  start_at: 'Дата и время',
  status: 'Статус',
  home_score: 'Счет хозяев',
  away_score: 'Счет гостей',
  venue: 'Стадион',
  display_name: 'Отображаемое имя',
  first_name: 'Имя',
  last_name: 'Фамилия',
  bio: 'О себе',
}

const stringifyChangeValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const formatPageChangeValue = (field: string, value: unknown, teamNames: Map<string, string>) => {
  if (field === 'team_id') {
    return teamNames.get(String(value ?? '')) ?? stringifyChangeValue(value)
  }
  if (field === 'start_at') {
    const unix = Number(value)
    if (Number.isFinite(unix) && unix > 0) return formatDateTimeMsk(new Date(unix * 1000).toISOString())
  }
  return stringifyChangeValue(value)
}

export const CabinetSectionPage = () => {
  const { section } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, refreshSession } = useSession()
  const { cabinetRepository, teamsRepository, playersRepository, matchesRepository, uploadsRepository, usersRepository } = useRepositories()
  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { data: matches } = useMatches()
  const { favoriteEntityKeys } = useUserPreferences()

  const [status, setStatus] = useState('')

  useEffect(() => {
    const normalized = status.trim()
    if (!normalized) return
    if (normalized.startsWith('ok:')) {
      notifySuccess(toRussianMessage(normalized.replace(/^ok:\s*/i, '')))
      return
    }
    if (normalized.startsWith('error:')) {
      notifyError(toRussianMessage(normalized.replace(/^error:\s*/i, '')))
      return
    }
    notifyError(toRussianMessage(normalized))
  }, [status])
  const [myActions, setMyActions] = useState<Array<{ id: string; action: string; targetType: string; targetId: string; route: string; createdAt: string; metadata?: Record<string, unknown> }>>([])
  const [pageChangeHistory, setPageChangeHistory] = useState<Array<{ id: string; action: string; targetType: string; targetId: string; route: string; createdAt: string; metadata?: Record<string, unknown> }>>([])
  const [pageChangeSearch, setPageChangeSearch] = useState(searchParams.get('query') ?? '')
  const [pageChangeFilter, setPageChangeFilter] = useState<'all' | 'team' | 'match' | 'player' | 'user'>(() => {
    const targetType = searchParams.get('targetType')
    return targetType === 'team' || targetType === 'match' || targetType === 'player' || targetType === 'user' ? targetType : 'all'
  })
  const [deleteArchivedMatchId, setDeleteArchivedMatchId] = useState<string | null>(null)
  const [myNotifications, setMyNotifications] = useState<Array<{ id: string; notificationType: string; title: string; body: string; route: string; status: string; createdAt: string }>>([])
  const [telegramNotificationsEnabled, setTelegramNotificationsEnabled] = useState(true)
  const [telegramSettingsLoading, setTelegramSettingsLoading] = useState(false)
  const favoriteItems = useMemo(() => favoriteEntityKeys.map((key) => {
    const [type, id] = key.split(':')
    if (!id) return null
    if (type === 'team') {
      const team = (teams ?? []).find((item) => item.id === id)
      if (!team) return null
      return { key, title: team.name, subtitle: `${team.city} · ${team.shortName}`, route: `/teams/${team.id}` }
    }
    if (type === 'player') {
      const player = (players ?? []).find((item) => item.id === id)
      if (!player) return null
      return { key, title: player.displayName, subtitle: `${player.position} · #${player.number}`, route: `/players/${player.id}` }
    }
    return null
  }).filter((item): item is { key: string; title: string; subtitle: string; route: string } => Boolean(item)), [favoriteEntityKeys, players, teams])

  const [displayName, setDisplayName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [socialsRaw, setSocialsRaw] = useState('')

  const [teamId, setTeamId] = useState('')
  const [username, setUsername] = useState('')
  const [userLookupUsername, setUserLookupUsername] = useState('')
  const [selectedUser, setSelectedUser] = useState<PublicUserCard | null>(null)
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string[]>([])
  const [userLookupResults, setUserLookupResults] = useState<PublicUserCard[]>([])
  const [selectedUserTeamId, setSelectedUserTeamId] = useState('')
  const [membershipTeamId, setMembershipTeamId] = useState('')
  const [teamSocialsRaw, setTeamSocialsRaw] = useState('telegram=https://t.me/')

  const [commentId, setCommentId] = useState('')
  const [blockedUserId, setBlockedUserId] = useState('')
  const [permanent, setPermanent] = useState(false)
  const [untilUnix, setUntilUnix] = useState('0')
  const [reason, setReason] = useState('')

  const [targetUserId, setTargetUserId] = useState('')
  const [rolesRaw, setRolesRaw] = useState('player')
  const [permissionsRaw, setPermissionsRaw] = useState('comments:moderate')
  const [restrictionsRaw, setRestrictionsRaw] = useState('comments:banned')
  const [settingKey, setSettingKey] = useState('ui.flags')
  const [settingValueRaw, setSettingValueRaw] = useState('{"newCabinet":true}')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSlug, setNewTeamSlug] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [newTeamLogoFile, setNewTeamLogoFile] = useState<File | null>(null)
  const [newTeamLogoPreview, setNewTeamLogoPreview] = useState<string | null>(null)
  const [newTeamLogoCrop, setNewTeamLogoCrop] = useState<CircleCrop>({ x: 0, y: 0, zoom: 1 })
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerUserId, setNewPlayerUserId] = useState('')
  const [newPlayerPosition, setNewPlayerPosition] = useState('MF')
  const [newPlayerNumber, setNewPlayerNumber] = useState('10')
  const [newPlayerAvatarFile, setNewPlayerAvatarFile] = useState<File | null>(null)
  const [newPlayerAvatarPreview, setNewPlayerAvatarPreview] = useState<string | null>(null)
  const [newPlayerAvatarCrop, setNewPlayerAvatarCrop] = useState<CircleCrop>({ x: 0, y: 0, zoom: 1 })
  const [matchHomeTeamId, setMatchHomeTeamId] = useState('')
  const [matchAwayTeamId, setMatchAwayTeamId] = useState('')
  const [matchStartAt, setMatchStartAt] = useState('')
  const [matchStatus, setMatchStatus] = useState<Match['status']>('scheduled')
  const [matchVenue, setMatchVenue] = useState('')
  const [matchReferee, setMatchReferee] = useState('')
  const [matchBroadcastUrl, setMatchBroadcastUrl] = useState('')
  const [matchStage, setMatchStage] = useState('')
  const [archivedMatches, setArchivedMatches] = useState<Match[]>([])
  const [archivedTeams, setArchivedTeams] = useState<Team[]>([])
  const [locallyArchivedTeamIds, setLocallyArchivedTeamIds] = useState<string[]>([])
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState<null | { displayName: string; firstName: string; lastName: string; bio: string; avatarUrl: string; socials: Record<string, string> }>(null)
  const [tournamentCycles, setTournamentCycles] = useState<Array<{ id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }>>([])
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [newCycleName, setNewCycleName] = useState('')
  const [newCycleCapacity, setNewCycleCapacity] = useState<4 | 8 | 16 | 32>(16)
  const [bracketCapacityDraft, setBracketCapacityDraft] = useState<4 | 8 | 16 | 32>(16)
  const [userAccessRows, setUserAccessRows] = useState<Array<{ id: string; displayName: string; telegramUsername?: string; roles: UserRole[]; restrictions: string[]; playerId?: string; teamId?: string; isOnline: boolean }>>([])
  const [confirmDialog, setConfirmDialog] = useState<null | { title: string; description: string; confirmLabel?: string; onConfirm: () => Promise<void> }>(null)
  const [statEntityType, setStatEntityType] = useState<'team' | 'player'>('player')
  const [statEntityId, setStatEntityId] = useState('')
  const [statEntitySearch, setStatEntitySearch] = useState('')
  const [statField, setStatField] = useState('goals')
  const [statDelta, setStatDelta] = useState('0')
  const [statsHistory, setStatsHistory] = useState<Array<{ id: string; tournamentId: string; entityType: 'team' | 'player'; entityId: string; field: string; delta: number; authorUserId: string; authorTelegramUsername?: string; createdAt: string }>>([])

  const currentRoles = useMemo<UserRole[]>(
    () => (session.user.roles?.length ? session.user.roles : [session.user.role]),
    [session.user.role, session.user.roles],
  )
  const minRole = section ? sectionRoles[section] : null
  const meta = section ? sectionMeta[section] : null
  const allowedByRole = minRole ? currentRoles.some((role) => roleRank[role] >= roleRank[minRole]) : false
  const allowedByPermission = section ? (sectionPermissionOverrides[section] ?? []).some((permission) => session.permissions.includes(permission as typeof session.permissions[number])) : false
  const allowed = allowedByRole || allowedByPermission
  const canManageAdminPermissions = currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)
    || session.permissions.includes('admin.permissions.manage')
  const isSuperadminActor = currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)
  const canAssignCaptainRole = isSuperadminActor || session.permissions.includes('role.captain.assign')
  const canRevokeCaptainRole = isSuperadminActor || session.permissions.includes('role.captain.revoke')
  const canAssignPlayerRole = isSuperadminActor || session.permissions.includes('role.player.assign')
  const canRevokePlayerRole = isSuperadminActor || session.permissions.includes('role.player.revoke')
  const canManageArchive = isSuperadminActor || session.permissions.includes('archive.manage')
  const managedTeamId = useMemo(() => {
    if (session.user.teamId) return session.user.teamId
    const captainTeam = (teams ?? []).find((item) => item.captainUserId === session.user.id)
    return captainTeam?.id
  }, [session.user.id, session.user.teamId, teams])

  const isAdminScope = currentRoles.some((role) => roleRank[role] >= roleRank.admin)
  const activeTeamsForArchive = useMemo(
    () => (teams ?? []).filter((item) => !item.archived && !locallyArchivedTeamIds.includes(item.id)),
    [locallyArchivedTeamIds, teams],
  )
  const statEntityOptions = useMemo(() => {
    if (statEntityType === 'team') {
      return (teams ?? []).map((item) => ({ id: item.id, label: item.name, subtitle: `Команда • ${item.shortName || item.id}` }))
    }
    return (players ?? []).map((item) => ({ id: item.id, label: item.displayName, subtitle: `Игрок • ${item.position}` }))
  }, [players, statEntityType, teams])
  const filteredStatEntityOptions = useMemo(() => {
    const normalized = statEntitySearch.trim().toLowerCase()
    if (!normalized) return statEntityOptions
    return statEntityOptions.filter((item) => item.label.toLowerCase().includes(normalized) || item.id.toLowerCase().includes(normalized))
  }, [statEntityOptions, statEntitySearch])

  useEffect(() => {
    if (!(section === 'tournament' || section === 'stats-manual-edit' || section === 'stats-change-history')) return
    if (!cabinetRepository.getTournamentCycles) return

    void cabinetRepository.getTournamentCycles().then((cycles) => {
      setTournamentCycles(cycles)
      const active = cycles.find((item) => item.isActive) ?? cycles[0]
      if (active) {
        setSelectedCycleId(active.id)
        setBracketCapacityDraft(active.bracketTeamCapacity)
      }
    }).catch(() => undefined)
  }, [cabinetRepository, section])

  useEffect(() => {
    if (section !== 'matches-archive') return
    void matchesRepository.getMatches({ includeArchived: true })
      .then((list) => setArchivedMatches(list.filter((match) => match.archived)))
      .catch(() => setArchivedMatches([]))
  }, [matchesRepository, section, status])

  useEffect(() => {
    if (section !== 'teams-archive') return
    void teamsRepository.getTeams({ includeArchived: true })
      .then((list) => setArchivedTeams(list.filter((team) => team.archived)))
      .catch(() => setArchivedTeams([]))
  }, [section, status, teamsRepository])

  useEffect(() => {
    if (section !== 'stats-manual-edit') return
    const params = new URLSearchParams(window.location.search)
    const entityType = params.get('entityType')
    const entityId = params.get('entityId')
    if (entityType === 'team' || entityType === 'player') {
      setStatEntityType(entityType)
      setStatField(entityType === 'team' ? 'wins' : 'goals')
    }
    if (entityId) setStatEntityId(entityId)
  }, [section])

  useEffect(() => {
    if (section !== 'stats-change-history') return
    if (!cabinetRepository.getManualStatAdjustments) return
    void cabinetRepository.getManualStatAdjustments(selectedCycleId || undefined)
      .then((items) => setStatsHistory(items))
      .catch(() => setStatsHistory([]))
  }, [cabinetRepository, section, selectedCycleId, status])

  useEffect(() => {
    if (!(section === 'admins-list' || section === 'captains-list' || section === 'ban-list')) return
    if (!cabinetRepository.getUserAccessMatrix) return
    void cabinetRepository.getUserAccessMatrix()
      .then((rows) => setUserAccessRows(rows))
      .catch(() => setUserAccessRows([]))
  }, [cabinetRepository, section, status])

  useEffect(() => {
    if (!status) return
    const timeoutId = window.setTimeout(() => setStatus(''), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [status])

  useEffect(() => {
    if (!(section === 'profile-settings' || section === 'profile' || section === 'edit')) return

    const load = async () => {
      setProfileLoading(true)
      try {
        const profile = await cabinetRepository.getMyProfile()
        setProfileLoaded({ displayName: profile.displayName, firstName: profile.firstName, lastName: profile.lastName, bio: profile.bio, avatarUrl: profile.avatarUrl, socials: profile.socials })
        setDisplayName(profile.displayName)
        setFirstName(profile.firstName ?? '')
        setLastName(profile.lastName ?? '')
        setMiddleName(profile.socials.middle_name ?? '')
        setBirthDate(profile.socials.birth_date ?? '')
        setBio(profile.bio)
        setAvatarUrl(profile.avatarUrl)
        setSocialsRaw(Object.entries(profile.socials)
          .filter(([k]) => !['first_name', 'last_name', 'middle_name', 'birth_date'].includes(k))
          .map(([k, v]) => `${k}=${v}`).join(', '))
      } catch (error) {
        setStatus(`error: ${(error as Error).message}`)
      } finally {
        setProfileLoading(false)
      }
    }

    void load()
  }, [cabinetRepository, section])

  const socials = useMemo(() => Object.fromEntries(parseCSV(socialsRaw).map((line) => {
    const idx = line.indexOf('=')
    if (idx < 0) return [line, '']
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  }).filter(([key]) => key)), [socialsRaw])

  const teamSocials = useMemo(() => Object.fromEntries(parseCSV(teamSocialsRaw).map((line) => {
    const idx = line.indexOf('=')
    if (idx < 0) return [line, '']
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  }).filter(([key]) => key)), [teamSocialsRaw])

  const birthDateError = useMemo(() => {
    if (!birthDate.trim()) return ''
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(birthDate.trim())) return 'Дата рождения должна быть в формате ДД.ММ.ГГГГ'
    const [dayStr, monthStr, yearStr] = birthDate.split('.')
    const day = Number(dayStr)
    const month = Number(monthStr)
    const year = Number(yearStr)
    const date = new Date(year, month - 1, day)
    const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    if (!valid) return 'Укажите существующую дату рождения'
    if (date.getTime() > Date.now()) return 'Дата рождения не может быть в будущем'
    return ''
  }, [birthDate])
  const nameError = useMemo(() => {
    if (firstName.trim().length > 30) return 'Имя — максимум 30 символов'
    if (lastName.trim().length > 30) return 'Фамилия — максимум 30 символов'
    return ''
  }, [firstName, lastName])


  useEffect(() => {
    if (section !== 'my-team') return
    if (!session.user.teamId && !teams) return
    navigate(managedTeamId ? `/teams/${managedTeamId}` : '/teams', { replace: true })
  }, [managedTeamId, navigate, section, session.user.teamId, teams])

  useEffect(() => {
    if (section !== 'my-player') return
    navigate(session.user.playerProfileId ? `/players/${session.user.playerProfileId}` : '/profile/player-profile', { replace: true })
  }, [navigate, section, session.user.playerProfileId])

  useEffect(() => {
    if (section !== 'my-user') return
    if (!session.isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    navigate(`/users/${session.user.id}`, { replace: true })
  }, [navigate, section, session.isAuthenticated, session.user.id])

  useEffect(() => {
    if (section !== 'my-actions') return
    if (!session.isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (!cabinetRepository.getMyActions) return
    void cabinetRepository.getMyActions().then((items) => {
      setMyActions(items.map((item) => ({
        id: item.id,
        action: item.action,
        targetType: item.targetType,
        targetId: item.targetId,
        createdAt: item.createdAt,
        route: toAppRoute(item.route || '/'),
        metadata: item.metadata,
      })))
    }).catch(() => setMyActions([]))
  }, [cabinetRepository, navigate, section, session.isAuthenticated])

  const filteredPageChangeHistory = useMemo(() => {
    const query = pageChangeSearch.trim().toLowerCase()
    const targetTypeFilter = searchParams.get('targetType')?.trim() ?? ''
    const targetIdFilter = searchParams.get('targetId')?.trim() ?? ''
    return pageChangeHistory.filter((item) => {
      if (targetTypeFilter && item.targetType !== targetTypeFilter) return false
      if (targetIdFilter && item.targetId !== targetIdFilter) return false
      const matchesFilter = pageChangeFilter === 'all' || item.targetType === pageChangeFilter
      if (!matchesFilter) return false
      if (!query) return true
      const actorName = String(item.metadata?.actor_name ?? '').toLowerCase()
      const changes = Object.entries((item.metadata?.changes ?? {}) as Record<string, { from?: unknown; to?: unknown }>)
        .map(([field, value]) => `${field} ${String(value?.from ?? '')} ${String(value?.to ?? '')}`)
        .join(' ')
        .toLowerCase()
      const actionLabel = `${item.action} ${item.targetType} ${item.targetId}`.toLowerCase()
      return actorName.includes(query) || changes.includes(query) || actionLabel.includes(query)
    })
  }, [pageChangeFilter, pageChangeHistory, pageChangeSearch, searchParams])

  const pageChangeTargetNames = useMemo(() => {
    const teamNames = new Map((teams ?? []).map((item) => [item.id, item.name]))
    const playerNames = new Map((players ?? []).map((item) => [item.id, item.displayName]))
    const matchNames = new Map((matches ?? []).map((item) => [item.id, `${teamNames.get(item.homeTeamId) ?? `Команда ${item.homeTeamId}`} — ${teamNames.get(item.awayTeamId) ?? `Команда ${item.awayTeamId}`}`]))
    return { teamNames, playerNames, matchNames }
  }, [matches, players, teams])

  useEffect(() => {
    if (section !== 'page-change-history') return
    if (!session.isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (!cabinetRepository.getPageChangeHistory) return
    void cabinetRepository.getPageChangeHistory().then((items) => {
      setPageChangeHistory(items)
    }).catch((error) => setStatus(`error: ${(error as Error).message}`))
  }, [cabinetRepository, navigate, section, session.isAuthenticated])

  useEffect(() => {
    if (section !== 'my-notifications') return
    if (!session.isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (!cabinetRepository.getMyNotifications) return
    void cabinetRepository.getMyNotifications().then((items) => {
      setMyNotifications(items)
    }).catch(() => setMyNotifications([]))
  }, [cabinetRepository, navigate, section, session.isAuthenticated])

  useEffect(() => {
    if (section !== 'user-settings') return
    if (!session.isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    if (!cabinetRepository.getTelegramNotificationsEnabled) return
    setTelegramSettingsLoading(true)
    void cabinetRepository.getTelegramNotificationsEnabled()
      .then((enabled) => setTelegramNotificationsEnabled(enabled))
      .catch(() => setStatus('error: не удалось загрузить настройки уведомлений'))
      .finally(() => setTelegramSettingsLoading(false))
  }, [cabinetRepository, navigate, section, session.isAuthenticated])

  const lookupUserByTelegram = async () => {
    const login = userLookupUsername.trim().replace(/^@/, '')
    if (!login) {
      setStatus('error: укажите Telegram логин')
      return null
    }
    try {
      const exact = await usersRepository.findByTelegramUsername?.(login)
      const list = await usersRepository.searchByTelegramUsername?.(login)
      const merged = exact
        ? [exact, ...(list ?? []).filter((item) => item.id !== exact.id)]
        : (list ?? [])
      setUserLookupResults(merged)
      if (!merged.length) {
        setSelectedUser(null)
        setSelectedUserTeamId('')
        setMembershipTeamId('')
        setStatus('error: пользователь не найден')
        return null
      }
      setSelectedUser(merged[0])
      setSelectedUserTeamId('')
      setMembershipTeamId('')
      setStatus(merged.length > 1
        ? `ok: найдено пользователей: ${merged.length}. Выберите нужного.`
        : `ok: выбран пользователь ${merged[0].displayName}`)
      return merged[0]
    } catch (error) {
      setStatus(`error: ${(error as Error).message}`)
      return null
    }
  }

  useEffect(() => {
    if (!selectedUser) {
      setSelectedUserPermissions([])
      return
    }
    setSelectedUserPermissions(Array.isArray(selectedUser.permissions) ? selectedUser.permissions : [])
  }, [selectedUser])

  if (!section || !minRole || !meta) {
    return (
      <PageContainer>
        <section className="matte-panel p-4">
          <h2 className="text-lg font-semibold">Раздел не найден</h2>
          <p className="mt-1 text-sm text-textMuted">Проверьте ссылку или вернитесь в кабинет.</p>
          <Link to="/profile" className="mt-3 inline-flex text-sm text-accentYellow">Вернуться в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  if (!allowed) {
    return (
      <PageContainer>
        <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
          <h2 className="text-lg font-semibold text-textPrimary">{section}</h2>
          <div className="mt-3 rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="flex items-center gap-2"><AlertTriangle size={14} className="text-accentYellow" /> Недостаточно прав для этого раздела.</p>
            <p className="mt-1 text-xs text-textMuted">Активные роли: {currentRoles.join(', ')}.</p>
          </div>
          <Link to="/profile" className="mt-4 inline-flex text-sm text-accentYellow">← Назад в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1 rounded-full border border-borderSubtle px-2 py-0.5 text-[11px] text-textMuted">
              <LayoutPanelTop size={12} /> Личный кабинет
            </p>
            <h2 className="mt-2 text-lg font-semibold text-textPrimary">{meta.title}</h2>
            <p className="mt-1 text-sm text-textSecondary">{meta.description}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {meta.tips.map((tip) => (
            <p key={tip} className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs text-textSecondary">{tip}</p>
          ))}
        </div>
        <Link to="/profile" className="mt-3 inline-flex items-center gap-1 text-xs text-accentYellow">
          Назад к секциям кабинета <ChevronRight size={12} />
        </Link>
      </section>

      {section === 'activity' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="font-semibold text-textPrimary">Комментарии и реакции</p>
            <p className="mt-1">Откройте comments у любой сущности (team/player/match/event), чтобы создать comment, reply, like/dislike и проверить ограничения 403/429.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/events" className="rounded-lg border border-borderSubtle px-3 py-2">К событиям</Link>
            <Link to="/teams" className="rounded-lg border border-borderSubtle px-3 py-2">К командам</Link>
            <Link to="/matches" className="rounded-lg border border-borderSubtle px-3 py-2">К матчам</Link>
          </div>
        </section>
      )}

      {section === 'player-profile' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-sm text-textSecondary">«Мой профиль» ведет на обычную страницу игрока с теми же правами редактирования.</p>
          {session.user.playerProfileId ? (
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={() => navigate(`/players/${session.user.playerProfileId}`)}>
              Открыть мой player profile
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-borderStrong bg-mutedBg p-3 text-xs text-textMuted">
              Player profile не привязан к аккаунту. Обратитесь к капитану/админу для привязки.
            </div>
          )}
        </section>
      )}

      {(section === 'profile-settings' || section === 'profile' || section === 'edit') && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-xs text-textMuted">Настройки профиля загружены из backend. Измените только нужные поля и сохраните.</p>
          {profileLoading && <p className="text-xs text-textMuted">Загружаем текущие значения…</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={session.user.telegramHandle ?? ''} readOnly placeholder="Telegram login" className="w-full rounded-lg border border-borderSubtle bg-panelSoft px-2 py-1 text-textMuted" />
            <input value={session.user.telegramId ?? ''} readOnly placeholder="Telegram ID" className="w-full rounded-lg border border-borderSubtle bg-panelSoft px-2 py-1 text-textMuted" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Фамилия" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Имя" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          </div>
          <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} placeholder="Отчество (если есть)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input type="date" value={toDateInputFromDdMmYyyy(birthDate)} onChange={(e) => setBirthDate(toDdMmYyyyFromDateInput(e.target.value))} placeholder="Дата рождения (ДД.ММ.ГГГГ)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          {(birthDateError || nameError) && <p className="text-xs text-rose-300">{nameError || birthDateError}</p>}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Отображаемое имя" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Ссылка на фото профиля" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Коротко о себе" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={socialsRaw} onChange={(e) => setSocialsRaw(e.target.value)} placeholder="telegram=https://... , instagram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={Boolean(birthDateError || nameError)} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
            try {
              const base = profileLoaded ?? { displayName: '', bio: '', avatarUrl: '', socials: {} }
              await cabinetRepository.updateMyProfile({
                displayName: displayName || base.displayName,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                bio: bio || base.bio,
                avatarUrl: avatarUrl || base.avatarUrl,
                socials: {
                  ...base.socials,
                  ...socials,
                  middle_name: middleName,
                  birth_date: birthDate,
                },
              })
              setProfileLoaded({
                displayName: displayName || base.displayName,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                bio: bio || base.bio,
                avatarUrl: avatarUrl || base.avatarUrl,
                socials: {
                  ...base.socials,
                  ...socials,
                  middle_name: middleName,
                  birth_date: birthDate,
                },
              })
              await refreshSession()
              setStatus('ok: profile updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Сохранить профиль</button>
          <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={() => {
            if (!profileLoaded) return
            setDisplayName(profileLoaded.displayName)
            setBio(profileLoaded.bio)
            setAvatarUrl(profileLoaded.avatarUrl)
            setFirstName(profileLoaded.firstName ?? '')
            setLastName(profileLoaded.lastName ?? '')
            setMiddleName(profileLoaded.socials.middle_name ?? '')
            setBirthDate(profileLoaded.socials.birth_date ?? '')
            setSocialsRaw(Object.entries(profileLoaded.socials)
              .filter(([k]) => !['middle_name', 'birth_date'].includes(k))
              .map(([k, v]) => `${k}=${v}`).join(', '))
            setStatus('ok: profile changes canceled')
          }}>Отмена изменений</button>
        </section>
      )}

      {section === 'team' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {!managedTeamId && currentRoles.some((role) => roleRank[role] >= roleRank.captain) && (
            <div className="space-y-2 rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Название команды" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <input value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} placeholder="Описание (опционально)" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <button type="button" disabled={!newTeamName.trim()} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                try {
                  const created = await teamsRepository.createTeam?.({ name: newTeamName.trim(), description: newTeamDescription.trim(), logoUrl: undefined })
                  const createdTeamId = created && 'id' in created ? created.id : null
                  if (createdTeamId) {
                    await playersRepository.createPlayer?.({ userId: session.user.id, teamId: createdTeamId, fullName: session.user.displayName, position: 'MF', shirtNumber: 0 })
                    setStatus('ok: team created, captain can now manage roster/events')
                    await refreshSession()
                    navigate(`/teams/${createdTeamId}`)
                    return
                  }
                  setStatus('ok: team created')
                } catch (error) {
                  setStatus(`error: ${(error as Error).message}`)
                }
              }}>Создать команду</button>
            </div>
          )}
          {managedTeamId && (
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <Link to={`/teams/${managedTeamId}/roster`} className="rounded-lg bg-accentYellow px-3 py-3 text-center font-semibold text-app">Состав команды</Link>
              <Link to={`/teams/${managedTeamId}/events`} className="rounded-lg bg-accentYellow px-3 py-3 text-center font-semibold text-app">Лента событий</Link>
            </div>
          )}
        </section>
      )}


      {section === 'player-events' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-sm text-textSecondary">Открывает события, связанные с вашим профилем игрока.</p>
          {session.user.playerProfileId ? (
            <div className="flex flex-wrap gap-2 text-xs">
              <Link to={`/players/${session.user.playerProfileId}`} className="rounded-lg border border-borderSubtle px-3 py-2">Открыть профиль игрока</Link>
              <Link to="/events" className="rounded-lg border border-borderSubtle px-3 py-2">Общая лента событий</Link>
            </div>
          ) : (
            <p className="text-xs text-textMuted">Профиль игрока не привязан к вашему аккаунту.</p>
          )}
        </section>
      )}

      {section === 'my-actions' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {myActions.length ? myActions.map((item) => {
            const title = formatActionTitle(item.action, item.metadata)
            const details = formatActionDetails(item.action, item.metadata)
            const reactionType = String(item.metadata?.reaction_type ?? '')
            return (
              <Link key={item.id} to={toAppRoute(item.route)} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3">
                <p className="text-sm font-semibold text-textPrimary">{title}</p>
                <p className="mt-1 text-xs text-textMuted">{formatDateTimeMsk(item.createdAt)}</p>
                {reactionType === 'like' && <p className="mt-2 text-xs text-emerald-300">👍 Лайк</p>}
                {reactionType === 'dislike' && <p className="mt-2 text-xs text-rose-300">👎 Дизлайк</p>}
                {details && <p className="mt-2 text-xs text-textSecondary">{details}</p>}
                <p className="mt-2 text-xs text-accentYellow">Перейти к месту действия →</p>
              </Link>
            )
          }) : <p className="text-xs text-textMuted">Пока нет действий.</p>}
        </section>
      )}

      {section === 'my-notifications' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {myNotifications.length ? myNotifications.map((item) => (
            <Link key={item.id} to={toAppRoute(item.route || '/')} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <p className="text-sm font-semibold text-textPrimary">{item.title || 'Уведомление'}</p>
              {item.body && <p className="mt-1 text-xs text-textSecondary">{item.body}</p>}
              <p className="mt-1 text-xs text-textMuted">{formatDateTimeMsk(item.createdAt)}</p>
              <p className="mt-2 text-xs text-accentYellow">Перейти к источнику →</p>
            </Link>
          )) : <p className="text-xs text-textMuted">Пока нет уведомлений.</p>}
        </section>
      )}

      {section === 'tournament-management' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <p className="text-sm text-textSecondary">Выберите раздел управления турниром:</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { title: 'Изменить статистику вручную', description: 'Ручные корректировки статистики команд и игроков.', route: '/profile/stats-manual-edit' },
              { title: 'Список изменений статистики', description: 'История корректировок с возможностью удаления.', route: '/profile/stats-change-history' },
              { title: 'История изменений страниц', description: 'Журнал правок по игрокам, командам и матчам.', route: '/profile/page-change-history' },
              { title: 'Список администраторов', description: 'Пользователи с ролями admin/superadmin.', route: '/profile/admins-list' },
              { title: 'Бан-лист', description: 'Пользователи с активными ограничениями.', route: '/profile/ban-list' },
            ].map((item) => (
              <Link key={item.route} to={item.route} className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 hover:border-accentYellow/50">
                <p className="text-sm font-semibold text-textPrimary">{item.title}</p>
                <p className="mt-1 text-xs text-textSecondary">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {section === 'page-change-history' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {searchParams.get('returnTo') && (
            <Link
              to={searchParams.get('returnTo') ?? '/'}
              className="mb-1 inline-flex items-center gap-1 text-xs text-accentYellow"
            >
              ← Вернуться на страницу
            </Link>
          )}
          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
            <input
              value={pageChangeSearch}
              onChange={(event) => setPageChangeSearch(event.target.value)}
              placeholder="Поиск: кто менял, поле, значение…"
              className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm"
            />
            <select
              value={pageChangeFilter}
              onChange={(event) => setPageChangeFilter(event.target.value as 'all' | 'team' | 'match' | 'player' | 'user')}
              className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm"
            >
              <option value="all">Все</option>
              <option value="team">Команды</option>
              <option value="match">Матчи</option>
              <option value="player">Игроки</option>
              <option value="user">Пользователи</option>
            </select>
          </div>
          {filteredPageChangeHistory.length ? filteredPageChangeHistory.map((item) => {
            const actorName = String(item.metadata?.actor_name ?? 'Неизвестно')
            const actorUsername = String(item.metadata?.actor_username ?? '')
            const rawChanges = (item.metadata?.changes ?? {}) as Record<string, { from?: unknown; to?: unknown }>
            const changeLines = Object.entries(rawChanges)
              .map(([field, value]) => {
                const label = pageChangeFieldLabels[field] ?? field
                const from = formatPageChangeValue(field, value?.from, pageChangeTargetNames.teamNames)
                const to = formatPageChangeValue(field, value?.to, pageChangeTargetNames.teamNames)
                return `${label}: ${from} → ${to}`
              })
              .slice(0, 4)
            const targetFromMeta = String(item.metadata?.target_label ?? '').trim()
            const targetTitle = targetFromMeta || (item.targetType === 'player'
              ? (pageChangeTargetNames.playerNames.get(item.targetId) ?? 'Неизвестный игрок')
              : item.targetType === 'team'
                ? (pageChangeTargetNames.teamNames.get(item.targetId) ?? 'Неизвестная команда')
                : item.targetType === 'match'
                  ? (pageChangeTargetNames.matchNames.get(item.targetId) ?? 'Неизвестный матч')
                  : item.targetType === 'user'
                    ? `Пользователь #${item.targetId}`
                    : `${pageChangeTargetTypeLabels[item.targetType] ?? item.targetType}`)
            const title = `${pageChangeTargetTypeLabels[item.targetType] ?? item.targetType}: ${targetTitle}`
            return (
              <Link key={item.id} to={item.route || '/'} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3">
                <p className="text-sm font-semibold text-textPrimary">{title}</p>
                <p className="mt-1 text-xs text-textMuted">{formatDateTimeMsk(item.createdAt)} · {actorName}{actorUsername ? ` (@${actorUsername})` : ''}</p>
                <p className="mt-1 text-xs text-textSecondary">{item.action}</p>
                {changeLines.length ? (
                  <div className="mt-2 space-y-1">
                    {changeLines.map((line) => <p key={line} className="text-xs text-textSecondary">{line}</p>)}
                  </div>
                ) : <p className="mt-2 text-xs text-textMuted">Изменения не детализированы.</p>}
                <p className="mt-2 text-xs text-accentYellow">Открыть страницу →</p>
              </Link>
            )
          }) : <p className="text-xs text-textMuted">Ничего не найдено по текущему поиску/фильтру.</p>}
        </section>
      )}

      {section === 'favorites' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {favoriteItems.length ? favoriteItems.map((item) => (
            <Link key={item.key} to={item.route} className="matte-panel block p-3">
              <p className="text-base font-medium">{item.title}</p>
              <p className="text-sm text-textMuted">{item.subtitle}</p>
            </Link>
          )) : <p className="text-xs text-textMuted">Пока нет избранных команд и игроков.</p>}
        </section>
      )}

      {section === 'user-settings' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-textPrimary">Уведомления в Telegram</h3>
            <p className="mt-1 text-xs text-textMuted">При выключении отключаются турнирные уведомления, комментарии и события. Коды авторизации Telegram остаются активными.</p>
          </div>
          <button
            type="button"
            disabled={telegramSettingsLoading || !cabinetRepository.setTelegramNotificationsEnabled}
            onClick={async () => {
              if (!cabinetRepository.setTelegramNotificationsEnabled) return
              const next = !telegramNotificationsEnabled
              setTelegramSettingsLoading(true)
              try {
                await cabinetRepository.setTelegramNotificationsEnabled(next)
                setTelegramNotificationsEnabled(next)
                setStatus(`ok: telegram notifications ${next ? 'enabled' : 'disabled'}`)
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              } finally {
                setTelegramSettingsLoading(false)
              }
            }}
            className={`group inline-flex w-full items-center justify-between rounded-2xl border px-4 py-3 transition ${telegramNotificationsEnabled ? 'border-accentYellow/80 bg-accentYellow/10' : 'border-borderSubtle bg-mutedBg'} disabled:opacity-60`}
            aria-label={telegramNotificationsEnabled ? 'Выключить Telegram уведомления' : 'Включить Telegram уведомления'}
          >
            <span className="text-sm font-medium text-textPrimary">{telegramNotificationsEnabled ? 'Уведомления включены' : 'Уведомления выключены'}</span>
            <span className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${telegramNotificationsEnabled ? 'bg-accentYellow' : 'bg-panelSoft'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-app transition ${telegramNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </button>
        </section>
      )}

      {section === 'permissions' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-sm">
            <p className="font-semibold text-textPrimary">Доступы текущей роли</p>
            <p className="mt-1 text-textSecondary">Role: <span className="text-textPrimary">{session.user.role}</span></p>
            <p className="mt-1 text-textSecondary">Permissions count: <span className="text-textPrimary">{session.permissions.length}</span></p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <Link to="/teams" className="rounded-lg border border-borderSubtle px-3 py-2">Team actions</Link>
            <Link to="/players" className="rounded-lg border border-borderSubtle px-3 py-2">Player actions</Link>
            <Link to="/matches" className="rounded-lg border border-borderSubtle px-3 py-2">Match actions</Link>
            <Link to="/events" className="rounded-lg border border-borderSubtle px-3 py-2">Events/comments</Link>
          </div>
        </section>
      )}

      {section === 'profile-legacy' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs" onClick={async () => {
            try {
              const profile = await cabinetRepository.getMyProfile()
              setDisplayName(profile.displayName)
              setBio(profile.bio)
              setAvatarUrl(profile.avatarUrl)
              setSocialsRaw(Object.entries(profile.socials).map(([k, v]) => `${k}=${v}`).join(', '))
              setStatus('ok: profile loaded')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Load profile</button>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="display name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="avatar url" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="bio" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={socialsRaw} onChange={(e) => setSocialsRaw(e.target.value)} placeholder="telegram=https://... , instagram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.updateMyProfile({ displayName, firstName: firstName.trim(), lastName: lastName.trim(), bio, avatarUrl, socials })
              await refreshSession()
              setStatus('ok: profile updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Save profile</button>
        </section>
      )}

      {section === 'invites' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Telegram username (без @)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await teamsRepository.captainInviteByUsername?.(teamId, username)
              setStatus('ok: invite sent')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Send invite</button>
        </section>
      )}

      {(section === 'users' || section === 'users-access-management' || section === 'grant-access' || section === 'revoke-access') && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <p className="text-xs text-textMuted">Поиск пользователя по Telegram логину (поддерживается частичное совпадение, @ необязателен)</p>
          <input value={userLookupUsername} onChange={(e) => setUserLookupUsername(e.target.value)} placeholder="@telegram_username" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={!userLookupUsername.trim()} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={lookupUserByTelegram}>Найти пользователя</button>

          {userLookupResults.length > 1 && (
            <div className="space-y-2 rounded-lg border border-borderSubtle bg-mutedBg p-2">
              <p className="text-xs text-textMuted">Совпадения по Telegram:</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {userLookupResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(item)
                      setSelectedUserTeamId('')
                      setMembershipTeamId('')
                      setStatus(`ok: выбран пользователь ${item.displayName}`)
                    }}
                    className={`w-full rounded-lg border px-2 py-1 text-left text-xs ${selectedUser?.id === item.id ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textSecondary'}`}
                  >
                    {item.displayName} {item.telegramUsername ? `(@${item.telegramUsername})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedUser && (
            <div className="space-y-3 rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <p className="text-sm text-textPrimary">Выбран: <span className="font-semibold">{selectedUser.displayName}</span> {selectedUser.telegramUsername ? `(@${selectedUser.telegramUsername})` : ''}</p>
              <p className="text-xs text-textMuted">Роли: {selectedUser.statuses.join(', ') || 'guest'}</p>
              <p className="text-xs text-textMuted">Права: {selectedUserPermissions.length ? selectedUserPermissions.join(', ') : 'не назначены'}</p>

              {(canAssignCaptainRole || (selectedUser.statuses.includes('captain') && canRevokeCaptainRole)) && (
              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Капитанство</p>
                {selectedUser.statuses.includes('captain') ? (
                  <div className="space-y-2">
                    <p className="text-xs text-textSecondary">Команда: {selectedUser.teamId ? (teams ?? []).find((team) => team.id === selectedUser.teamId)?.name ?? selectedUser.teamId : 'без команды'}</p>
                    {canRevokeCaptainRole && (
                    <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={() => {
                      setConfirmDialog({
                        title: 'Снять капитанство?',
                        description: 'Пользователь потеряет роль капитана.',
                        confirmLabel: 'Снять',
                        onConfirm: async () => {
                          try {
                            await cabinetRepository.adminRevokeCaptainRole?.(selectedUser.id)
                            setSelectedUser({ ...selectedUser, statuses: selectedUser.statuses.filter((role) => role !== 'captain') })
                            setStatus('ok: captain rights revoked')
                          } catch (error) {
                            setStatus(`error: ${(error as Error).message}`)
                          }
                        },
                      })
                    }}>Снять капитанство</button>
                    )}
                  </div>
                ) : (
                  canAssignCaptainRole && (
                  <div className="space-y-2">
                    <select value={selectedUserTeamId} onChange={(e) => setSelectedUserTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                      <option value="">Выберите команду</option>
                      {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={!selectedUserTeamId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={() => {
                        setConfirmDialog({
                          title: 'Назначить капитаном команды?',
                          description: 'Если у команды уже есть капитан, он будет понижен до игрока.',
                          confirmLabel: 'Назначить',
                          onConfirm: async () => {
                            try {
                              await teamsRepository.adminTransferCaptain?.(selectedUserTeamId, selectedUser.id)
                              setSelectedUser({ ...selectedUser, statuses: Array.from(new Set<UserRole>([...selectedUser.statuses, 'captain'])) })
                              setStatus('ok: captain rights granted')
                            } catch (error) {
                              setStatus(`error: ${(error as Error).message}`)
                            }
                          },
                        })
                      }}>Сделать капитаном</button>
                      <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={() => {
                        setConfirmDialog({
                          title: 'Назначить капитаном без команды?',
                          description: 'Пользователь получит роль капитана без привязки к команде.',
                          confirmLabel: 'Назначить',
                          onConfirm: async () => {
                            try {
                              await cabinetRepository.adminAssignCaptainRole?.(selectedUser.id)
                              setSelectedUser({ ...selectedUser, statuses: Array.from(new Set<UserRole>([...selectedUser.statuses, 'captain'])) })
                              setStatus('ok: captain role assigned without team')
                            } catch (error) {
                              setStatus(`error: ${(error as Error).message}`)
                            }
                          },
                        })
                      }}>Сделать капитаном (без команды)</button>
                    </div>
                  </div>
                  )
                )}
              </div>
              )}

              {(canAssignPlayerRole || canRevokePlayerRole || canManageArchive) && (
              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Профиль игрока</p>
                {selectedUser.statuses.includes('player') ? (
                  <div className="flex flex-wrap gap-2">
                    {canRevokePlayerRole && (
                    <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={() => {
                      setConfirmDialog({
                        title: 'Удалить профиль игрока?',
                        description: 'Профиль игрока будет отвязан от пользователя и роль игрока будет снята.',
                        confirmLabel: 'Удалить',
                        onConfirm: async () => {
                          try {
                            await cabinetRepository.adminRemovePlayerFromUser?.(selectedUser.id)
                            setSelectedUser({ ...selectedUser, statuses: selectedUser.statuses.filter((role) => role !== 'player') })
                            setStatus('ok: player profile detached from user')
                          } catch (error) {
                            setStatus(`error: ${(error as Error).message}`)
                          }
                        },
                      })
                    }}>Удалить профиль игрока</button>
                    )}
                    {canManageArchive && (
                    <button type="button" disabled={!selectedUser.playerId} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={() => {
                      if (!selectedUser.playerId) return
                      setConfirmDialog({
                        title: 'Скрыть профиль игрока?',
                        description: 'Профиль игрока будет скрыт из публичных списков.',
                        confirmLabel: 'Скрыть',
                        onConfirm: async () => {
                          try {
                            await playersRepository.adminArchivePlayer?.(selectedUser.playerId!, true)
                            setStatus('ok: player profile hidden')
                          } catch (error) {
                            setStatus(`error: ${(error as Error).message}`)
                          }
                        },
                      })
                    }}>Скрыть профиль игрока</button>
                    )}
                    {canAssignPlayerRole && (
                      <>
                    <select value={membershipTeamId} onChange={(e) => setMembershipTeamId(e.target.value)} className="min-w-44 rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                      <option value="">Команда для переноса</option>
                      {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                    </select>
                    <button type="button" disabled={!membershipTeamId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={() => {
                      setConfirmDialog({
                        title: 'Перенести игрока в другую команду?',
                        description: 'Профиль игрока будет сразу переведен в выбранную команду.',
                        confirmLabel: 'Перенести',
                        onConfirm: async () => {
                          try {
                            await cabinetRepository.adminAssignPlayerRole?.(selectedUser.id, membershipTeamId)
                            setSelectedUser({ ...selectedUser, teamId: membershipTeamId })
                            setStatus('ok: игрок переведен в новую команду')
                          } catch (error) {
                            setStatus(`error: ${(error as Error).message}`)
                          }
                        },
                      })
                    }}>Перенести в другую команду</button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-textSecondary">Профиль игрока не найден.</p>
                    {!selectedUser.statuses.includes('captain') && canAssignPlayerRole && (
                      <>
                        <select value={membershipTeamId} onChange={(e) => setMembershipTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                          <option value="">Команда для приглашения</option>
                          {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                        </select>
                        <button type="button" disabled={!membershipTeamId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={() => {
                          setConfirmDialog({
                            title: 'Сделать игроком команды?',
                            description: 'Пользователь получит роль игрока и будет привязан к выбранной команде.',
                            confirmLabel: 'Назначить',
                            onConfirm: async () => {
                              try {
                                await cabinetRepository.adminAssignPlayerRole?.(selectedUser.id, membershipTeamId)
                                setSelectedUser({ ...selectedUser, statuses: Array.from(new Set<UserRole>([...selectedUser.statuses, 'player'])), teamId: membershipTeamId })
                                setStatus('ok: роль игрока назначена')
                              } catch (error) {
                                setStatus(`error: ${(error as Error).message}`)
                              }
                            },
                          })
                        }}>Назначить игроком</button>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}

              {(isSuperadminActor || canManageAdminPermissions) && (
              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Администратор</p>
                <div className="flex flex-wrap gap-2">
                  {isSuperadminActor && (
                  <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
                    setConfirmDialog({
                      title: selectedUser.statuses.includes('admin') ? 'Снять роль администратора?' : 'Выдать роль администратора?',
                      description: selectedUser.statuses.includes('admin')
                        ? 'Пользователь потеряет административный доступ.'
                        : 'Пользователь получит административный доступ.',
                      confirmLabel: selectedUser.statuses.includes('admin') ? 'Снять' : 'Выдать',
                      onConfirm: async () => {
                        try {
                          const nextRoles = selectedUser.statuses.includes('admin')
                            ? selectedUser.statuses.filter((role) => role !== 'admin')
                            : Array.from(new Set<UserRole>([...selectedUser.statuses, 'admin']))
                          await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: nextRoles.length ? nextRoles : ['guest'] })
                          if (!selectedUser.statuses.includes('admin')) {
                            await cabinetRepository.superadminAssignPermissions({ userId: selectedUser.id, permissions: selectedUserPermissions })
                          }
                          setStatus(selectedUser.statuses.includes('admin') ? 'ok: admin rights revoked' : 'ok: admin rights granted')
                          setSelectedUser({ ...selectedUser, statuses: nextRoles.length ? nextRoles : ['guest'] })
                        } catch (error) {
                          setStatus(`error: ${(error as Error).message}`)
                        }
                      },
                    })
                  }}>{selectedUser.statuses.includes('admin') ? 'Снять роль администратора' : 'Выдать роль администратора'}</button>
                  )}
                  {(isSuperadminActor || (canManageAdminPermissions && selectedUser.statuses.includes('admin') && !selectedUser.statuses.includes('superadmin'))) && (
                  <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
                    setConfirmDialog({
                      title: 'Сохранить точечные права?',
                      description: 'Набор включенных свитчей будет записан пользователю.',
                      confirmLabel: 'Сохранить',
                      onConfirm: async () => {
                        try {
                          await cabinetRepository.superadminAssignPermissions({ userId: selectedUser.id, permissions: selectedUserPermissions })
                          setSelectedUser({ ...selectedUser, permissions: selectedUserPermissions })
                          setStatus('ok: permissions assigned')
                        } catch (error) {
                          setStatus(`error: ${(error as Error).message}`)
                        }
                      },
                    })
                  }}>Сохранить права</button>
                  )}
                </div>
                {!(isSuperadminActor || (canManageAdminPermissions && selectedUser.statuses.includes('admin') && !selectedUser.statuses.includes('superadmin'))) && (
                  <p className="text-xs text-textMuted">Можно менять права только у пользователей с ролью <code>admin</code> (без <code>superadmin</code>).</p>
                )}
                {(isSuperadminActor || (canManageAdminPermissions && selectedUser.statuses.includes('admin') && !selectedUser.statuses.includes('superadmin'))) && (
                <div className="mt-2 space-y-2">
                  {granularAdminPermissions
                    .filter((permission) => !permission.superadminOnly || currentRoles.some((role) => roleRank[role] >= roleRank.superadmin))
                    .map((permission) => {
                      const enabled = selectedUserPermissions.includes(permission.key)
                      return (
                        <button
                          key={permission.key}
                          type="button"
                          onClick={() => setSelectedUserPermissions((prev) => (prev.includes(permission.key) ? prev.filter((item) => item !== permission.key) : [...prev, permission.key]))}
                          className={`group inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${enabled ? 'border-accentYellow/80 bg-accentYellow/10 text-textPrimary' : 'border-borderSubtle bg-mutedBg text-textSecondary'}`}
                        >
                          <span>{permission.label}</span>
                          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${enabled ? 'bg-accentYellow' : 'bg-panelSoft'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-app transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </span>
                        </button>
                      )
                    })}
                </div>
                )}
              </div>
              )}
            </div>
          )}
        </section>
      )}

      {section === 'team-socials' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={teamSocialsRaw} onChange={(e) => setTeamSocialsRaw(e.target.value)} placeholder="telegram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await teamsRepository.captainUpdateSocials?.(teamId, teamSocials)
              setStatus('ok: team socials updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Update socials</button>
        </section>
      )}

      {section === 'roster' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-sm text-textSecondary">Управление составом выполняется на странице команды в режиме состава: у каждого игрока доступны кнопки «глаз», «карандаш», «крестик».</p>
          <div className="flex flex-wrap gap-2">
            <Link to={managedTeamId ? `/teams/${managedTeamId}/roster` : '/teams'} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app">Открыть состав команды</Link>
            <Link to="/players" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">Все игроки</Link>
          </div>
        </section>
      )}

      {section === 'team-events' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-sm text-textSecondary">Откроется лента событий команды. Кнопка «Создать событие» и действия редактирования/удаления видны только капитану этой команды и администраторам.</p>
          <Link to={managedTeamId ? `/teams/${managedTeamId}/events` : '/events'} className="inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app">Открыть события команды</Link>
        </section>
      )}

      {section === 'tournament' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <div className="rounded-xl border border-accentYellow/30 bg-accentYellow/5 p-3">
            <p className="text-sm font-semibold text-accentYellow">Tournament administration</p>
            <p className="text-xs text-textMuted mt-1">Отдельные секции: создание турнира, выбор активного и настройки плейофф-сетки.</p>
            {selectedCycleId && <p className="mt-1 text-xs text-textSecondary">Активный контекст: tournament #{selectedCycleId}</p>}
          </div>

          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-xs text-textSecondary">
            <p>Команды и игроки сохраняются между турнирами. Матчи, сетка и таблица относятся к выбранному tournament cycle.</p>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs font-semibold text-textPrimary">1) Список турниров и выбор активного</p>
            {!tournamentCycles.length ? (
              <p className="text-xs text-textMuted">Пока нет данных о циклах турнира.</p>
            ) : (
              <div className="space-y-2">
                {tournamentCycles.map((cycle) => (
                  <div key={cycle.id} className="flex items-center justify-between rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs">
                    <div>
                      <p className="text-textPrimary">{cycle.name}</p>
                      <p className="text-textMuted">Bracket size: {cycle.bracketTeamCapacity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cycle.isActive && <span className="rounded-full border border-emerald-700/40 px-2 py-0.5 text-[10px] text-emerald-300">active</span>}
                      {!cycle.isActive && (
                        <>
                          <button
                            type="button"
                            className="rounded border border-borderSubtle px-2 py-1"
                            onClick={async () => {
                              try {
                                await cabinetRepository.setActiveTournamentCycle?.(cycle.id)
                                const refreshed = await cabinetRepository.getTournamentCycles?.()
                                if (refreshed?.length) setTournamentCycles(refreshed)
                                setSelectedCycleId(cycle.id)
                                setStatus('ok: active tournament switched')
                              } catch (error) {
                                setStatus(`error: ${(error as Error).message}`)
                              }
                            }}
                          >
                            Сделать активным
                          </button>
                          <button
                            type="button"
                            className="rounded border border-red-700/40 px-2 py-1 text-red-300"
                            onClick={async () => {
                              setConfirmDialog({
                                title: `Удалить турнир «${cycle.name}»?`,
                                description: 'Его матчи будут перенесены в другой турнир.',
                                confirmLabel: 'Удалить',
                                onConfirm: async () => {
                                  try {
                                    await cabinetRepository.deleteTournamentCycle?.(cycle.id)
                                    const refreshed = await cabinetRepository.getTournamentCycles?.()
                                    if (refreshed?.length) {
                                      setTournamentCycles(refreshed)
                                      const active = refreshed.find((item) => item.isActive) ?? refreshed[0]
                                      if (active) {
                                        setSelectedCycleId(active.id)
                                        setBracketCapacityDraft(active.bracketTeamCapacity)
                                      }
                                    } else {
                                      setTournamentCycles([])
                                      setSelectedCycleId('')
                                    }
                                    setStatus('ok: tournament cycle deleted')
                                  } catch (error) {
                                    setStatus(`error: ${(error as Error).message}`)
                                  }
                                },
                              })
                            }}
                          >
                            Удалить
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs font-semibold text-textPrimary">2) Создание турнира (cycle)</p>
            <input value={newCycleName} onChange={(e) => setNewCycleName(e.target.value)} placeholder="Название цикла (например: Сезон 2027)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <select value={newCycleCapacity} onChange={(e) => setNewCycleCapacity(Number(e.target.value) as 4 | 8 | 16 | 32)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              {[4, 8, 16, 32].map((size) => <option key={size} value={size}>{size} команд в сетке</option>)}
            </select>
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                const trimmedName = newCycleName.trim()
                await cabinetRepository.createTournamentCycle?.({ name: trimmedName || `Сезон ${new Date().getFullYear()}`, bracketTeamCapacity: newCycleCapacity, isActive: false })
                const refreshed = await cabinetRepository.getTournamentCycles?.()
                if (refreshed?.length) setTournamentCycles(refreshed)
                setStatus('ok: tournament cycle created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Создать турнир</button>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs font-semibold text-textPrimary">3) Настройки сетки турнира</p>
            <select value={selectedCycleId} onChange={(e) => {
              const nextId = e.target.value
              setSelectedCycleId(nextId)
              const selected = tournamentCycles.find((item) => item.id === nextId)
              if (selected) setBracketCapacityDraft(selected.bracketTeamCapacity)
            }} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Выберите турнир</option>
              {tournamentCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
            </select>
            <select value={bracketCapacityDraft} onChange={(e) => setBracketCapacityDraft(Number(e.target.value) as 4 | 8 | 16 | 32)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              {[4, 8, 16, 32].map((size) => <option key={size} value={size}>{size} команд в сетке</option>)}
            </select>
            <button type="button" disabled={!selectedCycleId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
              try {
                await cabinetRepository.updateTournamentBracketSettings?.(selectedCycleId, { teamCapacity: bracketCapacityDraft })
                const refreshed = await cabinetRepository.getTournamentCycles?.()
                if (refreshed?.length) setTournamentCycles(refreshed)
                setStatus('ok: bracket settings updated')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Сохранить настройки сетки</button>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs font-semibold text-textPrimary">4) Редактор плейофф-сетки</p>
            <p className="text-xs text-textMuted">Настройка блоков и линий выполняется через новый grid-редактор на странице «Таблица → Сетка».</p>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs text-textMuted">Current tournament admin view: teams</p>
            <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="team name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newTeamSlug} onChange={(e) => setNewTeamSlug(e.target.value)} placeholder="team slug" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} placeholder="team description" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setNewTeamLogoFile(file)
              setNewTeamLogoCrop({ x: 0, y: 0, zoom: 1 })
              setNewTeamLogoPreview(file ? URL.createObjectURL(file) : null)
            }} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs" />
            {newTeamLogoFile && newTeamLogoPreview && (
              <CircularImageCropField label="Кроп логотипа (круг)" imageUrl={newTeamLogoPreview} crop={newTeamLogoCrop} onChange={setNewTeamLogoCrop} />
            )}
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                const croppedLogoFile = newTeamLogoFile ? await buildCircularCropUploadFile(newTeamLogoFile, newTeamLogoCrop) : null
                const logoUrl = croppedLogoFile ? (await uploadsRepository.uploadImage(croppedLogoFile)).url : undefined
                await teamsRepository.createTeam?.({ name: newTeamName, slug: newTeamSlug, description: newTeamDescription, logoUrl })
                setStatus('ok: team created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create team</button>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs text-textMuted">Current tournament admin view: players</p>
            <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerUserId} onChange={(e) => setNewPlayerUserId(e.target.value)} placeholder="ID пользователя (обязательно)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="full name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerPosition} onChange={(e) => setNewPlayerPosition(e.target.value)} placeholder="position" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerNumber} onChange={(e) => setNewPlayerNumber(e.target.value)} placeholder="shirt number" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setNewPlayerAvatarFile(file)
              setNewPlayerAvatarCrop({ x: 0, y: 0, zoom: 1 })
              setNewPlayerAvatarPreview(file ? URL.createObjectURL(file) : null)
            }} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs" />
            {newPlayerAvatarFile && newPlayerAvatarPreview && (
              <CircularImageCropField label="Кроп аватара (круг)" imageUrl={newPlayerAvatarPreview} crop={newPlayerAvatarCrop} onChange={setNewPlayerAvatarCrop} />
            )}
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                if (!newPlayerUserId.trim()) throw new Error('Требуется ID пользователя для создания player profile')
                const croppedAvatarFile = newPlayerAvatarFile ? await buildCircularCropUploadFile(newPlayerAvatarFile, newPlayerAvatarCrop) : null
                const avatarUrl = croppedAvatarFile ? (await uploadsRepository.uploadImage(croppedAvatarFile)).url : undefined
                await playersRepository.createPlayer?.({ userId: newPlayerUserId.trim(), teamId, fullName: newPlayerName, position: newPlayerPosition, shirtNumber: Number(newPlayerNumber) || 0, avatarUrl })
                setStatus('ok: player created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create player</button>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs text-textMuted">Матчи: admin/superadmin workflow</p>
            <select value={matchHomeTeamId} onChange={(e) => setMatchHomeTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Домашняя команда</option>
              {(teams ?? []).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select>
            <select value={matchAwayTeamId} onChange={(e) => setMatchAwayTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Гостевая команда</option>
              {(teams ?? []).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select>
            <input type="datetime-local" value={toMskDateTimeInput(matchStartAt)} onChange={(e) => setMatchStartAt(fromMskDateTimeInput(e.target.value))} placeholder="Дата и время старта" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <p className="text-[11px] text-textMuted">{toMskDisplay(matchStartAt) || '—'} (формат ДД.ММ.ГГГГ ЧЧ:ММ)</p>
            <select value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as Match['status'])} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              {matchStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={matchStage} onChange={(e) => setMatchStage(e.target.value)} placeholder="Стадия (например: 1/8)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchVenue} onChange={(e) => setMatchVenue(e.target.value)} placeholder="venue" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchReferee} onChange={(e) => setMatchReferee(e.target.value)} placeholder="Судья" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchBroadcastUrl} onChange={(e) => setMatchBroadcastUrl(e.target.value)} placeholder="Ссылка на трансляцию" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <button type="button" disabled={!isAdminScope} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
              try {
                await matchesRepository.createMatch?.({
                  homeTeamId: matchHomeTeamId,
                  awayTeamId: matchAwayTeamId,
                  startAt: matchStartAt,
                  status: matchStatus,
                  venue: matchVenue,
                  referee: matchReferee,
                  broadcastUrl: matchBroadcastUrl,
                  stage: matchStage,
                  tournamentId: selectedCycleId || undefined,
                })
                setStatus('ok: match created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create match</button>
            {!isAdminScope && <p className="text-[11px] text-textMuted">Создание матчей доступно только admin/superadmin.</p>}
          </div>
        </section>
      )}

      {section === 'create-match' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-xs text-textMuted">Матчи: admin/superadmin workflow</p>
          <select value={matchHomeTeamId} onChange={(e) => setMatchHomeTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
            <option value="">Домашняя команда</option>
            {(teams ?? []).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
          </select>
          <select value={matchAwayTeamId} onChange={(e) => setMatchAwayTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
            <option value="">Гостевая команда</option>
            {(teams ?? []).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
          </select>
          <input type="datetime-local" value={toMskDateTimeInput(matchStartAt)} onChange={(e) => setMatchStartAt(fromMskDateTimeInput(e.target.value))} placeholder="Дата и время старта" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <p className="text-[11px] text-textMuted">{toMskDisplay(matchStartAt) || '—'} (формат ДД.ММ.ГГГГ ЧЧ:ММ)</p>
          <select value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as Match['status'])} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
            {matchStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input value={matchStage} onChange={(e) => setMatchStage(e.target.value)} placeholder="Стадия (например: 1/8)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={!isAdminScope} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
            try {
              await matchesRepository.createMatch?.({ homeTeamId: matchHomeTeamId, awayTeamId: matchAwayTeamId, startAt: matchStartAt, status: matchStatus, venue: matchVenue, referee: matchReferee, broadcastUrl: matchBroadcastUrl, stage: matchStage, tournamentId: selectedCycleId || undefined })
              setStatus('ok: match created')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Create match</button>
        </section>
      )}

      {section === 'matches-archive' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-xs text-textMuted">Скрытые матчи (архив):</p>
          {archivedMatches.length === 0 ? (
            <p className="rounded-lg border border-dashed border-borderStrong bg-mutedBg px-3 py-2 text-xs text-textMuted">В архиве пока нет матчей.</p>
          ) : (
            <div className="space-y-2">
              {archivedMatches.map((item) => (
                <div key={item.id} className="rounded-lg border border-borderSubtle bg-mutedBg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-textPrimary">Матч #{item.id} • {item.date} {item.time}</p>
                    <Link to={`/matches/${item.id}`} className="text-xs text-accentYellow hover:underline">Открыть</Link>
                  </div>
                  <button type="button" className="mt-2 rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={async () => {
                    try {
                      await matchesRepository.updateMatch?.(item.id, { archived: false })
                      setStatus('ok: match restored from archive')
                      setArchivedMatches((prev) => prev.filter((match) => match.id !== item.id))
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Вернуть из архива</button>
                  <button type="button" className="mt-2 ml-2 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600" onClick={() => {
                    setDeleteArchivedMatchId(item.id)
                  }}>Удалить</button>
                </div>
              ))}
            </div>
          )}
          <ConfirmDialog
            open={Boolean(deleteArchivedMatchId)}
            title="Удалить матч из архива?"
            description="Будут удалены связанные комментарии и события матча. Действие необратимо."
            confirmLabel="Удалить"
            onCancel={() => setDeleteArchivedMatchId(null)}
            onConfirm={() => {
              if (!deleteArchivedMatchId) return
              void (async () => {
                try {
                  await matchesRepository.adminDeleteMatch?.(deleteArchivedMatchId)
                  setStatus('ok: match deleted with dependencies')
                  setArchivedMatches((prev) => prev.filter((match) => match.id !== deleteArchivedMatchId))
                } catch (error) {
                  setStatus(`error: ${(error as Error).message}`)
                } finally {
                  setDeleteArchivedMatchId(null)
                }
              })()
            }}
          />
        </section>
      )}

      {section === 'teams-archive' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-xs text-textMuted">Активные команды:</p>
          <div className="space-y-2">
            {activeTeamsForArchive.map((item) => (
              <div key={`active:${item.id}`} className="rounded-lg border border-borderSubtle bg-mutedBg p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-textPrimary">{item.name} ({item.shortName})</p>
                  <button type="button" className="rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={async () => {
                    try {
                      await teamsRepository.adminArchiveTeam?.(item.id, true)
                      setStatus('ok: team archived (related matches moved to archive)')
                      setLocallyArchivedTeamIds((prev) => prev.includes(item.id) ? prev : [...prev, item.id])
                      setArchivedTeams((prev) => prev.some((team) => team.id === item.id) ? prev : [item, ...prev])
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>В архив</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-textMuted">Скрытые команды (архив):</p>
          {archivedTeams.length === 0 ? (
            <p className="rounded-lg border border-dashed border-borderStrong bg-mutedBg px-3 py-2 text-xs text-textMuted">В архиве пока нет команд.</p>
          ) : (
            <div className="space-y-2">
              {archivedTeams.map((item) => (
                <div key={item.id} className="rounded-lg border border-borderSubtle bg-mutedBg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-textPrimary">{item.name} ({item.shortName})</p>
                    <Link to={`/teams/${item.id}`} className="text-xs text-accentYellow hover:underline">Открыть</Link>
                  </div>
                  <button type="button" className="mt-2 rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary" onClick={async () => {
                    try {
                      await teamsRepository.adminArchiveTeam?.(item.id, false)
                      setStatus('ok: team restored from archive')
                      setLocallyArchivedTeamIds((prev) => prev.filter((id) => id !== item.id))
                      setArchivedTeams((prev) => prev.filter((team) => team.id !== item.id))
                      setArchivedMatches((prev) => prev.filter((match) => match.homeTeamId !== item.id && match.awayTeamId !== item.id))
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Вернуть команду и связанные матчи</button>
                  <button type="button" className="mt-2 ml-2 rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-300" onClick={async () => {
                    setConfirmDialog({
                      title: 'Удалить команду безопасно?',
                      description: 'Команда и все игроки будут удалены, связанные пользователи понижены до guest.',
                      confirmLabel: 'Удалить',
                      onConfirm: async () => {
                        try {
                          await teamsRepository.adminDeleteTeam?.(item.id)
                          setStatus('ok: team deleted with dependencies')
                          setArchivedTeams((prev) => prev.filter((team) => team.id !== item.id))
                          setArchivedMatches((prev) => prev.filter((match) => match.homeTeamId !== item.id && match.awayTeamId !== item.id))
                        } catch (error) {
                          setStatus(`error: ${(error as Error).message}`)
                        }
                      },
                    })
                  }}>Удалить команду безопасно</button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {section === 'stats-manual-edit' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={selectedCycleId} onChange={(e) => setSelectedCycleId(e.target.value)} className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Турнир</option>
              {tournamentCycles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={statEntityType} onChange={(e) => {
              setStatEntityType(e.target.value as typeof statEntityType)
              setStatEntityId('')
              setStatEntitySearch('')
              setStatField(e.target.value === 'team' ? 'wins' : 'goals')
            }} className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="team">Команды</option>
              <option value="player">Игроки</option>
            </select>
          </div>
          <SearchField value={statEntitySearch} onChange={setStatEntitySearch} placeholder={statEntityType === 'team' ? 'Поиск команды' : 'Поиск игрока'} className="h-11 rounded-lg border border-borderSubtle bg-mutedBg" />
          <div className="space-y-2">
            {!statEntityId && (
              <p className="text-xs text-textMuted">Выберите {statEntityType === 'team' ? 'команду' : 'игрока'} карточкой ниже. Повторный клик снимает выбор.</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {filteredStatEntityOptions.map((item) => {
                const isSelected = statEntityId === item.id
                if (statEntityId && !isSelected) return null
                return (
                  <button
                    key={`${statEntityType}:${item.id}`}
                    type="button"
                    onClick={() => setStatEntityId((prev) => prev === item.id ? '' : item.id)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${isSelected ? 'border-accentYellow bg-accentYellow/10' : 'border-borderSubtle bg-mutedBg hover:border-accentYellow/40'}`}
                  >
                    <p className="text-sm font-semibold text-textPrimary">{item.label}</p>
                    <p className="mt-1 text-xs text-textMuted">{item.subtitle}</p>
                    <p className="mt-1 text-[11px] text-textMuted">ID: {item.id}</p>
                  </button>
                )
              })}
            </div>
            {filteredStatEntityOptions.length === 0 && (
              <p className="rounded-lg border border-dashed border-borderSubtle bg-mutedBg px-3 py-2 text-xs text-textMuted">
                Ничего не найдено по этому запросу.
              </p>
            )}
          </div>
          {!!statEntityId && <div className="grid gap-2 sm:grid-cols-[1fr,120px,120px,120px]">
            <select value={statField} onChange={(e) => setStatField(e.target.value)} className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              {(statEntityType === 'team' ? ['wins', 'losses', 'draws', 'goals_for', 'goals_against', 'matches'] : ['matches', 'goals', 'assists', 'yellow_cards', 'red_cards']).map((field) => <option key={field} value={field}>{field}</option>)}
            </select>
            <input type="number" min={0} step={1} value={statDelta} onChange={(e) => setStatDelta(e.target.value.replace(/[^\d]/g, ''))} className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <button type="button" disabled={!selectedCycleId || !Number(statDelta)} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={() => {
              setConfirmDialog({
                title: '⚠️ Подтвердить ручную корректировку?',
                description: 'Изменение внесет статистику в обход системы. Его можно удалить в истории изменений.',
                confirmLabel: 'Прибавить',
                onConfirm: async () => {
                  await cabinetRepository.addManualStatAdjustment?.({ tournamentId: selectedCycleId, entityType: statEntityType, entityId: statEntityId, field: statField, delta: Number(statDelta) })
                  setStatus('ok: manual adjustment added')
                },
              })
            }}>Прибавить</button>
            <button type="button" disabled={!selectedCycleId || !Number(statDelta)} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={() => {
              setConfirmDialog({
                title: '⚠️ Подтвердить ручную корректировку?',
                description: 'Изменение внесет статистику в обход системы. Его можно удалить в истории изменений.',
                confirmLabel: 'Убавить',
                onConfirm: async () => {
                  await cabinetRepository.addManualStatAdjustment?.({ tournamentId: selectedCycleId, entityType: statEntityType, entityId: statEntityId, field: statField, delta: -Number(statDelta) })
                  setStatus('ok: manual adjustment added')
                },
              })
            }}>Убавить</button>
          </div>}
          {!statEntityId && <p className="text-xs text-textMuted">Сначала выберите сущность, затем откроется блок редактирования.</p>}
          {!selectedCycleId && <p className="text-xs text-textMuted">Для сохранения корректировки нужно выбрать турнир.</p>}
        </section>
      )}

      {section === 'stats-change-history' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {statsHistory.length === 0 ? <p className="text-sm text-textMuted">История изменений пуста.</p> : statsHistory.map((item) => (
            <div key={item.id} className="rounded-lg border border-borderSubtle bg-mutedBg p-3">
              <p className="text-sm text-textPrimary">#{item.id} · {item.entityType} {item.entityId} · {item.field}: {item.delta > 0 ? '+' : ''}{item.delta}</p>
              <p className="text-xs text-textMuted">Турнир: {item.tournamentId} · Автор: {item.authorTelegramUsername ? `@${item.authorTelegramUsername}` : item.authorUserId} · {formatDateTimeMsk(item.createdAt)}</p>
              <button type="button" className="mt-2 rounded-lg border border-red-700/50 px-3 py-1.5 text-xs text-red-300" onClick={() => {
                setConfirmDialog({
                  title: 'Удалить изменение?',
                  description: 'Корректировка будет удалена из истории и перестанет влиять на статистику.',
                  confirmLabel: 'Удалить',
                  onConfirm: async () => {
                    await cabinetRepository.deleteManualStatAdjustment?.(item.id)
                    setStatus('ok: manual adjustment removed')
                  },
                })
              }}>Удалить</button>
            </div>
          ))}
        </section>
      )}

      {section === 'moderation' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={commentId} onChange={(e) => setCommentId(e.target.value)} placeholder="comment id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            setConfirmDialog({
              title: 'Удалить комментарий?',
              description: `Комментарий #${commentId || '—'} будет скрыт модератором.`,
              confirmLabel: 'Удалить',
              onConfirm: async () => {
                try {
                  await cabinetRepository.adminModerateComment(commentId)
                  setStatus('ok: comment moderated')
                } catch (error) {
                  setStatus(`error: ${(error as Error).message}`)
                }
              },
            })
          }}>Moderate delete</button>
        </section>
      )}

      {(section === 'admins-list' || section === 'captains-list' || section === 'ban-list') && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          {userAccessRows.length === 0 ? (
            <p className="text-sm text-textMuted">Нет данных для отображения.</p>
          ) : (
            userAccessRows
              .filter((item) => {
                if (section === 'admins-list') return item.roles.includes('admin') || item.roles.includes('superadmin')
                if (section === 'captains-list') return item.roles.includes('captain')
                return item.restrictions.length > 0
              })
              .map((item) => (
                <article key={`access:${item.id}`} className="rounded-lg border border-borderSubtle bg-mutedBg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-textPrimary">{item.displayName}{item.telegramUsername ? ` (@${item.telegramUsername})` : ''}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${item.isOnline ? 'border-emerald-700/40 text-emerald-300' : 'border-borderSubtle text-textMuted'}`}>
                      {item.isOnline ? 'online' : 'offline'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-textSecondary">Роли: {item.roles.join(', ') || 'guest'}</p>
                  <p className="mt-1 text-xs text-textSecondary">Ограничения: {item.restrictions.length ? item.restrictions.join(', ') : 'нет'}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link to={`/users/${item.id}`} className="text-accentYellow hover:underline">Профиль пользователя</Link>
                    {item.playerId && <Link to={`/players/${item.playerId}`} className="text-accentYellow hover:underline">Профиль игрока</Link>}
                    {item.teamId && <Link to={`/teams/${item.teamId}`} className="text-accentYellow hover:underline">Команда</Link>}
                  </div>
                </article>
              ))
          )}
        </section>
      )}

      {(section === 'comment-blocks' || section === 'issue-restriction') && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {section === 'issue-restriction' && (
            <>
              <input value={userLookupUsername} onChange={(e) => setUserLookupUsername(e.target.value)} placeholder="@telegram_username" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
              <button type="button" disabled={!userLookupUsername.trim().startsWith('@')} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                const found = await lookupUserByTelegram()
                if (found) setBlockedUserId(found.id)
              }}>Найти и подставить user id</button>
            </>
          )}
          <input value={blockedUserId} onChange={(e) => setBlockedUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <label className="text-xs text-textSecondary flex items-center gap-2"><input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} /> permanent</label>
          <input type="datetime-local" value={toMskDateTimeInput(Number(untilUnix) > 0 ? new Date(Number(untilUnix) * 1000).toISOString() : '')} onChange={(e) => {
            const iso = fromMskDateTimeInput(e.target.value)
            setUntilUnix(iso ? String(Math.floor(new Date(iso).getTime() / 1000)) : '0')
          }} placeholder="Срок блока" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <p className="text-[11px] text-textMuted">До: {Number(untilUnix) > 0 ? toMskDisplay(new Date(Number(untilUnix) * 1000).toISOString()) : 'без срока'}</p>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина ограничения" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.adminBlockComments({ userId: blockedUserId, permanent, untilUnix: Number(untilUnix) || 0, reason })
              setStatus('ok: comments blocked')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Apply block</button>
        </section>
      )}

      {section === 'roles' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={rolesRaw} onChange={(e) => setRolesRaw(e.target.value)} placeholder="captain,admin" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminAssignRoles({ userId: targetUserId, roles: parseCSV(rolesRaw) as UserRole[] })
              setStatus('ok: roles assigned')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Assign roles</button>
        </section>
      )}

      {section === 'rbac' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={permissionsRaw} onChange={(e) => setPermissionsRaw(e.target.value)} placeholder="perm1,perm2" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminAssignPermissions({ userId: targetUserId, permissions: parseCSV(permissionsRaw) })
              setStatus('ok: permissions assigned')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Assign permissions</button>
        </section>
      )}

      {section === 'restrictions' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={restrictionsRaw} onChange={(e) => setRestrictionsRaw(e.target.value)} placeholder="restriction1,restriction2" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminAssignRestrictions({ userId: targetUserId, restrictions: parseCSV(restrictionsRaw) })
              setStatus('ok: restrictions assigned')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Assign restrictions</button>
        </section>
      )}

      {section === 'settings' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {roleRank[session.user.role] < roleRank.superadmin && (
            <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-xs text-textSecondary">
              Personal settings mode: глобальные platform settings доступны только superadmin.
            </div>
          )}
          <input value={settingKey} onChange={(e) => setSettingKey(e.target.value)} placeholder="setting key" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={settingValueRaw} onChange={(e) => setSettingValueRaw(e.target.value)} placeholder='{"key":"value"}' className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminSetGlobalSetting({ key: settingKey, value: JSON.parse(settingValueRaw) as Record<string, unknown> })
              setStatus('ok: setting updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Update setting</button>
        </section>
      )}

      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? 'Подтвердите действие'}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Подтвердить'}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          if (!confirmDialog) return
          await confirmDialog.onConfirm()
          setConfirmDialog(null)
        }}
      />

      {!['profile', 'profile-settings', 'edit', 'activity', 'my-user', 'my-actions', 'my-notifications', 'favorites', 'user-settings', 'player-profile', 'my-player', 'player-events', 'team', 'my-team', 'invites', 'users', 'users-access-management', 'grant-access', 'revoke-access', 'issue-restriction', 'admins-list', 'captains-list', 'ban-list', 'create-match', 'page-change-history', 'matches-archive', 'teams-archive', 'tournament-management', 'stats-manual-edit', 'stats-change-history', 'team-socials', 'roster', 'team-events', 'tournament', 'moderation', 'comment-blocks', 'roles', 'rbac', 'restrictions', 'settings'].includes(section) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary">
          Раздел синхронизирован по правам доступа и готов к расширению бизнес-формами.
        </section>
      )}
    </PageContainer>
  )
}
