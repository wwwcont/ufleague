import { useParams, Link } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from '../../hooks/data/useQueryState'

const roleLabel: Record<string, string> = {
  guest: 'Пользователь',
  player: 'Игрок',
  captain: 'Капитан',
  admin: 'Администратор',
  superadmin: 'Администратор',
}

export const UserDetailsPage = () => {
  const { userId } = useParams()
  const { usersRepository } = useRepositories()
  const { data: user } = useQueryState(() => (userId ? usersRepository.getUserCard(userId) : Promise.resolve(null)), (value) => !value)

  if (!user) {
    return (
      <PageContainer>
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4">Пользователь не найден.</section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h1 className="text-xl font-bold text-textPrimary">{user.displayName}</h1>
        <p className="mt-1 text-sm text-textMuted">ID: {user.id}</p>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Статус</p>
            <p className="mt-1 text-textPrimary">{user.statuses.map((status) => roleLabel[status] ?? status).join(', ') || 'Пользователь'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Телеграм</p>
            <p className="mt-1 text-textPrimary">{user.telegramUsername ? `@${user.telegramUsername}` : 'Не указан'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 sm:col-span-2">
            <p className="text-xs text-textMuted">Присутствие</p>
            <p className="mt-1 text-textPrimary">{user.isOnline ? 'Онлайн' : `Последний вход: ${user.lastSeenAt ?? 'нет данных'}`}</p>
          </div>
        </div>
      </section>

      {(user.playerId || user.teamId) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="text-base font-semibold text-textPrimary">Связанные карточки</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {user.playerId && <Link to={`/players/${user.playerId}`} className="rounded-lg border border-borderSubtle px-3 py-2">Карточка игрока</Link>}
            {user.teamId && <Link to={`/teams/${user.teamId}`} className="rounded-lg border border-borderSubtle px-3 py-2">Карточка команды</Link>}
          </div>
        </section>
      )}
    </PageContainer>
  )
}
