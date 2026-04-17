import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Clock3, LogOut, Shield, User, UserCheck } from 'lucide-react'
import type { UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'

interface CabinetEntry {
  title: string
  description: string
  route: string
  icon: 'user' | 'shield'
}

const userCabinetEntries: CabinetEntry[] = [
  { title: 'Профиль пользователя', description: 'Открыть свою карточку пользователя для редактирования.', route: '/profile/my-user', icon: 'user' },
  { title: 'Мои действия', description: 'Лента личных действий по дате.', route: '/profile/my-actions', icon: 'shield' },
  { title: 'Мои уведомления', description: 'Все уведомления из Telegram-канала аккаунта.', route: '/profile/my-notifications', icon: 'shield' },
  { title: 'Избранное', description: 'Список команд и игроков, отмеченных звездочкой.', route: '/profile/favorites', icon: 'shield' },
  { title: 'Настройки', description: 'Персональные настройки Telegram-уведомлений.', route: '/profile/user-settings', icon: 'shield' },
]

const cabinetByRole: Record<UserRole, CabinetEntry[]> = {
  guest: [
    { title: 'Мой профиль', description: 'Основные данные аккаунта и контакты.', route: '/profile/profile-settings', icon: 'user' },
    { title: 'Моя активность', description: 'Комментарии, ответы и реакции.', route: '/profile/activity', icon: 'user' },
  ],
  player: [
    { title: 'Профиль игрока', description: 'Сразу открыть профиль игрока.', route: '/profile/my-player', icon: 'user' },
    { title: 'Моя команда', description: 'Переход на страницу моей команды.', route: '/profile/my-team', icon: 'shield' },
  ],
  captain: [
    { title: 'Моя команда', description: 'Сразу открыть страницу команды.', route: '/profile/my-team', icon: 'shield' },
    { title: 'Профиль игрока', description: 'Сразу открыть профиль игрока.', route: '/profile/my-player', icon: 'user' },
    { title: 'Управление командой', description: 'Создать команду или перейти к разделам капитана.', route: '/profile/team', icon: 'shield' },
  ],
  admin: [
    { title: 'Выдать права', description: 'Найти пользователя и выдать роль капитана/игрока.', route: '/profile/grant-access', icon: 'shield' },
    { title: 'Забрать права', description: 'Снять captain/admin права у пользователя.', route: '/profile/revoke-access', icon: 'shield' },
    { title: 'Выдать ограничение', description: 'Ограничить публикацию комментариев.', route: '/profile/issue-restriction', icon: 'shield' },
    { title: 'Создать матч', description: 'Создание нового матча турнира.', route: '/profile/create-match', icon: 'shield' },
    { title: 'Архив матчей', description: 'Скрытые матчи и возврат из архива.', route: '/profile/matches-archive', icon: 'shield' },
    { title: 'Архив команд', description: 'Скрытые команды и связанные матчи.', route: '/profile/teams-archive', icon: 'shield' },
  ],
  superadmin: [
    { title: 'Выдать права', description: 'Найти пользователя и выдать роль капитана/игрока/админа.', route: '/profile/grant-access', icon: 'shield' },
    { title: 'Забрать права', description: 'Снять captain/admin права у пользователя.', route: '/profile/revoke-access', icon: 'shield' },
    { title: 'Выдать ограничение', description: 'Ограничить публикацию комментариев.', route: '/profile/issue-restriction', icon: 'shield' },
    { title: 'Создать матч', description: 'Создание нового матча турнира.', route: '/profile/create-match', icon: 'shield' },
    { title: 'Архив матчей', description: 'Скрытые матчи и возврат из архива.', route: '/profile/matches-archive', icon: 'shield' },
    { title: 'Архив команд', description: 'Скрытые команды и связанные матчи.', route: '/profile/teams-archive', icon: 'shield' },
  ],
}

const roleLabel: Record<UserRole, string> = {
  guest: 'Гость',
  player: 'Игрок',
  captain: 'Капитан',
  admin: 'Администратор',
  superadmin: 'Суперадмин',
}

const badgeTone: Record<UserRole, string> = {
  guest: 'border-borderSubtle text-textMuted',
  player: 'border-emerald-700/40 text-emerald-300',
  captain: 'border-sky-700/40 text-sky-300',
  admin: 'border-amber-700/40 text-amber-300',
  superadmin: 'border-fuchsia-700/40 text-fuchsia-300',
}

const iconFor = (icon: CabinetEntry['icon']) => {
  if (icon === 'shield') return <Shield size={15} className="text-accentYellow" />
  return <User size={15} className="text-accentYellow" />
}

export const ProfilePage = () => {
  const { session, status, logout } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: team } = useTeamDetails(session.user.teamId)
  const { data: allPlayers } = usePlayers()

  const visibleRoleGroups = useMemo(() => {
    const activeRoles = new Set<UserRole>(session.user.roles?.length ? session.user.roles : [session.user.role])
    if (!session.isAuthenticated) activeRoles.add('guest')
    return (Object.keys(cabinetByRole) as UserRole[])
      .filter((role) => role !== 'guest' && activeRoles.has(role))
      .map((role) => ({ role, entries: cabinetByRole[role] }))
  }, [session.isAuthenticated, session.user.role, session.user.roles])

  const playerCard = useMemo(() => {
    if (!allPlayers) return null
    if (session.user.playerProfileId) {
      return allPlayers.find((item) => item.id === session.user.playerProfileId) ?? null
    }
    return allPlayers.find((item) => item.userId === session.user.id) ?? null
  }, [allPlayers, session.user.id, session.user.playerProfileId])

  const effectiveTeamId = team?.id ?? session.user.teamId
  const resolvedRoleGroups = useMemo(() => visibleRoleGroups.map((group) => ({
    ...group,
    entries: group.entries
      .map((item) => {
        if (item.route === '/profile/my-player') {
          return playerCard ? { ...item, route: `/players/${playerCard.id}` } : null
        }
        if (item.route === '/profile/my-team') {
          return effectiveTeamId ? { ...item, route: `/teams/${effectiveTeamId}` } : null
        }
        return item
      })
      .filter(Boolean) as CabinetEntry[],
  })).filter((group) => group.entries.length > 0), [effectiveTeamId, playerCard, visibleRoleGroups])

  const statusLabel = status === 'loading' ? 'Проверяем вход…' : status === 'authenticated' ? 'Онлайн в текущей сессии' : 'Гостевой режим'

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-mutedBg text-lg font-bold text-textPrimary">
            {session.user.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-textPrimary">{session.user.displayName}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ${badgeTone[session.user.role]}`}>{roleLabel[session.user.role]}</span>
            </div>
            <p className="mt-1 text-xs text-textMuted">{session.user.telegramHandle ?? 'Telegram не привязан'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-textMuted">
              <span className="inline-flex items-center gap-1 rounded-full border border-borderSubtle px-2 py-0.5"><UserCheck size={11} /> {statusLabel}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-borderSubtle px-2 py-0.5"><Clock3 size={11} /> Last seen: {session.lastLoginAt ?? 'нет данных'}</span>
            </div>
          </div>
          <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app">
            <LogOut size={12} /> Выйти
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-borderSubtle bg-mutedBg px-2 py-1 text-textSecondary">Команда: <span className="text-textPrimary">{team?.name ?? '—'}</span></span>
          <span className="rounded-full border border-borderSubtle bg-mutedBg px-2 py-1 text-textSecondary">Игрок: <span className="text-textPrimary">{playerCard ? `#${playerCard.number} ${playerCard.position}` : '—'}</span></span>
          <span className="rounded-full border border-borderSubtle bg-mutedBg px-2 py-1 text-textSecondary">Роли: {(session.user.roles?.length ? session.user.roles : [session.user.role]).map((role) => roleLabel[role]).join(', ')}</span>
        </div>
      </section>

      {!session.isAuthenticated && (
        <section className="rounded-2xl border border-dashed border-borderStrong bg-panelBg p-4 text-sm text-textSecondary">
          <p className="flex items-center gap-2"><BadgeCheck size={14} className="text-accentYellow" /> Войдите, чтобы кабинет стал рабочей зоной с действиями по ролям.</p>
          <Link to="/login" className="mt-3 inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">Открыть вход</Link>
        </section>
      )}

      <section className="space-y-3">
        {session.isAuthenticated && (
          <article className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-textPrimary">Пользовательский блок</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {userCabinetEntries.map((item) => (
                <Link key={`user:${item.route}`} to={item.route} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3 transition hover:border-borderStrong">
                  <div className="flex items-center gap-2 text-textPrimary">
                    {iconFor(item.icon)}
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-textMuted">{item.description}</p>
                </Link>
              ))}
            </div>
          </article>
        )}
        {resolvedRoleGroups.map((group) => (
          <article key={group.role} className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-textPrimary">{roleLabel[group.role]} — рабочие секции</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${badgeTone[group.role]}`}>{group.role}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.entries.map((item) => (
                <Link key={`${group.role}:${item.route}:${item.title}`} to={item.route} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3 transition hover:border-borderStrong">
                  <div className="flex items-center gap-2 text-textPrimary">
                    {iconFor(item.icon)}
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-textMuted">{item.description}</p>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Подтвердить выход"
        description="Завершить текущую сессию аккаунта?"
        confirmLabel="Выйти"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await logout()
          setConfirmOpen(false)
        }}
      />
    </PageContainer>
  )
}
