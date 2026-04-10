import { Link, useParams } from 'react-router-dom'
import { UserCircle2 } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { useMatches } from '../../hooks/data/useMatches'
import { EmptyState } from '../../components/ui/EmptyState'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { CommentsSection } from '../../components/comments'
import { EventFeedSection } from '../../components/events'
import { useEvents } from '../../hooks/data/useEvents'

const getInitials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)

export const PlayerDetailsPage = () => {
  const { playerId } = useParams()
  const { data: player } = usePlayerDetails(playerId)
  const { data: team } = useTeamDetails(player?.teamId)
  const { data: matches } = useMatches()
  const { data: playerFeed } = useEvents({ entityType: 'player', entityId: playerId, limit: 4 })

  if (!player) return <PageContainer><EmptyState title="Игрок не найден" /></PageContainer>

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
          <div className="rounded-lg border border-dashed border-borderStrong px-2 py-1 text-xs text-textMuted">self-edit / captain/admin</div>
        </div>

        <SocialLinks compact links={{ telegram: 'https://t.me/ufleague' }} />
      </section>

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
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><UserCircle2 size={16} className="text-accentYellow" /> About / profile</h2>
        <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-3 text-sm text-textSecondary">
          <p>Bio placeholder: профиль игрока, игровая роль, сильные стороны и история выступлений будут отображаться в этом блоке.</p>
          <p className="mt-2 text-textMuted">Profile info area зарезервирован под editable personal data и медиа-блок.</p>
        </div>
      </section>

      <EventFeedSection title="Player events / updates" events={playerFeed ?? []} layout="timeline" messageWhenEmpty="События игрока пока не найдены." />

      <CommentsSection entityType="player" entityId={player.id} title="Player comments" />
    </PageContainer>
  )
}
