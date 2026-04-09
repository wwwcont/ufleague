import { Link, useParams } from 'react-router-dom'
import { CalendarClock, Pencil, UserCircle2 } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { useMatches } from '../../hooks/data/useMatches'
import { EmptyState } from '../../components/ui/EmptyState'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { CommentsSection } from '../../components/comments'

const getInitials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)

export const PlayerDetailsPage = () => {
  const { playerId } = useParams()
  const { data: player } = usePlayerDetails(playerId)
  const { data: team } = useTeamDetails(player?.teamId)
  const { data: matches } = useMatches()

  if (!player) return <PageContainer><EmptyState title="Игрок не найден" /></PageContainer>

  const playerEvents = (matches ?? [])
    .flatMap((match) =>
      match.events
        .filter((event) => event.playerId === player.id)
        .map((event) => ({ ...event, matchId: match.id, round: match.round, date: match.date })),
    )
    .sort((a, b) => a.minute - b.minute)

  const yellowCards = playerEvents.filter((event) => event.type === 'yellow_card').length
  const redCards = playerEvents.filter((event) => event.type === 'red_card').length

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

        <p className="text-xs uppercase tracking-[0.08em] text-textMuted">Social links placeholder</p>
        <SocialLinks compact />
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

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><CalendarClock size={16} className="text-accentYellow" /> Player events / updates</h2>
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-dashed border-borderStrong px-2 py-1 text-xs text-textMuted">
            <Pencil size={12} /> future edit
          </button>
        </div>

        <div className="space-y-2">
          {playerEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-6 text-center text-sm text-textMuted">События игрока пока не найдены.</div>
          ) : (
            playerEvents.map((event) => (
              <Link key={event.id} to={`/matches/${event.matchId}`} className="block rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3 transition hover:border-borderStrong">
                <p className="text-sm font-semibold text-textPrimary">{event.type} · {event.minute}′</p>
                <p className="text-xs text-textMuted">{event.round} · {event.date} · матч #{event.matchId}</p>
                {event.note && <p className="mt-1 text-xs text-textSecondary">{event.note}</p>}
              </Link>
            ))
          )}
        </div>
      </section>

      <CommentsSection entityType="player" entityId={player.id} title="Player comments" />
    </PageContainer>
  )
}
