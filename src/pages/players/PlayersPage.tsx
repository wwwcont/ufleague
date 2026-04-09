import { PlayerRow } from '../../components/data-display/PlayerRow'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayers } from '../../hooks/data/usePlayers'

export const PlayersPage = () => {
  const { data: players } = usePlayers()

  return (
    <PageContainer>
      <SectionHeader title="Players" />
      <div className="space-y-2">{players?.map((p) => <PlayerRow key={p.id} player={p} />)}</div>
    </PageContainer>
  )
}
