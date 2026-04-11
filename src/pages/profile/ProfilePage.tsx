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

const cabinetByRole: Record<UserRole, CabinetEntry[]> = {
  guest: [
    { title: 'Мой профиль', description: 'Основные данные аккаунта и контакты.', route: '/profile/profile-settings', icon: 'user' },
    { title: 'Моя активность', description: 'Комментарии, ответы и реакции.', route: '/profile/activity', icon: 'user' },
    { title: 'Мои права', description: 'Что разрешено текущей роли.', route: '/profile/permissions', icon: 'shield' },
  ],
  player: [
    { title: 'Мой профиль', description: 'Открыть обычную карточку игрока.', route: '/profile/player-profile', icon: 'user' },
    { title: 'Настройки профиля', description: 'Обновить данные user/player profile.', route: '/profile/profile-settings', icon: 'user' },
    { title: 'Моя команда', description: 'Связь игрока с текущей командой.', route: '/profile/team', icon: 'shield' },
  ],
  captain: [
    { title: 'Моя команда', description: 'Открыть team workspace и контекст.', route: '/profile/team', icon: 'shield' },
    { title: 'Приглашения', description: 'Пригласить игроков в состав.', route: '/profile/invites', icon: 'shield' },
    { title: 'Управление составом', description: 'Видимость и состав команды.', route: '/profile/roster', icon: 'shield' },
    { title: 'События команды', description: 'Публикация и редактирование событий.', route: '/profile/team-events', icon: 'shield' },
  ],
  admin: [
    { title: 'Матчи', description: 'Управление матчами и турниром.', route: '/profile/tournament', icon: 'shield' },
    { title: 'Пользователи', description: 'Капитанство, приглашения, admin права.', route: '/profile/users', icon: 'shield' },
    { title: 'События', description: 'Операции с событиями турнира.', route: '/profile/team-events', icon: 'shield' },
    { title: 'Комментарии', description: 'Модерация комментариев.', route: '/profile/moderation', icon: 'shield' },
    { title: 'Блокировки', description: 'Ограничения комментариев.', route: '/profile/comment-blocks', icon: 'shield' },
    { title: 'Команды и игроки', description: 'Создание и администрирование сущностей.', route: '/profile/tournament', icon: 'shield' },
  ],
  superadmin: [
    { title: 'Пользователи', description: 'Полный workflow user/team rights.', route: '/profile/users', icon: 'shield' },
    { title: 'Роли пользователей', description: 'Назначение ролей и аудит.', route: '/profile/roles', icon: 'shield' },
    { title: 'Permissions', description: 'Тонкая настройка прав.', route: '/profile/rbac', icon: 'shield' },
    { title: 'Restrictions', description: 'Глобальные ограничения.', route: '/profile/restrictions', icon: 'shield' },
    { title: 'Глобальные настройки', description: 'Системные параметры платформы.', route: '/profile/settings', icon: 'shield' },
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
  const { data: teamPlayers } = usePlayers(session.user.teamId)

  const visibleRoleGroups = useMemo(() => {
    const activeRoles = new Set<UserRole>(['guest', ...(session.user.roles?.length ? session.user.roles : [session.user.role])])
    return (Object.keys(cabinetByRole) as UserRole[])
      .filter((role) => activeRoles.has(role))
      .map((role) => ({ role, entries: cabinetByRole[role] }))
  }, [session.user.role, session.user.roles])

  const playerCard = useMemo(() => {
    if (!teamPlayers || !session.user.teamId) return null
    if (session.user.playerProfileId) {
      return teamPlayers.find((item) => item.id === session.user.playerProfileId) ?? null
    }
    return teamPlayers.find((item) => item.userId === session.user.id) ?? null
  }, [teamPlayers, session.user.id, session.user.playerProfileId, session.user.teamId])

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

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Моя команда</p>
            <p className="mt-1 text-textPrimary">{team?.name ?? 'Не привязана'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Профиль игрока</p>
            <p className="mt-1 text-textPrimary">{playerCard ? `#${playerCard.number} • ${playerCard.position}` : 'Не привязан'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Активные роли</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {(session.user.roles?.length ? session.user.roles : [session.user.role]).map((role) => (
                <span key={role} className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${badgeTone[role]}`}>{roleLabel[role]}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {!session.isAuthenticated && (
        <section className="rounded-2xl border border-dashed border-borderStrong bg-panelBg p-4 text-sm text-textSecondary">
          <p className="flex items-center gap-2"><BadgeCheck size={14} className="text-accentYellow" /> Войдите, чтобы кабинет стал рабочей зоной с действиями по ролям.</p>
          <Link to="/login" className="mt-3 inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">Открыть вход</Link>
        </section>
      )}

      <section className="space-y-3">
        {visibleRoleGroups.map((group) => (
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
