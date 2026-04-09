import { BracketView } from '../../components/data-display/BracketView'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useBracket } from '../../hooks/data/useBracket'
import { useTeams } from '../../hooks/data/useTeams'

export const BracketPage = () => {
  const { data } = useBracket()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))

  return (
    <PageContainer>
      <SectionHeader title="Tournament Bracket" />
      <p className="mb-4 text-sm text-textSecondary">Swipe horizontally through rounds. Tap a matchup to open match details.</p>
      {data && <BracketView rounds={data.rounds} matches={data.matches} teamMap={teamMap} />}
    </PageContainer>
  )
}
