import { Link } from 'react-router-dom'
import type { Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

export const TeamCard = ({ team }: { team: Team }) => (
  <Link to={`/teams/${team.id}`} className="block rounded-2xl bg-gradient-to-r from-accentYellow/15 to-transparent p-4 hover:from-accentYellow/20">
    <div className="mb-2 flex items-center gap-3">
      <TeamAvatar team={team} />
      <p className="text-sm font-semibold">{team.name}</p>
    </div>
    <p className="mt-1 text-xs text-textMuted">
      {team.city} • {team.coach}
    </p>
    <p className="mt-2 text-xs text-textSecondary">Форма: {team.form.map((result) => ({ W: 'П', D: 'Н', L: 'ПР' }[result])).join(' ')}</p>
  </Link>
)
