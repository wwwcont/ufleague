import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { SocialLinks } from '../../components/ui/SocialLinks'

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

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

      <SectionHeader title="Игроки" action={<Link to="/players" className="text-sm text-accentYellow">Все игроки</Link>} />
      <div className="space-y-3">{players?.map((p) => <PlayerRow key={p.id} player={p} />)}</div>
    </PageContainer>
  )
}
