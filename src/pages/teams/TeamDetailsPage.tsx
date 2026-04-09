import { Link, useParams } from 'react-router-dom'
import { CalendarClock, PlusCircle, Trophy, Users } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useEvents } from '../../hooks/data/useEvents'
import { useStandings } from '../../hooks/data/useStandings'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { tournament } from '../../mocks/data/tournament'
import { CommentsSection } from '../../components/comments'

const formLabel: Record<string, string> = { W: 'В', D: 'Н', L: 'П' }

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)
  const { data: events } = useEvents()
  const { data: standings } = useStandings()
  const { data: matches } = useMatches()
  const { data: teams } = useTeams()

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const standing = standings?.find((row) => row.teamId === team.id)
  const teamEvents = (events ?? []).filter((event) => !event.teamId || event.teamId === team.id)
  const teamMatches = (matches ?? []).filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id).slice(0, 4)
  const teamMap = Object.fromEntries((teams ?? []).map((item) => [item.id, item]))

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <TeamAvatar team={team} size="xl" fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-2" />
            <div>
              <h1 className="text-2xl font-bold text-textPrimary">{team.name}</h1>
              <p className="text-sm text-textSecondary">{team.city} · Тренер: {team.coach}</p>
              <p className="mt-1 text-xs text-textMuted">Клуб с акцентом на интенсивный прессинг и быстрые вертикальные атаки.</p>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-borderStrong px-2 py-1 text-xs text-textMuted">captain/admin actions</div>
        </div>

        <div className="border-t border-borderSubtle pt-2">
          <p className="text-xs uppercase tracking-[0.08em] text-textMuted">Social links placeholder</p>
          <SocialLinks compact />
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Trophy size={16} className="text-accentYellow" /> Quick team stats</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Позиция:</span> <span className="font-semibold text-textPrimary">#{standing?.position ?? '—'}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Очки:</span> <span className="font-semibold text-accentYellow">{standing?.points ?? team.statsSummary.points}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Матчи:</span> {team.statsSummary.played}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Форма:</span> {team.form.map((item) => formLabel[item] ?? item).join(' ')}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Голы:</span> {team.statsSummary.goalsFor}:{team.statsSummary.goalsAgainst}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><CalendarClock size={16} className="text-accentYellow" /> Team events / updates</h2>
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-dashed border-borderStrong px-2 py-1 text-xs text-textMuted">
            <PlusCircle size={12} /> add event
          </button>
        </div>

        <div className="space-y-2">
          {teamEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-6 text-center text-sm text-textMuted">События команды пока не добавлены.</div>
          ) : (
            teamEvents.slice(0, 4).map((event) => (
              <Link key={event.id} to={`/events/${event.id}`} className="block rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3 transition hover:border-borderStrong">
                <p className="text-sm font-semibold text-textPrimary">{event.title}</p>
                <p className="mt-1 text-xs text-textMuted">{event.date} · {event.author}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> Main squad / roster</h2>
          <Link to="/players" className="text-xs text-accentYellow hover:underline">Все игроки</Link>
        </div>

        <div className="space-y-2">
          {players?.length ? players.map((player) => <PlayerRow key={player.id} player={player} />) : <p className="text-sm text-textMuted">Состав пока не загружен.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 text-base font-semibold text-textPrimary">Recent matches</h2>
        <div className="space-y-2">
          {teamMatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-6 text-center text-sm text-textMuted">Недавние матчи отсутствуют.</p>
          ) : (
            teamMatches.map((match) => {
              const opponentId = match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId
              const opponent = teamMap[opponentId]
              const isHome = match.homeTeamId === team.id
              const teamScore = isHome ? match.score.home : match.score.away
              const opponentScore = isHome ? match.score.away : match.score.home

              return (
                <Link key={match.id} to={`/matches/${match.id}`} className="flex items-center justify-between rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3 transition hover:border-borderStrong">
                  <div className="flex min-w-0 items-center gap-2">
                    {opponent && <TeamAvatar team={opponent} size="md" fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-1" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-textPrimary">vs {opponent?.name ?? 'Соперник'}</p>
                      <p className="text-xs text-textMuted">{match.round} · {match.date}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-textPrimary">{teamScore}<span className="mx-1 text-accentYellow">:</span>{opponentScore}</p>
                </Link>
              )
            })
          )}
        </div>
      </section>

      <CommentsSection entityType="team" entityId={team.id} title="Team comments" />
    </PageContainer>
  )
}
