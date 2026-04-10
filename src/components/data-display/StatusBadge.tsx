import type { MatchStatus } from '../../domain/entities/types'

export const StatusBadge = ({ status }: { status: MatchStatus }) => {
  const map: Record<MatchStatus, { tone: string; label: string }> = {
    scheduled: { tone: 'text-textSecondary', label: 'предстоящий' },
    live: { tone: 'text-statusLive', label: 'live' },
    half_time: { tone: 'text-accentYellow', label: 'перерыв' },
    finished: { tone: 'text-textPrimary', label: 'завершен' },
  }

  return <span className={`px-1 text-[10px] font-semibold uppercase tracking-[0.13em] ${map[status].tone}`}>{map[status].label}</span>
}
