import type { MatchStatus } from '../../domain/entities/types'

export const StatusBadge = ({ status }: { status: MatchStatus }) => {
  const map: Record<MatchStatus, string> = {
    scheduled: 'bg-elevated text-textSecondary border-borderSubtle',
    live: 'bg-statusLive/20 text-statusLive border-statusLive/30',
    half_time: 'bg-accentYellow/20 text-accentYellow border-accentYellow/30',
    finished: 'bg-elevated text-textPrimary border-borderSubtle',
  }

  return <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold uppercase ${map[status]}`}>{status.replace('_', ' ')}</span>
}
