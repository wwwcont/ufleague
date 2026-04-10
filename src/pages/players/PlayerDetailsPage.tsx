import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { UserCircle2, Wrench } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { useMatches } from '../../hooks/data/useMatches'
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
  const { data: matches } = useMatches()
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
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 403) return 'Недостаточно прав для изменения игрока (403).'
      return `Ошибка API ${error.status}: ${error.message}`
    }
    return error instanceof Error ? error.message : 'Не удалось обновить игрока'
  }

  const matchPlayerEvents = (matches ?? [])
    .flatMap((match) =>
      match.events
        .filter((event) => event.playerId === player.id)
        .map((event) => ({ ...event, matchId: match.id, round: match.round, date: match.date })),
    )
    .sort((a, b) => a.minute - b.minute)

  const yellowCards = matchPlayerEvents.filter((event) => event.type === 'yellow_card').length
  const redCards = matchPlayerEvents.filter((event) => event.type === 'red_card').length

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-borderStrong bg-panelSoft text-xl font-bold text-textPrimary">
              {getInitials(player.displayName)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-textPrimary">{player.displayName}</h1>
              <p className="text-sm text-textSecondary">{team ? <Link className="hover:text-accentYellow" to={`/teams/${team.id}`}>{team.name}</Link> : 'Команда не указана'}</p>
              <p className="text-xs text-textMuted">#{player.number} · {player.position} · {player.age} лет</p>
            </div>
          </div>
          {(canSelfEdit || canManage) && <div className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textMuted">Редактирование доступно</div>}
        </div>

        <SocialLinks compact links={{ telegram: 'https://t.me/ufleague' }} />
      </section>

      {(canSelfEdit || canManage) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Player role actions</h2>
          <div className="space-y-2 rounded-xl border border-borderSubtle bg-mutedBg p-3 text-xs text-textSecondary">
            {canSelfEdit && <p className="font-semibold text-textPrimary">Player self-edit profile</p>}
            {canManage && <p className="font-semibold text-textPrimary">Captain/Admin manage player</p>}
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
              Save player data
            </button>
            {status && <p className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">{status}</p>}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 text-base font-semibold text-textPrimary">Quick player stats</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Матчи:</span> {player.stats.appearances}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Голы:</span> <span className="font-semibold text-accentYellow">{player.stats.goals}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Ассисты:</span> {player.stats.assists}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">ЖК:</span> {yellowCards}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">КК:</span> {redCards}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><UserCircle2 size={16} className="text-accentYellow" /> Profile / media</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Bio</p>
            <p className="mt-1 text-textSecondary">Игрок активен в тренировочном процессе и готов к матчевой ротации.</p>
          </div>
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="text-xs text-textMuted">Связь с командой</p>
            <p className="mt-1 text-textSecondary">{team ? `${team.name} • роль в ростере` : 'Команда не привязана'}</p>
          </div>
        </div>
      </section>

      <EventFeedSection title="Player events / updates" events={playerFeed ?? []} layout="timeline" messageWhenEmpty="События игрока пока не найдены." />

      <CommentsSection entityType="player" entityId={player.id} title="Player comments" />
    </PageContainer>
  )
}
