import { Link, useParams } from 'react-router-dom'
import { Scoreboard } from '../../components/data-display/Scoreboard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'

export const MatchDetailsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))

  if (!match || !teams) return <PageContainer><EmptyState title="Match not found" /></PageContainer>

  return (
    <PageContainer>
      <Scoreboard match={match} home={teamMap[match.homeTeamId]} away={teamMap[match.awayTeamId]} />
      <SectionHeader title="Navigate" />
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <Link className="rounded-lg border border-borderStrong bg-surface px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to={`/teams/${match.homeTeamId}`}>Home Team</Link>
        <Link className="rounded-lg border border-borderStrong bg-surface px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to={`/teams/${match.awayTeamId}`}>Away Team</Link>
        <Link className="rounded-lg border border-borderStrong bg-surface px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/table">Standings</Link>
      </div>
    </PageContainer>
  )
}
