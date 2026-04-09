import { Link, useParams } from 'react-router-dom'
import { Scoreboard } from '../../components/data-display/Scoreboard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { SocialLinks } from '../../components/ui/SocialLinks'

const formatKickoff = (date: string, time: string) => {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year} ${time}`
}

export const MatchDetailsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))

  if (!match || !teams) return <PageContainer><EmptyState title="Матч не найден" /></PageContainer>

  return (
    <PageContainer>
      <div className="matte-panel p-5">
        <div className="mb-3 rounded-2xl bg-app/80 px-4 py-5">
          <p className="text-lg font-semibold tabular-nums text-textPrimary">{formatKickoff(match.date, match.time)}</p>
          <p className="mt-1 text-base text-textSecondary">{match.venue}</p>
        </div>
        <Scoreboard match={match} home={teamMap[match.homeTeamId]} away={teamMap[match.awayTeamId]} />
        <SocialLinks compact />
      </div>

      <SectionHeader title="Переходы" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Link className="matte-panel px-4 py-3 text-center text-sm font-medium text-textSecondary hover:text-textPrimary" to={`/teams/${match.homeTeamId}`}>Команда хозяев</Link>
        <Link className="matte-panel px-4 py-3 text-center text-sm font-medium text-textSecondary hover:text-textPrimary" to={`/teams/${match.awayTeamId}`}>Команда гостей</Link>
        <Link className="matte-panel px-4 py-3 text-center text-sm font-medium text-textSecondary hover:text-textPrimary" to="/table">Таблица</Link>
      </div>
    </PageContainer>
  )
}
