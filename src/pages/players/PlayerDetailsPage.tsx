import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { UserCircle2, Wrench } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { EmptyState } from '../../components/ui/EmptyState'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { CommentsSection } from '../../components/comments'
import { EventFeedSection } from '../../components/events'
import { useEvents } from '../../hooks/data/useEvents'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { canManagePlayer } from '../../domain/services/accessControl'

const getInitials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)

export const PlayerDetailsPage = () => {
  const { playerId } = useParams()
  const { data: player } = usePlayerDetails(playerId)
  const { data: team } = useTeamDetails(player?.teamId)
  const { data: playerFeed } = useEvents({ entityType: 'player', entityId: playerId, limit: 4 })
  const { session } = useSession()
  const { playersRepository } = useRepositories()

  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [position, setPosition] = useState(player?.position ?? 'MF')
  const [status, setStatus] = useState<string | null>(null)

  if (!player) return <PageContainer><EmptyState title="Игрок не найден" /></PageContainer>

  const canSelfEdit = session.user.role === 'player' && session.user.id === player.id
  const canManage = canManagePlayer(session, player, team)
  const canEditBio = canSelfEdit || canManage
  const canCreateEvents = canSelfEdit || canManage

  const actionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 403) return 'Недостаточно прав для изменения игрока (403).'
      return `Ошибка API ${error.status}: ${error.message}`
    }
    return error instanceof Error ? error.message : 'Не удалось обновить игрока'
  }

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-2xl border border-borderStrong bg-panelBg p-5 shadow-matte">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/75" />
          {team?.logoUrl && <img src={team.logoUrl} alt="" className="h-full w-full scale-[1.45] object-cover blur-2xl opacity-35" />}
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-borderStrong bg-panelSoft text-2xl font-bold text-textPrimary">
              {player.avatar ? <img src={player.avatar} alt={player.displayName} className="h-full w-full object-cover" /> : getInitials(player.displayName)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-textPrimary">{player.displayName}</h1>
              <p className="text-sm text-textSecondary">Роль: {player.position}</p>
              <p className="text-xs text-textMuted">{player.age ? `${player.age} лет` : 'Возраст не указан'}</p>
            </div>
          </div>

          <SocialLinks compact links={{ telegram: player.socials?.telegram, vk: player.socials?.vk, instagram: player.socials?.instagram }} />
        </div>
      </section>

      {(canSelfEdit || canManage) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Действия по роли</h2>
          <div className="space-y-2 rounded-xl border border-borderSubtle bg-mutedBg p-3 text-xs text-textSecondary">
            <p>Редактирование БИО: {canEditBio ? 'доступно' : 'ограничено админом'}</p>
            <p>Создание событий игрока: {canCreateEvents ? 'доступно' : 'ограничено админом'}</p>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="новое имя" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="avatar url" className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
            <select value={position} onChange={(e) => setPosition(e.target.value as typeof position)} className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">
              {['GK', 'DF', 'MF', 'FW'].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button
              type="button"
              className="rounded-lg bg-accentYellow px-3 py-1 font-semibold text-app"
              onClick={async () => {
                try {
                  await playersRepository.updatePlayer?.(player.id, { displayName: displayName || player.displayName, avatar: avatar || player.avatar, position })
                  setStatus('Данные игрока обновлены')
                } catch (error) {
                  setStatus(actionError(error))
                }
              }}
            >
              Сохранить
            </button>
            {status && <p className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">{status}</p>}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 text-base font-semibold text-textPrimary">Статистика игрока</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Матчи:</span> {player.stats.appearances}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Голы:</span> <span className="font-semibold text-accentYellow">{player.stats.goals}</span></div>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><UserCircle2 size={16} className="text-accentYellow" /> Профиль / медиа</h2>
        <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
          <p className="text-xs text-textMuted">Bio</p>
          <p className="mt-1 text-textSecondary">{player.bio ?? 'Био пока не заполнено.'}</p>
        </div>
      </section>

      <EventFeedSection title="События игрока" events={playerFeed ?? []} layout="timeline" messageWhenEmpty="События игрока пока не найдены." />

      <CommentsSection entityType="player" entityId={player.id} title="Комментарии" />
    </PageContainer>
  )
}
