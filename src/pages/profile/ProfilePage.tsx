import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Crown, LogOut, Settings, Shield, User } from 'lucide-react'
import type { UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

const roleOrder: UserRole[] = ['guest', 'player', 'captain', 'admin', 'superadmin']

interface CabinetBlock {
  title: string
  items: Array<{ label: string; route?: string }>
}

const blocksByRole: Record<UserRole, CabinetBlock[]> = {
  guest: [
    { title: 'Базовый профиль', items: [{ label: 'Никнейм, telegram handle (placeholder)' }, { label: 'Публичный статус аккаунта' }] },
    { title: 'Моя активность', items: [{ label: 'Мои комментарии и реакции', route: '/profile/activity' }] },
    { title: 'Доступные права', items: [{ label: 'Комментирование' }, { label: 'Reply / delete own / like-dislike' }] },
  ],
  player: [
    { title: 'Editable profile', items: [{ label: 'Редактирование карточки игрока', route: '/profile/edit' }, { label: 'Фото/био/social links (placeholder)' }] },
    { title: 'Связь с командой', items: [{ label: 'Текущая команда', route: '/profile/team' }, { label: 'Роль внутри команды' }] },
  ],
  captain: [
    { title: 'Моя команда', items: [{ label: 'Управление составом', route: '/profile/team' }, { label: 'Приглашения игроков', route: '/profile/team' }] },
    { title: 'События команды', items: [{ label: 'Создать/редактировать event', route: '/profile/moderation' }] },
  ],
  admin: [
    { title: 'Быстрые действия', items: [{ label: 'Создать матч', route: '/profile/moderation' }, { label: 'Создать событие', route: '/profile/moderation' }, { label: 'Создать команду', route: '/profile/moderation' }] },
    { title: 'Moderation / tournament actions', items: [{ label: 'Панель модерации', route: '/profile/moderation' }] },
  ],
  superadmin: [
    { title: 'Rights management', items: [{ label: 'Управление ролями и правами', route: '/profile/permissions' }] },
    { title: 'Global settings', items: [{ label: 'Глобальные настройки платформы', route: '/profile/settings' }, { label: 'Advanced actions', route: '/profile/settings' }] },
  ],
}

export const ProfilePage = () => {
  const { session, logout } = useSession()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const visibleBlocks = useMemo(() => {
    const roleIdx = roleOrder.indexOf(session.user.role)
    const rolesToShow = roleOrder.slice(0, roleIdx + 1)
    return rolesToShow.flatMap((role) => blocksByRole[role])
  }, [session.user.role])

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-textPrimary">Личный кабинет</h2>
            <p className="mt-1 text-sm text-textSecondary">{session.user.displayName} · role: {session.user.role}</p>
            {session.user.telegramHandle && <p className="text-xs text-textMuted">Telegram: {session.user.telegramHandle}</p>}
          </div>
          <span className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs text-textMuted">session skeleton</span>
        </div>
        {!session.isAuthenticated && (
          <div className="mt-3 rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-sm text-textSecondary">
            Вы в guest режиме. Для перехода к role-aware cabinet используйте mock login.
            <div className="mt-2"><Link to="/login" className="text-accentYellow hover:underline">Открыть login entry</Link></div>
          </div>
        )}
      </section>

      <div className="space-y-3">
        {visibleBlocks.map((block, idx) => (
          <section key={`${block.title}_${idx}`} className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
            <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary">
              {idx % 3 === 0 ? <User size={15} className="text-accentYellow" /> : idx % 3 === 1 ? <Shield size={15} className="text-accentYellow" /> : <Crown size={15} className="text-accentYellow" />}
              {block.title}
            </h3>
            <ul className="space-y-1 text-sm text-textSecondary">
              {block.items.map((item) => (
                <li key={item.label}>
                  {item.route ? <Link to={item.route} className="text-accentYellow hover:underline">• {item.label}</Link> : <span>• {item.label}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><Settings size={15} className="text-accentYellow" /> Session actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/login" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">Сменить роль (mock login)</Link>
          <button type="button" onClick={() => setConfirmOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app">
            <LogOut size={12} /> Выйти
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Подтвердить выход"
        description="Вы уверены, что хотите завершить текущую mock session?"
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
