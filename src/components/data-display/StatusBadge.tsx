import type { MatchStatus } from '../../domain/entities/types'

export const StatusBadge = ({ status }: { status: MatchStatus }) => {
  const map: Record<MatchStatus, { tone: string; label: string }> = {
    scheduled: { tone: 'text-textSecondary', label: 'запланирован' },
    live: { tone: 'text-statusLive', label: 'в эфире' },
    half_time: { tone: 'text-accentYellow', label: 'перерыв' },
    finished: { tone: 'text-textPrimary', label: 'завершен' },
  }

  return <span className={`border-b border-accentYellow/70 px-1 pb-0.5 text-[11px] font-semibold uppercase ${map[status].tone}`}>{map[status].label}</span>
}
