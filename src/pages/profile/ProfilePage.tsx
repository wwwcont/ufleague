import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Crown, LogOut, MessageCircle, Settings, Shield, User, Wrench } from 'lucide-react'
import type { UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

const roleOrder: UserRole[] = ['guest', 'player', 'captain', 'admin', 'superadmin']

interface CabinetEntry {
  title: string
  description: string
  route: string
  icon: 'user' | 'shield' | 'crown'
}

const cabinetByRole: Record<UserRole, CabinetEntry[]> = {
  guest: [
    { title: 'Профиль', description: 'Базовые настройки аккаунта и публичный статус.', route: '/profile/profile', icon: 'user' },
    { title: 'Мои комментарии', description: 'Лента ваших сообщений, веток и ответов.', route: '/profile/activity', icon: 'user' },
    { title: 'Мои реакции', description: 'Контроль лайков/дизлайков по сущностям.', route: '/profile/reactions', icon: 'user' },
    { title: 'Доступные действия', description: 'Что разрешено вашей роли прямо сейчас.', route: '/profile/permissions', icon: 'shield' },
  ],
  player: [
    { title: 'Профиль игрока', description: 'Карточка игрока и редактируемые поля.', route: '/profile/player-profile', icon: 'user' },
    { title: 'Команда', description: 'Текущая команда, роль и статус в ростере.', route: '/profile/team', icon: 'shield' },
    { title: 'Медиа и соцсети', description: 'Фото, ссылки и внешние профили.', route: '/profile/player-media', icon: 'user' },
  ],
  captain: [
    { title: 'Состав команды', description: 'Управление видимостью и статусами игроков.', route: '/profile/roster', icon: 'shield' },
    { title: 'Приглашения', description: 'Отправка и контроль captain invite.', route: '/profile/invites', icon: 'shield' },
    { title: 'События команды', description: 'Публикация и правка team events.', route: '/profile/team-events', icon: 'shield' },
    { title: 'Соцсети команды', description: 'Настройка ссылок и публичных блоков команды.', route: '/profile/team-socials', icon: 'shield' },
  ],
  admin: [
    { title: 'Быстрые действия турнира', description: 'Команды/игроки/матчи в одном месте.', route: '/profile/tournament', icon: 'crown' },
    { title: 'Модерация', description: 'Review comments/events и действия модератора.', route: '/profile/moderation', icon: 'crown' },
    { title: 'Блокировки комментариев', description: 'Comment blocks и ограничения пользователей.', route: '/profile/comment-blocks', icon: 'crown' },
  ],
  superadmin: [
    { title: 'Управление ролями', description: 'Assign roles и аудит критичных изменений.', route: '/profile/roles', icon: 'crown' },
    { title: 'Управление правами', description: 'Assign permissions и RBAC-матрица.', route: '/profile/rbac', icon: 'crown' },
    { title: 'Ограничения', description: 'Restrictions и policy-ограничения.', route: '/profile/restrictions', icon: 'crown' },
    { title: 'Глобальные настройки', description: 'Платформенные настройки и feature flags.', route: '/profile/settings', icon: 'crown' },
  ],
}

const roleLabel: Record<UserRole, string> = {
  guest: 'Guest',
  player: 'Player',
  captain: 'Captain',
  admin: 'Admin',
  superadmin: 'Superadmin',
}

const badgeTone: Record<UserRole, string> = {
  guest: 'border-borderSubtle text-textMuted',
  player: 'border-emerald-700/40 text-emerald-300',
  captain: 'border-sky-700/40 text-sky-300',
  admin: 'border-amber-700/40 text-amber-300',
  superadmin: 'border-fuchsia-700/40 text-fuchsia-300',
}

const iconFor = (icon: CabinetEntry['icon']) => {
  if (icon === 'crown') return <Crown size={15} className="text-accentYellow" />
  if (icon === 'shield') return <Shield size={15} className="text-accentYellow" />
  return <User size={15} className="text-accentYellow" />
}

export const ProfilePage = () => {
  const { session, status, logout } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const visibleSections = useMemo(() => {
    const idx = roleOrder.indexOf(session.user.role)
    return roleOrder.slice(0, idx + 1).flatMap((role) => cabinetByRole[role])
  }, [session.user.role])

  const statusLabel = status === 'loading' ? 'Синхронизация session…' : status === 'authenticated' ? 'Session активна' : 'Гостевой режим'

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-mutedBg text-lg font-bold text-textPrimary">
            {session.user.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-textPrimary">{session.user.displayName}</h2>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ${badgeTone[session.user.role]}`}>{roleLabel[session.user.role]}</span>
            </div>
            <p className="mt-1 text-xs text-textMuted">{statusLabel}</p>
          </div>
          <span className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-[11px] text-textMuted">id: {session.user.id}</span>
        </div>

        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Telegram</p>
            <p className="mt-1 text-textPrimary">{session.user.telegramHandle ?? 'не привязан'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Permissions</p>
            <p className="mt-1 text-textPrimary">{session.permissions.length} активных прав</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 sm:col-span-2">
            <p className="text-xs text-textMuted">Последний вход</p>
            <p className="mt-1 text-textPrimary">{session.lastLoginAt ?? 'данные появятся после первого подтвержденного входа'}</p>
          </div>
        </div>
      </section>

      {!session.isAuthenticated && (
        <section className="rounded-2xl border border-dashed border-borderStrong bg-panelBg p-4 text-sm text-textSecondary">
          <p className="flex items-center gap-2"><BadgeCheck size={14} className="text-accentYellow" /> Авторизуйтесь через Telegram-code flow, чтобы открыть role-aware разделы.</p>
          <Link to="/login" className="mt-3 inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">Открыть вход</Link>
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-textPrimary">Мои разделы кабинета</h3>
          <span className="text-xs text-textMuted">role-aware</span>
        </div>
        <div className="space-y-2">
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
        <h3 className="text-base font-semibold text-textPrimary">Активность комментариев и реакций</h3>
        <p className="mt-1 text-xs text-textMuted">Блок связан с comments feature: история действий доступна через разделы «Мои комментарии» и «Мои реакции».</p>
        <div className="mt-3 flex gap-2">
          <Link to="/profile/activity" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">Открыть комментарии</Link>
          <Link to="/profile/reactions" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">Открыть реакции</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Session & account actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary"><MessageCircle size={12} /> Повторный вход</Link>
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
