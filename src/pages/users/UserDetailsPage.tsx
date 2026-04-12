import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from '../../hooks/data/useQueryState'
import { useSession } from '../../app/providers/use-session'
import { isAdmin } from '../../domain/services/accessControl'

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
  const { session } = useSession()
  const { data: user } = useQueryState(() => (userId ? usersRepository.getUserCard(userId) : Promise.resolve(null)), (value) => !value)
  const [profile, setProfile] = useState<{ userId: string; username: string; displayName: string; bio: string; avatarUrl: string; socials: Record<string, string> } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const canEditUser = useMemo(() => {
    if (!userId) return false
    return session.isAuthenticated && (session.user.id === userId || isAdmin(session))
  }, [session, userId])

  useEffect(() => {
    if (!userId || !canEditUser || !usersRepository.getUserProfile) return
    void usersRepository.getUserProfile(userId).then((item) => {
      setProfile(item)
      if (!item) return
      setDisplayName(item.displayName)
      setBio(item.bio)
      setAvatarUrl(item.avatarUrl)
    }).catch(() => setProfile(null))
  }, [canEditUser, userId, usersRepository])

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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-textPrimary">{profile?.displayName ?? user.displayName}</h1>
            <p className="mt-1 text-sm text-textMuted">ID: {user.id}</p>
          </div>
          {canEditUser && (
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={() => setIsEditing((prev) => !prev)}>
              <Pencil size={12} /> {isEditing ? 'Закрыть' : 'Редактировать'}
            </button>
          )}
        </div>

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

        {canEditUser && isEditing && (
          <div className="mt-3 space-y-2 rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar URL" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="Bio" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              if (!usersRepository.updateUserProfile || !userId) return
              try {
                await usersRepository.updateUserProfile(userId, { displayName, bio, avatarUrl, socials: profile?.socials ?? {} })
                setProfile((prev) => prev ? { ...prev, displayName, bio, avatarUrl } : prev)
                setStatus('Профиль сохранён')
                setIsEditing(false)
              } catch (error) {
                setStatus((error as Error).message)
              }
            }}>Сохранить</button>
            {status && <p className="text-xs text-textMuted">{status}</p>}
          </div>
        )}
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
