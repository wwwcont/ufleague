import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, LayoutPanelTop } from 'lucide-react'
import type { Match, PublicUserCard, UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { useTeams } from '../../hooks/data/useTeams'

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
  'my-actions': 'player',
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
  'grant-access': 'admin',
  'revoke-access': 'admin',
  'issue-restriction': 'admin',
  'create-match': 'admin',
  'team-socials': 'captain',
  roster: 'captain',
  moderation: 'admin',
  'comment-blocks': 'admin',
  tournament: 'captain',
  roles: 'superadmin',
  rbac: 'superadmin',
  restrictions: 'superadmin',
  settings: 'guest',
}

const sectionMeta: Record<string, { title: string; description: string; tips: string[] }> = {
  profile: { title: 'Мой профиль', description: 'Редактирование карточки аккаунта и контактов.', tips: ['Проверьте ФИО и дату рождения.', 'Обновите bio и ссылку на аватар.'] },
  'profile-settings': { title: 'Настройки профиля', description: 'Безопасное обновление user/player profile.', tips: ['Форма автоматически загружается из backend.', 'Сохранение отправляет merged payload, чтобы не затирать данные.'] },
  edit: { title: 'Редактирование профиля', description: 'Рабочая форма профиля пользователя.', tips: ['Используйте загрузку данных перед сохранением.', 'Поля socials поддерживают key=value.'] },
  activity: { title: 'Моя активность', description: 'Работа с комментариями и реакциями.', tips: ['Откройте сущность и оставьте комментарий.', 'Проверьте ограничения доступа в реальном потоке.'] },
  'my-user': { title: 'Профиль пользователя', description: 'Быстрый переход в карточку пользователя.', tips: ['Открывается ваш user-профиль.', 'Редактирование доступно владельцу.'] },
  'my-actions': { title: 'Мои действия', description: 'Лента действий пользователя.', tips: ['События сортируются по времени.', 'Каждый элемент ведет к месту действия.'] },
  'user-settings': { title: 'Настройки', description: 'Персональные настройки пользователя.', tips: ['Секция подготовлена под будущий функционал.'] },
  'player-profile': { title: 'Профиль игрока', description: 'Игровой профиль пользователя (отдельно от user-профиля).', tips: ['Переходите в user-профиль для ФИО/био.', 'Проверяйте связь user ↔ player profile.'] },
  'my-player': { title: 'Профиль игрока', description: 'Мгновенный переход в профиль игрока.', tips: ['Используется playerProfileId из сессии.', 'Если profile не привязан — показывается сообщение.'] },
  'player-events': { title: 'Мои события', description: 'Все события, связанные с профилем игрока.', tips: ['События открываются на странице игрока.', 'Используйте фильтр по игроку в ленте.'] },
  'player-media': { title: 'Player media', description: 'Фото и медиа-поля профиля игрока.', tips: ['Используйте изображения с доступным URL.', 'Сохраняйте медиа отдельно от спортивных данных.'] },
  team: { title: 'Управление командой', description: 'Создание команды и переход к разделам капитана.', tips: ['Если команды нет — показать создание.', 'Если есть команда — только Состав и Лента событий.'] },
  'my-team': { title: 'Моя команда', description: 'Мгновенный переход на страницу команды.', tips: ['Если команда не найдена — открыть список команд.', 'Для капитана учитывается передача капитанства.'] },
  invites: { title: 'Приглашения', description: 'Приглашение игроков в команду.', tips: ['Укажите корректный ID команды.', 'Username вводится без @.'] },
  users: { title: 'Пользователи', description: 'Управление captain/admin правами и team membership.', tips: ['Поиск только по Telegram @username.', 'Destructive actions требуют подтверждения.'] },
  'grant-access': { title: 'Выдать права', description: 'Выдача ролей по Telegram-логину.', tips: ['Сначала найдите пользователя по @username.', 'Кнопка выдачи admin доступна только superadmin.'] },
  'revoke-access': { title: 'Забрать права', description: 'Снятие captain/admin прав.', tips: ['Сначала найдите пользователя по @username.', 'Действие требует подтверждения.'] },
  'issue-restriction': { title: 'Выдать ограничение', description: 'Ограничение комментирования пользователя.', tips: ['Укажите причину ограничения.', 'Можно выдать постоянный или временный блок.'] },
  'create-match': { title: 'Создать матч', description: 'Быстрое создание матча турнира.', tips: ['Выберите домашнюю и гостевую команды.', 'Проверьте RFC3339 для даты старта.'] },
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

const parseCSV = (raw: string) => raw.split(',').map((item) => item.trim()).filter(Boolean)

const statusTone = (status: string) => status.startsWith('ok:') ? 'text-emerald-300' : 'text-rose-300'

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

export const CabinetSectionPage = () => {
  const { section } = useParams()
  const navigate = useNavigate()
  const { session, refreshSession } = useSession()
  const { cabinetRepository, teamsRepository, playersRepository, matchesRepository, uploadsRepository, usersRepository } = useRepositories()
  const { data: teams } = useTeams()

  const [status, setStatus] = useState('')
  const [myActions, setMyActions] = useState<Array<{ id: string; action: string; targetType: string; targetId: string; route: string; createdAt: string; metadata?: Record<string, unknown> }>>([])

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
  const [selectedUserTeamId, setSelectedUserTeamId] = useState('')
  const [grantTeamCreate, setGrantTeamCreate] = useState(false)
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
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerUserId, setNewPlayerUserId] = useState('')
  const [newPlayerPosition, setNewPlayerPosition] = useState('MF')
  const [newPlayerNumber, setNewPlayerNumber] = useState('10')
  const [newPlayerAvatarFile, setNewPlayerAvatarFile] = useState<File | null>(null)
  const [matchHomeTeamId, setMatchHomeTeamId] = useState('')
  const [matchAwayTeamId, setMatchAwayTeamId] = useState('')
  const [matchStartAt, setMatchStartAt] = useState('')
  const [matchStatus, setMatchStatus] = useState<Match['status']>('scheduled')
  const [matchVenue, setMatchVenue] = useState('')
  const [matchReferee, setMatchReferee] = useState('')
  const [matchBroadcastUrl, setMatchBroadcastUrl] = useState('')
  const [matchStage, setMatchStage] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState<null | { displayName: string; firstName: string; lastName: string; bio: string; avatarUrl: string; socials: Record<string, string> }>(null)
  const [tournamentCycles, setTournamentCycles] = useState<Array<{ id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }>>([])
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [newCycleName, setNewCycleName] = useState('')
  const [newCycleCapacity, setNewCycleCapacity] = useState<4 | 8 | 16 | 32>(16)
  const [bracketCapacityDraft, setBracketCapacityDraft] = useState<4 | 8 | 16 | 32>(16)

  const currentRoles = useMemo<UserRole[]>(
    () => (session.user.roles?.length ? session.user.roles : [session.user.role]),
    [session.user.role, session.user.roles],
  )
  const minRole = section ? sectionRoles[section] : null
  const meta = section ? sectionMeta[section] : null
  const allowed = minRole ? currentRoles.some((role) => roleRank[role] >= roleRank[minRole]) : false
  const managedTeamId = useMemo(() => {
    if (session.user.teamId) return session.user.teamId
    const captainTeam = (teams ?? []).find((item) => item.captainUserId === session.user.id)
    return captainTeam?.id
  }, [session.user.id, session.user.teamId, teams])

  const isAdminScope = currentRoles.some((role) => roleRank[role] >= roleRank.admin)

  useEffect(() => {
    if (section !== 'tournament') return
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
        route: item.route || '/',
        metadata: item.metadata,
      })))
    }).catch(() => setMyActions([]))
  }, [cabinetRepository, navigate, section, session.isAuthenticated])

  const lookupUserByTelegram = async () => {
    const login = userLookupUsername.trim()
    if (!login.startsWith('@')) {
      setStatus('error: укажите Telegram логин в формате @username')
      return null
    }
    try {
      const found = await usersRepository.findByTelegramUsername?.(login)
      if (!found) {
        setSelectedUser(null)
        setStatus('error: пользователь не найден')
        return null
      }
      setSelectedUser(found)
      setStatus(`ok: выбран пользователь ${found.displayName}`)
      return found
    } catch (error) {
      setStatus(`error: ${(error as Error).message}`)
      return null
    }
  }

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
            <p className="mt-1 text-xs text-textMuted">Минимальная роль: {minRole}. Активные роли: {currentRoles.join(', ')}.</p>
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
          <span className="rounded-full border border-borderSubtle px-2 py-0.5 text-[11px] text-textMuted">min role: {minRole}</span>
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
          <input value={birthDate} onChange={(e) => setBirthDate(e.target.value)} placeholder="Дата рождения (ДД.ММ.ГГГГ)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
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
              <Link key={item.id} to={item.route} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3">
                <p className="text-sm font-semibold text-textPrimary">{title}</p>
                <p className="mt-1 text-xs text-textMuted">
                  {new Date(item.createdAt).toLocaleString('ru-RU')} · {item.targetType}:{item.targetId}
                </p>
                {reactionType === 'like' && <p className="mt-2 text-xs text-emerald-300">👍 Лайк</p>}
                {reactionType === 'dislike' && <p className="mt-2 text-xs text-rose-300">👎 Дизлайк</p>}
                {details && <p className="mt-2 text-xs text-textSecondary">{details}</p>}
                <p className="mt-2 text-xs text-accentYellow">Перейти к месту действия →</p>
              </Link>
            )
          }) : <p className="text-xs text-textMuted">Пока нет действий.</p>}
        </section>
      )}

      {section === 'user-settings' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4">
          <p className="text-sm text-textSecondary">Настройки пользователя появятся в следующем релизе.</p>
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

      {(section === 'users' || section === 'grant-access' || section === 'revoke-access') && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <p className="text-xs text-textMuted">Поиск пользователя (обязателен Telegram @username)</p>
          <input value={userLookupUsername} onChange={(e) => setUserLookupUsername(e.target.value)} placeholder="@telegram_username" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={!userLookupUsername.trim().startsWith('@')} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={lookupUserByTelegram}>Найти пользователя</button>

          {selectedUser && (
            <div className="space-y-3 rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <p className="text-sm text-textPrimary">Выбран: <span className="font-semibold">{selectedUser.displayName}</span> {selectedUser.telegramUsername ? `(@${selectedUser.telegramUsername})` : ''}</p>

              {section !== 'revoke-access' && (
                <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                  <p className="text-xs text-textMuted">Сделать капитаном (выберите команду)</p>
                  <select value={selectedUserTeamId} onChange={(e) => setSelectedUserTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                    <option value="">Выберите команду</option>
                    {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-textSecondary">
                    <input type="checkbox" checked={grantTeamCreate} onChange={(e) => setGrantTeamCreate(e.target.checked)} />
                    Разрешить создание команды
                  </label>
                  <button type="button" disabled={!selectedUserTeamId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                    try {
                      await teamsRepository.adminTransferCaptain?.(selectedUserTeamId, selectedUser.id)
                      if (grantTeamCreate && currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)) {
                        await cabinetRepository.superadminAssignPermissions({ userId: selectedUser.id, permissions: ['tournament.team.create'] })
                      }
                      setStatus('ok: captain rights granted')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Сделать капитаном</button>
                  <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={async () => {
                    try {
                      await cabinetRepository.adminAssignCaptainRole?.(selectedUser.id)
                      setStatus('ok: captain role assigned without team')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Сделать капитаном без команды</button>
                </div>
              )}

              {section !== 'revoke-access' && (
                <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                  <p className="text-xs text-textMuted">Сделать игроком (привязать к команде)</p>
                  <select value={membershipTeamId} onChange={(e) => setMembershipTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                  <option value="">Команда для приглашения/добавления</option>
                  {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                  </select>
                  <button type="button" disabled={!membershipTeamId || !selectedUser.telegramUsername} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                    try {
                      await teamsRepository.captainInviteByUsername?.(membershipTeamId, selectedUser.telegramUsername ?? userLookupUsername.replace(/^@/, ''))
                      await playersRepository.createPlayer?.({ userId: selectedUser.id, teamId: membershipTeamId, fullName: selectedUser.displayName, position: 'MF', shirtNumber: 0 })
                      setStatus('ok: player role assigned and linked to team')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Сделать игроком</button>
                </div>
              )}

              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Администратор</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={section === 'revoke-access' || !currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                    try {
                      await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: ['admin'] })
                      setStatus('ok: admin rights granted')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Сделать администратором</button>
                  <button type="button" disabled={section === 'grant-access' || !currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Снять admin права у пользователя?')) return
                    try {
                      await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: ['player'] })
                      setStatus('ok: admin rights revoked')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Снять admin права</button>
                  <button type="button" disabled={section === 'grant-access' || !currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Снять captain/admin права у пользователя?')) return
                    try {
                      await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: ['player'] })
                      setStatus('ok: elevated rights revoked')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Снять captain/admin права</button>
                  <button type="button" disabled={section === 'grant-access'} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Удалить player профиль у пользователя и снять role player?')) return
                    try {
                      await cabinetRepository.adminRemovePlayerFromUser?.(selectedUser.id)
                      setStatus('ok: player profile detached from user')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Удалить player у юзера</button>
                </div>
              </div>
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
                await cabinetRepository.createTournamentCycle?.({ name: newCycleName || `Сезон ${new Date().getFullYear()}`, bracketTeamCapacity: newCycleCapacity, isActive: false })
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
            <input type="file" accept="image/*" onChange={(e) => setNewTeamLogoFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs" />
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                const logoUrl = newTeamLogoFile ? (await uploadsRepository.uploadImage(newTeamLogoFile)).url : undefined
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
            <input type="file" accept="image/*" onChange={(e) => setNewPlayerAvatarFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs" />
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                if (!newPlayerUserId.trim()) throw new Error('Требуется ID пользователя для создания player profile')
                const avatarUrl = newPlayerAvatarFile ? (await uploadsRepository.uploadImage(newPlayerAvatarFile)).url : undefined
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
            <input value={matchStartAt} onChange={(e) => setMatchStartAt(e.target.value)} placeholder="Дата и время старта (RFC3339)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as typeof matchStatus)} placeholder="status" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
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
          <input value={matchStartAt} onChange={(e) => setMatchStartAt(e.target.value)} placeholder="Дата и время старта (RFC3339)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as typeof matchStatus)} placeholder="status" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
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

      {section === 'moderation' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={commentId} onChange={(e) => setCommentId(e.target.value)} placeholder="comment id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.adminModerateComment(commentId)
              setStatus('ok: comment moderated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Moderate delete</button>
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
          <input value={untilUnix} onChange={(e) => setUntilUnix(e.target.value)} placeholder="until unix" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
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

      {status && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm">
          <p className={`flex items-center gap-2 ${statusTone(status)}`}><CheckCircle2 size={14} /> {status}</p>
          <Link to="/profile" className="mt-2 inline-flex text-sm text-accentYellow">← Назад в кабинет</Link>
        </section>
      )}

      {!['profile', 'profile-settings', 'edit', 'activity', 'my-user', 'my-actions', 'user-settings', 'player-profile', 'my-player', 'player-events', 'team', 'my-team', 'invites', 'users', 'grant-access', 'revoke-access', 'issue-restriction', 'create-match', 'team-socials', 'roster', 'team-events', 'tournament', 'moderation', 'comment-blocks', 'roles', 'rbac', 'restrictions', 'settings'].includes(section) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary">
          Раздел синхронизирован по правам доступа и готов к расширению бизнес-формами.
        </section>
      )}
    </PageContainer>
  )
}
