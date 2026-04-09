import { Link } from 'react-router-dom'
import type { BracketMatch, BracketRound, Team } from '../../domain/entities/types'

export const BracketView = ({ rounds, matches, teamMap }: { rounds: BracketRound[]; matches: BracketMatch[]; teamMap: Record<string, Team> }) => (
  <div className="overflow-x-auto pb-3 [scrollbar-width:thin]">
    <div className="flex min-w-max snap-x snap-mandatory gap-5 pr-3">
      {rounds.map((round) => (
        <section key={round.id} className="w-72 shrink-0 snap-start">
          <header className="sticky top-0 z-10 mb-3 rounded-lg border border-borderSubtle bg-elevated/95 px-3 py-2 backdrop-blur">
            <div className="mb-1 h-px w-9 bg-accentYellow/80" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-textSecondary">{round.label}</p>
          </header>

          <div className="space-y-3">
            {matches.filter((m) => m.roundId === round.id).map((m) => (
              <Link
                key={m.id}
                to={m.linkedMatchId ? `/matches/${m.linkedMatchId}` : '#'}
                className="block rounded-xl border border-borderSubtle bg-surface px-3 py-3 transition hover:border-borderStrong hover:bg-elevated/50"
              >
                <div className="mb-2 h-px w-10 bg-accentYellow/75" />
                <p className="flex items-center justify-between text-sm">
                  <span className="text-textPrimary">{m.homeTeamId ? teamMap[m.homeTeamId]?.shortName : 'TBD'}</span>
                  <strong className="tabular-nums text-textPrimary">{m.score?.home ?? '—'}</strong>
                </p>
                <p className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-textPrimary">{m.awayTeamId ? teamMap[m.awayTeamId]?.shortName : 'TBD'}</span>
                  <strong className="tabular-nums text-textPrimary">{m.score?.away ?? '—'}</strong>
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
)
