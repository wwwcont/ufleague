import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { resolveTeamLogo } from '../../domain/services/logoResolver'
import { tournament } from '../../mocks/data/tournament'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const logo = resolveTeamLogo(team.logoUrl, tournament.logoUrl, tournament.fallbackLogoUrl)

  return (
    <PageContainer>
      <div className="border-y border-accentYellow/70 p-4">
        <div className="mb-2 h-px w-10 bg-accentYellow" />
        <div className="mb-2 flex items-center gap-3">
          <img src={logo} alt={`Логотип ${team.name}`} className="h-10 w-10" />
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
