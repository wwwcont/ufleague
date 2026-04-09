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

  if (!team) return <PageContainer><EmptyState title="Team not found" /></PageContainer>

  const logo = resolveTeamLogo(team.logoUrl, tournament.logoUrl, tournament.fallbackLogoUrl)

  return (
    <PageContainer>
      <div className="rounded-xl border border-borderStrong bg-surface p-4">
        <div className="mb-2 h-px w-10 bg-accentYellow" />
        <div className="mb-2 flex items-center gap-3">
          <img src={logo} alt={`${team.name} logo`} className="h-10 w-10 rounded border border-borderSubtle bg-app p-1" />
          <h2 className="text-xl font-bold">{team.name}</h2>
        </div>
        <p className="text-sm text-textSecondary">{team.city} • Coach: {team.coach}</p>
        <div className="mt-3 text-xs text-textMuted">Form: {team.form.join(' ')}</div>
      </div>
      <SectionHeader title="Players" action={<Link to="/players" className="text-xs text-accentYellow">All players</Link>} />
      <div className="space-y-2">{players?.map((p) => <PlayerRow key={p.id} player={p} />)}</div>
    </PageContainer>
  )
}
