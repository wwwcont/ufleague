import type { Match } from '../entities/types'
import { parseMatchKickoff } from '../../lib/date-time'

const statusPriority: Record<Match['status'], number> = {
  live: 0,
  half_time: 0,
  scheduled: 1,
  finished: 2,
}

const kickoffTimestamp = (match: Match) => parseMatchKickoff(match.date, match.time)?.getTime() ?? 0

export const sortMatchesByRelevance = (matches: Match[]) => [...matches].sort((a, b) => {
  const priorityDiff = statusPriority[a.status] - statusPriority[b.status]
  if (priorityDiff !== 0) return priorityDiff

  const kickoffDiff = kickoffTimestamp(a) - kickoffTimestamp(b)
  if (a.status === 'scheduled') return kickoffDiff
  if (a.status === 'finished') return -kickoffDiff
  return -kickoffDiff
})
