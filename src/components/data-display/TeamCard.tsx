import { Link } from 'react-router-dom'
import type { Team } from '../../domain/entities/types'
import { resolveTeamLogo } from '../../domain/services/logoResolver'
import { tournament } from '../../mocks/data/tournament'

export const TeamCard = ({ team }: { team: Team }) => {
  const logo = resolveTeamLogo(team.logoUrl, tournament.logoUrl, tournament.fallbackLogoUrl)

  return (
    <Link to={`/teams/${team.id}`} className="border-b border-accentYellow/50 p-4 hover:border-accentYellow">
      <div className="mb-2 flex items-center gap-3">
        <img src={logo} alt={`Логотип ${team.name}`} className="h-8 w-8" />
        <p className="text-sm font-semibold">{team.name}</p>
      </div>
      <p className="mt-1 text-xs text-textMuted">{team.city} • {team.coach}</p>
      <p className="mt-2 text-xs text-textSecondary">Форма: {team.form.map((result) => ({ W: 'П', D: 'Н', L: 'ПР' }[result])).join(' ')}</p>
    </Link>
  )
}
