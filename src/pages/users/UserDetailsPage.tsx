import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useRepositories } from '../../app/providers/use-repositories'
import { useQueryState } from '../../hooks/data/useQueryState'
import { useSession } from '../../app/providers/use-session'
import { isAdmin } from '../../domain/services/accessControl'
import { notifyError, notifySuccess, toRussianMessage } from '../../lib/notifications'

const roleLabel: Record<string, string> = {
  guest: 'Пользователь',
  player: 'Игрок',
  captain: 'Капитан',
  admin: 'Администратор',
  superadmin: 'Администратор',
}

export const UserDetailsPage = () => {
  const { userId } = useParams()
  const { usersRepository, uploadsRepository, playersRepository } = useRepositories()
  const { session, refreshSession } = useSession()
  const userLoader = useCallback(() => (userId ? usersRepository.getUserCard(userId) : Promise.resolve(null)), [userId, usersRepository])
  const { data: user, isLoading } = useQueryState(userLoader, (value) => !value)
  const [profile, setProfile] = useState<{ userId: string; username: string; telegramId?: string; telegramUsername?: string; displayName: string; firstName: string; lastName: string; bio: string; avatarUrl: string; socials: Record<string, string> } | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!status) return
    const message = toRussianMessage(status)
    if (message.toLowerCase().includes('не удалось') || message.toLowerCase().includes('ошиб')) {
      notifyError(message)
      return
    }
    notifySuccess(message)
  }, [status])

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
      setFirstName(item.firstName)
      setLastName(item.lastName)
      setBio(item.bio)
      setAvatarUrl(item.avatarUrl)
    }).catch(() => setProfile(null))
  }, [canEditUser, userId, usersRepository])

  useEffect(() => {
    if (canEditUser) return
    setIsEditing(false)
    setStatus(null)
    setProfile(null)
    setDisplayName('')
    setFirstName('')
    setLastName('')
    setBio('')
    setAvatarUrl('')
    setAvatarFile(null)
  }, [canEditUser])

  if (isLoading) {
    return (
      <PageContainer>
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4">Загрузка пользователя…</section>
      </PageContainer>
    )
  }

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
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 sm:col-span-2">
            <p className="text-xs text-textMuted">Фотография</p>
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="mt-2 h-28 w-28 rounded-xl object-cover" />
            ) : (
              <p className="mt-1 text-textPrimary">Фото не загружено</p>
            )}
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Имя</p>
            <p className="mt-1 text-textPrimary">{profile?.firstName || 'Не указано'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Фамилия</p>
            <p className="mt-1 text-textPrimary">{profile?.lastName || 'Не указано'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 sm:col-span-2">
            <p className="text-xs text-textMuted">Отображаемое имя</p>
            <p className="mt-1 text-textPrimary">{profile?.displayName ?? user.displayName}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 sm:col-span-2">
            <p className="text-xs text-textMuted">Био</p>
            <p className="mt-1 text-textPrimary">{profile?.bio || 'Пока пусто'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Статус</p>
            <p className="mt-1 text-textPrimary">{user.statuses.map((status) => roleLabel[status] ?? status).join(', ') || 'Пользователь'}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Логин Telegram</p>
            <p className="mt-1 text-textPrimary">{profile?.telegramUsername ? `@${profile.telegramUsername}` : (user.telegramUsername ? `@${user.telegramUsername}` : 'Не указан')}</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 sm:col-span-2">
            <p className="text-xs text-textMuted">Присутствие</p>
            <p className="mt-1 text-textPrimary">{user.isOnline ? 'Онлайн' : `Последний вход: ${user.lastSeenAt ?? 'нет данных'}`}</p>
          </div>
        </div>

        {canEditUser && isEditing && (
          <div className="mt-3 space-y-2 rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={30} placeholder="Имя (до 30 символов)" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
              <input value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={30} placeholder="Фамилия (до 30 символов)" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            </div>
            <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1 text-xs" />
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar URL (или загрузите файл выше)" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} placeholder="Bio" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              if (!usersRepository.updateUserProfile || !userId) return
              try {
                const uploadedAvatarUrl = avatarFile ? (await uploadsRepository.uploadImage(avatarFile)).url : avatarUrl
                await usersRepository.updateUserProfile(userId, { displayName, firstName: firstName.trim(), lastName: lastName.trim(), bio, avatarUrl: uploadedAvatarUrl, socials: profile?.socials ?? {} })
                if (uploadedAvatarUrl && user.playerId && playersRepository.updatePlayer) {
                  await playersRepository.updatePlayer(user.playerId, { avatar: uploadedAvatarUrl })
                }
                if (session.user.id === userId) {
                  await refreshSession()
                }
                setProfile((prev) => prev ? { ...prev, displayName, firstName: firstName.trim(), lastName: lastName.trim(), bio, avatarUrl: uploadedAvatarUrl } : prev)
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
