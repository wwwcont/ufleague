import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { useEvents } from '../../hooks/data/useEvents'
import { useStandings } from '../../hooks/data/useStandings'

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)
  const { data: events } = useEvents()
  const { data: standings } = useStandings()

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const teamEvents = (events ?? []).filter((event) => !event.teamId || event.teamId === team.id)
  const standing = standings?.find((row) => row.teamId === team.id)

  return (
    <PageContainer>
      <div className="matte-panel p-5">
        <div className="mb-4 flex h-36 items-center justify-center rounded-2xl bg-app/80">
          <TeamAvatar team={team} size="xl" />
        </div>
        <h2 className="text-2xl font-bold">{team.name}</h2>
        <p className="mt-1 text-base text-textSecondary">{team.city} • Тренер: {team.coach}</p>
        <p className="mt-2 text-sm text-textMuted">Форма: {team.form.map((result) => ({ W: 'П', D: 'Н', L: 'ПР' }[result])).join(' ')}</p>
        <SocialLinks />
      </div>

      {standing && (
        <div className="matte-panel grid grid-cols-8 gap-1 px-3 py-3 text-center text-sm">
          <span className="text-textSecondary">#{standing.position}</span>
          <span className="font-semibold">{team.shortName}</span>
          <span>{standing.played}</span>
          <span>{standing.won}</span>
          <span>{standing.drawn}</span>
          <span>{standing.lost}</span>
          <span>{standing.goalsFor}:{standing.goalsAgainst}</span>
          <span className="font-bold text-accentYellow">{standing.points}</span>
        </div>
      )}

      <SectionHeader title="События команды" />
      <div className="space-y-2">
        {teamEvents.slice(0, 3).map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="matte-panel block p-3">
            <p className="text-base font-medium">{event.title}</p>
            <p className="text-sm text-textMuted">{event.date} • {event.author}</p>
          </Link>
        ))}
      </div>

      <SectionHeader title="Игроки" action={<Link to="/players" className="text-sm text-accentYellow">Все игроки</Link>} />
      <div className="space-y-3">{players?.map((p) => <PlayerRow key={p.id} player={p} />)}</div>
    </PageContainer>
  )
}
