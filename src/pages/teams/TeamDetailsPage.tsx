import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { TeamAvatar } from '../../components/ui/TeamAvatar'

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  return (
    <PageContainer>
      <div className="matte-panel p-4">
        <div className="accent-line mb-3 w-10" />
        <div className="mb-2 flex items-center gap-3">
          <TeamAvatar team={team} size="lg" />
          <h2 className="text-xl font-bold">{team.name}</h2>
        </div>
        <p className="text-sm text-textSecondary">{team.city} • Тренер: {team.coach}</p>
        <div className="mt-3 text-xs text-textMuted">Форма: {team.form.map((result) => ({ W: 'П', D: 'Н', L: 'ПР' }[result])).join(' ')}</div>
      </div>
      <SectionHeader title="Игроки" action={<Link to="/players" className="text-xs text-accentYellow">Все игроки</Link>} />
      <div className="space-y-2">{players?.map((p) => <PlayerRow key={p.id} player={p} />)}</div>
    </PageContainer>
  )
}
