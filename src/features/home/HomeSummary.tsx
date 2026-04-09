import { Link } from 'react-router-dom'
import { HeroBlock } from '../../components/ui/HeroBlock'

export const HomeSummary = () => (
  <HeroBlock title="UFL Cup 2026" subtitle="Premium mobile match center with live fixtures, standings and bracket progression.">
    <div className="grid grid-cols-3 gap-2 text-xs sm:w-fit sm:grid-cols-3">
      <Link className="rounded-lg border border-borderStrong bg-app/30 px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/matches">Matches</Link>
      <Link className="rounded-lg border border-borderStrong bg-app/30 px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/table">Standings</Link>
      <Link className="rounded-lg border border-borderStrong bg-app/30 px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/bracket">Bracket</Link>
    </div>
  </HeroBlock>
)
