import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, LogOut, MessageCircle, Settings, Shield, User, Wrench } from 'lucide-react'
import type { UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'

const roleOrder: UserRole[] = ['guest', 'player', 'captain', 'admin', 'superadmin']

interface CabinetEntry {
  title: string
  description: string
  route: string
  icon: 'user' | 'shield'
}

const cabinetByRole: Record<UserRole, CabinetEntry[]> = {
  guest: [
    { title: 'Профиль', description: 'Ваши основные данные и контакты.', route: '/profile/edit', icon: 'user' },
    { title: 'Мои комментарии', description: 'Ваши сообщения и ответы в обсуждениях.', route: '/profile/activity', icon: 'user' },
    { title: 'Что мне доступно', description: 'Список действий для вашей роли.', route: '/profile/permissions', icon: 'shield' },
  ],
  player: [
    { title: 'Профиль игрока', description: 'ФИО, дата рождения, описание и соцсети.', route: '/profile/player-profile', icon: 'user' },
    { title: 'Моя команда', description: 'Состав, статус и быстрый переход к команде.', route: '/profile/team', icon: 'shield' },
    { title: 'Фото и ссылки', description: 'Обновление фото и внешних профилей.', route: '/profile/player-media', icon: 'user' },
  ],
  captain: [
    { title: 'Состав команды', description: 'Управление видимостью игроков.', route: '/profile/roster', icon: 'shield' },
    { title: 'Приглашения', description: 'Пригласить игрока в команду.', route: '/profile/invites', icon: 'shield' },
    { title: 'События команды', description: 'Публикация новостей команды.', route: '/profile/team-events', icon: 'shield' },
    { title: 'Соцсети команды', description: 'Ссылки, которые видят болельщики.', route: '/profile/team-socials', icon: 'shield' },
  ],
  admin: [
    { title: 'Управление турниром', description: 'Команды, игроки и матчи в одном месте.', route: '/profile/tournament', icon: 'shield' },
    { title: 'Модерация', description: 'Работа с жалобами и нарушениями.', route: '/profile/moderation', icon: 'shield' },
    { title: 'Ограничения комментариев', description: 'Блокировки и сроки ограничений.', route: '/profile/comment-blocks', icon: 'shield' },
    { title: 'Настройки', description: 'Служебные параметры кабинета.', route: '/profile/settings', icon: 'shield' },
  ],
  superadmin: [
    { title: 'Роли пользователей', description: 'Выдача и аудит ролей.', route: '/profile/roles', icon: 'shield' },
    { title: 'Права доступа', description: 'Точная настройка возможностей.', route: '/profile/rbac', icon: 'shield' },
    { title: 'Ограничения', description: 'Глобальные ограничения платформы.', route: '/profile/restrictions', icon: 'shield' },
    { title: 'Глобальные настройки', description: 'Ключевые системные параметры.', route: '/profile/settings', icon: 'shield' },
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

  const visibleSections = useMemo(() => {
    const idx = roleOrder.indexOf(session.user.role)
    return roleOrder.slice(0, idx + 1).flatMap((role) => cabinetByRole[role])
  }, [session.user.role])

  const playerCard = useMemo(() => {
    if (!teamPlayers || !session.user.teamId) return null
    return teamPlayers.find((item) => item.displayName === session.user.displayName) ?? null
  }, [teamPlayers, session.user.displayName, session.user.teamId])

  const statusLabel = status === 'loading' ? 'Проверяем вход…' : status === 'authenticated' ? 'Вы вошли в аккаунт' : 'Гостевой режим'

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mutedBg text-lg font-bold text-textPrimary">
            {session.user.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-textPrimary">{session.user.displayName}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ${badgeTone[session.user.role]}`}>{roleLabel[session.user.role]}</span>
            </div>
            <p className="mt-1 text-xs text-textMuted">{statusLabel}</p>
          </div>
          <span className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-[11px] text-textMuted">Личный кабинет</span>
        </div>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Моя команда</p>
            <p className="mt-1 text-textPrimary">{team?.name ?? 'Не выбрана'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Рейтинг</p>
            <p className="mt-1 text-textPrimary">{playerCard ? `${playerCard.stats.goals + playerCard.stats.assists} очков` : 'Пока нет данных'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Последний вход</p>
            <p className="mt-1 text-textPrimary">{session.lastLoginAt ?? 'Пока нет данных'}</p>
          </div>
        </div>
      </section>

      {!session.isAuthenticated && (
        <section className="rounded-2xl border border-dashed border-borderStrong bg-panelBg p-4 text-sm text-textSecondary">
          <p className="flex items-center gap-2"><BadgeCheck size={14} className="text-accentYellow" /> Войдите, чтобы открыть все разделы личного кабинета.</p>
          <Link to="/login" className="mt-3 inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">Открыть вход</Link>
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-textPrimary">Разделы кабинета</h3>
          <span className="text-xs text-textMuted">по вашей роли</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleSections.map((item) => (
            <Link key={item.route} to={item.route} className="block rounded-xl border border-borderSubtle bg-mutedBg p-3 transition hover:border-borderStrong">
              <div className="flex items-center gap-2 text-textPrimary">
                {iconFor(item.icon)}
                <p className="text-sm font-semibold">{item.title}</p>
              </div>
              <p className="mt-1 text-xs text-textMuted">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Действия с аккаунтом</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary"><MessageCircle size={12} /> Войти заново</Link>
          <Link to="/profile/settings" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary"><Settings size={12} /> Настройки</Link>
          <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app">
            <LogOut size={12} /> Выйти
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Подтвердить выход"
        description="Вы уверены, что хотите завершить текущую сессию?"
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
