import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight, LayoutPanelTop } from 'lucide-react'
import type { Match, PublicUserCard, UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { useBracket } from '../../hooks/data/useBracket'
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
  reactions: 'guest',
  'player-profile': 'player',
  'player-events': 'player',
  'player-media': 'player',
  team: 'player',
  'team-events': 'captain',
  invites: 'captain',
  users: 'admin',
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
  'player-profile': { title: 'Профиль игрока', description: 'Игровой профиль пользователя (отдельно от user-профиля).', tips: ['Переходите в user-профиль для ФИО/био.', 'Проверяйте связь user ↔ player profile.'] },
  'player-events': { title: 'Мои события', description: 'Все события, связанные с профилем игрока.', tips: ['События открываются на странице игрока.', 'Используйте фильтр по игроку в ленте.'] },
  'player-media': { title: 'Player media', description: 'Фото и медиа-поля профиля игрока.', tips: ['Используйте изображения с доступным URL.', 'Сохраняйте медиа отдельно от спортивных данных.'] },
  team: { title: 'Моя команда', description: 'Быстрый вход в team workspace.', tips: ['Откройте карточку команды для inline-редактирования.', 'Используйте team context для событий/состава.'] },
  invites: { title: 'Приглашения', description: 'Приглашение игроков в команду.', tips: ['Укажите корректный ID команды.', 'Username вводится без @.'] },
  users: { title: 'Пользователи', description: 'Управление captain/admin правами и team membership.', tips: ['Поиск только по Telegram @username.', 'Destructive actions требуют подтверждения.'] },
  roster: { title: 'Управление составом', description: 'Видимость игроков в ростере.', tips: ['Проверьте ID команды и игрока.', 'Изменение применяется сразу после submit.'] },
  'team-events': { title: 'События команды', description: 'Создание/обновление/удаление событий.', tips: ['Поддерживается загрузка изображения.', 'Для update/delete укажите event ID.'] },
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

export const CabinetSectionPage = () => {
  const { section } = useParams()
  const navigate = useNavigate()
  const { session } = useSession()
  const { cabinetRepository, teamsRepository, playersRepository, matchesRepository, eventsRepository, uploadsRepository, usersRepository } = useRepositories()
  const { data: bracket } = useBracket()
  const { data: teams } = useTeams()

  const [status, setStatus] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [socialsRaw, setSocialsRaw] = useState('')

  const [teamId, setTeamId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventId, setEventId] = useState('')
  const [username, setUsername] = useState('')
  const [userLookupUsername, setUserLookupUsername] = useState('')
  const [selectedUser, setSelectedUser] = useState<PublicUserCard | null>(null)
  const [selectedUserTeamId, setSelectedUserTeamId] = useState('')
  const [grantTeamCreate, setGrantTeamCreate] = useState(false)
  const [membershipTeamId, setMembershipTeamId] = useState('')
  const [membershipPlayerId, setMembershipPlayerId] = useState('')
  const [deactivatePlayerOnKick, setDeactivatePlayerOnKick] = useState(true)
  const [playerId, setPlayerId] = useState('')
  const [visible, setVisible] = useState(true)
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
  const [newEventImageFile, setNewEventImageFile] = useState<File | null>(null)
  const [matchHomeTeamId, setMatchHomeTeamId] = useState('')
  const [matchAwayTeamId, setMatchAwayTeamId] = useState('')
  const [matchStartAt, setMatchStartAt] = useState('')
  const [matchStatus, setMatchStatus] = useState<Match['status']>('scheduled')
  const [matchVenue, setMatchVenue] = useState('')
  const [matchReferee, setMatchReferee] = useState('')
  const [matchBroadcastUrl, setMatchBroadcastUrl] = useState('')
  const [matchStage, setMatchStage] = useState('')
  const [attachToTieIfExists, setAttachToTieIfExists] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState<null | { displayName: string; bio: string; avatarUrl: string; socials: Record<string, string> }>(null)
  const [tournamentCycles, setTournamentCycles] = useState<Array<{ id: string; name: string; bracketTeamCapacity: 4 | 8 | 16 | 32; isActive: boolean }>>([])
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [newCycleName, setNewCycleName] = useState('')
  const [newCycleCapacity, setNewCycleCapacity] = useState<4 | 8 | 16 | 32>(16)
  const [bracketCapacityDraft, setBracketCapacityDraft] = useState<4 | 8 | 16 | 32>(16)
  const [tieStageId, setTieStageId] = useState('')
  const [tieSlot, setTieSlot] = useState('1')
  const [tieHomeTeamId, setTieHomeTeamId] = useState('')
  const [tieAwayTeamId, setTieAwayTeamId] = useState('')
  const [tieLabel, setTieLabel] = useState('')

  const currentRoles = useMemo<UserRole[]>(
    () => (session.user.roles?.length ? session.user.roles : [session.user.role]),
    [session.user.role, session.user.roles],
  )
  const minRole = section ? sectionRoles[section] : null
  const meta = section ? sectionMeta[section] : null
  const allowed = minRole ? currentRoles.some((role) => roleRank[role] >= roleRank[minRole]) : false
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
        setProfileLoaded({ displayName: profile.displayName, bio: profile.bio, avatarUrl: profile.avatarUrl, socials: profile.socials })
        setDisplayName(profile.displayName)
        setFirstName(profile.socials.first_name ?? '')
        setLastName(profile.socials.last_name ?? '')
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
          {birthDateError && <p className="text-xs text-rose-300">{birthDateError}</p>}
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Отображаемое имя" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Ссылка на фото профиля" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Коротко о себе" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={socialsRaw} onChange={(e) => setSocialsRaw(e.target.value)} placeholder="telegram=https://... , instagram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={Boolean(birthDateError)} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
            try {
              const base = profileLoaded ?? { displayName: '', bio: '', avatarUrl: '', socials: {} }
              await cabinetRepository.updateMyProfile({
                displayName: displayName || base.displayName,
                bio: bio || base.bio,
                avatarUrl: avatarUrl || base.avatarUrl,
                socials: {
                  ...base.socials,
                  ...socials,
                  first_name: firstName,
                  last_name: lastName,
                  middle_name: middleName,
                  birth_date: birthDate,
                },
              })
              setProfileLoaded({
                displayName: displayName || base.displayName,
                bio: bio || base.bio,
                avatarUrl: avatarUrl || base.avatarUrl,
                socials: {
                  ...base.socials,
                  ...socials,
                  first_name: firstName,
                  last_name: lastName,
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
            setFirstName(profileLoaded.socials.first_name ?? '')
            setLastName(profileLoaded.socials.last_name ?? '')
            setMiddleName(profileLoaded.socials.middle_name ?? '')
            setBirthDate(profileLoaded.socials.birth_date ?? '')
            setSocialsRaw(Object.entries(profileLoaded.socials)
              .filter(([k]) => !['first_name', 'last_name', 'middle_name', 'birth_date'].includes(k))
              .map(([k, v]) => `${k}=${v}`).join(', '))
            setStatus('ok: profile changes canceled')
          }}>Отмена изменений</button>
        </section>
      )}

      {section === 'team' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="font-semibold text-textPrimary">Team workspace</p>
            <p className="mt-1">Captain/Admin/Superadmin инструменты вынесены прямо в team detail page, здесь — быстрый переход и создание команды для капитана без команды.</p>
          </div>
          {!session.user.teamId && currentRoles.some((role) => roleRank[role] >= roleRank.captain) && (
            <div className="space-y-2 rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <p className="text-xs text-textMuted">У вас пока нет команды. Создайте новую и сразу станьте ее капитаном.</p>
              <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Название команды" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <input value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} placeholder="Описание (опционально)" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <button type="button" disabled={!newTeamName.trim()} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                try {
                  const slug = newTeamName.toLowerCase().replace(/[^a-zа-я0-9]+/gi, '-').replace(/^-+|-+$/g, '') || `team-${Date.now()}`
                  await teamsRepository.createTeam?.({ name: newTeamName.trim(), slug, description: newTeamDescription.trim(), logoUrl: undefined })
                  const teamList = await teamsRepository.getTeams()
                  const created = teamList.find((item) => item.name === newTeamName.trim()) ?? teamList[teamList.length - 1]
                  if (created) {
                    await playersRepository.createPlayer?.({ userId: session.user.id, teamId: created.id, fullName: session.user.displayName, position: 'MF', shirtNumber: 0 })
                    setStatus('ok: team created, captain player profile created')
                    navigate(`/teams/${created.id}`)
                    return
                  }
                  setStatus('ok: team created')
                } catch (error) {
                  setStatus(`error: ${(error as Error).message}`)
                }
              }}>Создать команду</button>
            </div>
          )}
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder={`ID команды (например: ${session.user.teamId ?? '12'})`} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to={teamId ? `/teams/${teamId}` : session.user.teamId ? `/teams/${session.user.teamId}` : '/teams'} className="rounded-lg border border-borderSubtle px-3 py-2">Открыть team context</Link>
            <Link to="/teams" className="rounded-lg border border-borderSubtle px-3 py-2">Список команд</Link>
          </div>
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
              await cabinetRepository.updateMyProfile({ displayName, bio, avatarUrl, socials })
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

      {section === 'users' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <p className="text-xs text-textMuted">Поиск пользователя (обязателен Telegram @username)</p>
          <input value={userLookupUsername} onChange={(e) => setUserLookupUsername(e.target.value)} placeholder="@telegram_username" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={!userLookupUsername.trim().startsWith('@')} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
            try {
              const found = await usersRepository.findByTelegramUsername?.(userLookupUsername)
              if (!found) {
                setSelectedUser(null)
                setStatus('error: user not found by telegram username')
                return
              }
              setSelectedUser(found)
              setStatus(`ok: user selected (${found.displayName})`)
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Найти пользователя</button>

          {selectedUser && (
            <div className="space-y-3 rounded-xl border border-borderSubtle bg-mutedBg p-3">
              <p className="text-sm text-textPrimary">Выбран: <span className="font-semibold">{selectedUser.displayName}</span> {selectedUser.telegramUsername ? `(@${selectedUser.telegramUsername})` : ''}</p>

              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Капитанство / команда</p>
                <select value={selectedUserTeamId} onChange={(e) => setSelectedUserTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                  <option value="">Выберите команду</option>
                  {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs text-textSecondary">
                  <input type="checkbox" checked={grantTeamCreate} onChange={(e) => setGrantTeamCreate(e.target.checked)} />
                  Выдать капитанство с правом создавать команду
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!selectedUserTeamId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                    try {
                      await teamsRepository.adminTransferCaptain?.(selectedUserTeamId, selectedUser.id)
                      if (grantTeamCreate && currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)) {
                        await cabinetRepository.superadminAssignPermissions({ userId: selectedUser.id, permissions: ['tournament.team.create'] })
                      }
                      setStatus('ok: captain assigned')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Сделать капитаном</button>
                  <button type="button" disabled={!selectedUserTeamId} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Заменить капитана команды? Предыдущий капитан потеряет капитанские права для этой команды.')) return
                    try {
                      await teamsRepository.adminTransferCaptain?.(selectedUserTeamId, selectedUser.id)
                      setStatus('ok: captain replaced')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Заменить капитана</button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Team membership / player profile</p>
                <select value={membershipTeamId} onChange={(e) => setMembershipTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
                  <option value="">Команда для приглашения/добавления</option>
                  {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                </select>
                <input value={membershipPlayerId} onChange={(e) => setMembershipPlayerId(e.target.value)} placeholder="ID player profile для деактивации/исключения" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
                <label className="flex items-center gap-2 text-xs text-textSecondary">
                  <input type="checkbox" checked={deactivatePlayerOnKick} onChange={(e) => setDeactivatePlayerOnKick(e.target.checked)} />
                  При исключении деактивировать player profile (рекомендуется)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!membershipTeamId || !selectedUser.telegramUsername} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                    try {
                      await teamsRepository.captainInviteByUsername?.(membershipTeamId, selectedUser.telegramUsername ?? userLookupUsername.replace(/^@/, ''))
                      await playersRepository.createPlayer?.({ userId: selectedUser.id, teamId: membershipTeamId, fullName: selectedUser.displayName, position: 'MF', shirtNumber: 0 })
                      setStatus('ok: invite sent + player profile created')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Пригласить в команду</button>
                  <button type="button" disabled={!membershipTeamId || !membershipPlayerId} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Исключить пользователя из команды? Аккаунт сохранится.')) return
                    try {
                      if (deactivatePlayerOnKick) {
                        await teamsRepository.captainSetRosterVisibility?.(membershipTeamId, membershipPlayerId, false)
                      }
                      setStatus('ok: user removed from team, account preserved')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Исключить из команды</button>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-borderSubtle bg-panelBg p-3">
                <p className="text-xs text-textMuted">Admin / rights management</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={!currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                    try {
                      await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: ['admin'] })
                      setStatus('ok: admin rights granted')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Сделать администратором</button>
                  <button type="button" disabled={!currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Снять admin права у пользователя?')) return
                    try {
                      await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: ['player'] })
                      setStatus('ok: admin rights revoked')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Снять admin права</button>
                  <button type="button" disabled={!currentRoles.some((role) => roleRank[role] >= roleRank.superadmin)} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={async () => {
                    if (!window.confirm('Снять captain/admin права у пользователя?')) return
                    try {
                      await cabinetRepository.superadminAssignRoles({ userId: selectedUser.id, roles: ['player'] })
                      setStatus('ok: elevated rights revoked')
                    } catch (error) {
                      setStatus(`error: ${(error as Error).message}`)
                    }
                  }}>Снять captain/admin права</button>
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
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={playerId} onChange={(e) => setPlayerId(e.target.value)} placeholder="ID игрока (например: 34)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <label className="text-xs text-textSecondary flex items-center gap-2"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> visible in roster</label>
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await teamsRepository.captainSetRosterVisibility?.(teamId, playerId, visible)
              setStatus('ok: roster visibility updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Apply roster visibility</button>
        </section>
      )}

      {section === 'team-events' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="ID события для изменения/удаления" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="event title" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="event body" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input type="file" accept="image/*" onChange={(e) => setNewEventImageFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                let imageUrl: string | undefined
                if (newEventImageFile) {
                  imageUrl = (await uploadsRepository.uploadImage(newEventImageFile)).url
                }
                if (imageUrl) {
                  await eventsRepository.createEventForScope?.({ scopeType: 'team', scopeId: teamId, title, body, imageUrl })
                } else {
                  await cabinetRepository.createTeamEvent({ teamId, title, body })
                }
                setStatus('ok: team event created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create team event</button>
            <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={async () => {
              try {
                await eventsRepository.updateEventForScope?.({ eventId, scopeType: 'team', scopeId: teamId, title, body })
                setStatus('ok: team event updated')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Update event</button>
            <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={async () => {
              try {
                await eventsRepository.deleteEvent?.(eventId)
                setStatus('ok: event deleted')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Delete event</button>
          </div>
        </section>
      )}

      {section === 'tournament' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <div className="rounded-xl border border-accentYellow/30 bg-accentYellow/5 p-3">
            <p className="text-sm font-semibold text-accentYellow">Tournament administration</p>
            <p className="text-xs text-textMuted mt-1">Отдельные секции: создание турнира, выбор активного, настройки сетки и ручное управление tie/slot.</p>
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
            <p className="text-xs font-semibold text-textPrimary">4) Управление стадиями / tie / slot</p>
            <select value={tieStageId} onChange={(e) => setTieStageId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Выберите стадию</option>
              {(bracket?.stages ?? []).map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
            <input value={tieSlot} onChange={(e) => setTieSlot(e.target.value)} placeholder="Slot number" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <select value={tieHomeTeamId} onChange={(e) => setTieHomeTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Домашняя команда</option>
              {(teams ?? []).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select>
            <select value={tieAwayTeamId} onChange={(e) => setTieAwayTeamId(e.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1">
              <option value="">Гостевая команда</option>
              {(teams ?? []).map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}
            </select>
            <input value={tieLabel} onChange={(e) => setTieLabel(e.target.value)} placeholder="Название tie (опционально)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <button type="button" disabled={!isAdminScope || !selectedCycleId || !tieStageId || !tieHomeTeamId || !tieAwayTeamId} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
              try {
                await cabinetRepository.createBracketTie?.({
                  tournamentId: selectedCycleId,
                  stageId: tieStageId,
                  slot: Number(tieSlot) || 1,
                  homeTeamId: tieHomeTeamId,
                  awayTeamId: tieAwayTeamId,
                  label: tieLabel || undefined,
                })
                setStatus('ok: tie/slot created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Создать tie/slot</button>
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
            <label className="flex items-center gap-2 text-xs text-textSecondary">
              <input type="checkbox" checked={attachToTieIfExists} onChange={(e) => setAttachToTieIfExists(e.target.checked)} />
              Автоматически привязать к подходящему tie (если есть)
            </label>
            <button type="button" disabled={!isAdminScope} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
              try {
                const created = await matchesRepository.createMatch?.({
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

                if (!attachToTieIfExists || !selectedCycleId || !created?.id) {
                  setStatus('ok: match created')
                  return
                }

                const suitableTie = (bracket?.groups ?? []).find((group) => {
                  const direct = group.homeTeamId === matchHomeTeamId && group.awayTeamId === matchAwayTeamId
                  const reverse = group.homeTeamId === matchAwayTeamId && group.awayTeamId === matchHomeTeamId
                  return direct || reverse
                })

                if (!suitableTie) {
                  setStatus('ok: match created (без tie)')
                  return
                }

                await cabinetRepository.attachMatchToTie?.({ tournamentId: selectedCycleId, tieId: suitableTie.id, matchId: created.id })
                const tieMatchCount = [suitableTie.firstLeg.matchId, suitableTie.secondLeg?.matchId].filter(Boolean).length
                const aggregateHint = tieMatchCount >= 1 ? ' — tie переведен в two-leg/aggregate режим' : ''
                setStatus(`ok: match created + attached to tie${aggregateHint}`)
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create match</button>
            {!isAdminScope && <p className="text-[11px] text-textMuted">Создание матчей доступно только admin/superadmin.</p>}
          </div>
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

      {section === 'comment-blocks' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
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

      {!['profile', 'profile-settings', 'edit', 'activity', 'player-profile', 'player-events', 'team', 'invites', 'users', 'team-socials', 'roster', 'team-events', 'tournament', 'moderation', 'comment-blocks', 'roles', 'rbac', 'restrictions', 'settings'].includes(section) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary">
          Раздел синхронизирован по правам доступа и готов к расширению бизнес-формами.
        </section>
      )}
    </PageContainer>
  )
}
