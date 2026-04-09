import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { BracketMatch, BracketRound, Team } from '../../domain/entities/types'

const NODE_W = 180
const NODE_H = 70
const ROUND_GAP = 220
const FIRST_ROUND_GAP = 52
const PADDING_X = 48
const PADDING_Y = 44

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type LayoutNode = BracketMatch & { x: number; y: number }

export const BracketView = ({ rounds, matches, teamMap }: { rounds: BracketRound[]; matches: BracketMatch[]; teamMap: Record<string, Team> }) => {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })

  const sortedRounds = [...rounds].sort((a, b) => a.order - b.order)

  const { positionedMatches, width, height, roundCenters } = useMemo(() => {
    const byRound = new Map<string, BracketMatch[]>()
    sortedRounds.forEach((round) => {
      byRound.set(round.id, matches.filter((m) => m.roundId === round.id).sort((a, b) => a.slot - b.slot))
    })

    const roundLayouts = new Map<string, LayoutNode[]>()

    sortedRounds.forEach((round, roundIndex) => {
      const roundMatches = byRound.get(round.id) ?? []
      const x = PADDING_X + roundIndex * ROUND_GAP

      if (roundIndex === 0) {
        roundLayouts.set(
          round.id,
          roundMatches.map((match, index) => ({
            ...match,
            x,
            y: PADDING_Y + index * (NODE_H + FIRST_ROUND_GAP),
          })),
        )
        return
      }

      const prevRound = sortedRounds[roundIndex - 1]
      const prevNodes = roundLayouts.get(prevRound.id) ?? []
      const groupSize = prevNodes.length && roundMatches.length ? Math.max(1, Math.floor(prevNodes.length / roundMatches.length)) : 1

      roundLayouts.set(
        round.id,
        roundMatches.map((match, index) => {
          const start = index * groupSize
          const end = clamp(start + groupSize - 1, start, prevNodes.length - 1)
          const centers = prevNodes.slice(start, end + 1).map((node) => node.y + NODE_H / 2)
          const centerY = centers.length ? centers.reduce((sum, c) => sum + c, 0) / centers.length : PADDING_Y + index * (NODE_H + FIRST_ROUND_GAP)

          return {
            ...match,
            x,
            y: centerY - NODE_H / 2,
          }
        }),
      )
    })

    const positioned = sortedRounds.flatMap((round) => roundLayouts.get(round.id) ?? [])

    const maxX = Math.max(...positioned.map((node) => node.x), PADDING_X) + NODE_W + PADDING_X
    const maxY = Math.max(...positioned.map((node) => node.y), PADDING_Y) + NODE_H + PADDING_Y

    const centers = new Map<string, number>()
    sortedRounds.forEach((round) => {
      const nodes = roundLayouts.get(round.id) ?? []
      centers.set(round.id, PADDING_X + sortedRounds.findIndex((r) => r.id === round.id) * ROUND_GAP + NODE_W / 2)
      if (nodes.length === 0) centers.set(round.id, PADDING_X)
    })

    return { positionedMatches: positioned, width: maxX, height: maxY, roundCenters: centers }
  }, [matches, sortedRounds])

  const nodesByRound = useMemo(() => {
    const map = new Map<string, LayoutNode[]>()
    sortedRounds.forEach((round) => {
      map.set(round.id, positionedMatches.filter((m) => m.roundId === round.id).sort((a, b) => a.slot - b.slot))
    })
    return map
  }, [positionedMatches, sortedRounds])

  const connectors = useMemo(() => {
    const lines: Array<{ fromX: number; fromY: number; toX: number; toY: number }> = []

    sortedRounds.forEach((round, roundIndex) => {
      const nextRound = sortedRounds[roundIndex + 1]
      if (!nextRound) return

      const current = nodesByRound.get(round.id) ?? []
      const next = nodesByRound.get(nextRound.id) ?? []
      if (!current.length || !next.length) return

      const groupSize = Math.max(1, Math.floor(current.length / next.length))

      next.forEach((nextNode, nextIndex) => {
        const start = nextIndex * groupSize
        const end = clamp(start + groupSize - 1, start, current.length - 1)
        current.slice(start, end + 1).forEach((fromNode) => {
          lines.push({
            fromX: fromNode.x + NODE_W,
            fromY: fromNode.y + NODE_H / 2,
            toX: nextNode.x,
            toY: nextNode.y + NODE_H / 2,
          })
        })
      })
    })

    return lines
  }, [nodesByRound, sortedRounds])

  const zoom = (delta: number) => setScale((prev) => clamp(Number((prev + delta).toFixed(2)), 0.6, 2.2))

  return (
    <section className="matte-panel p-3">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-textMuted">
        <p>Тяните сетку для перемещения • колесо мыши / кнопки для масштаба</p>
        <div className="flex gap-1">
          <button onClick={() => zoom(-0.1)} className="rounded bg-elevated px-2 py-1 text-textPrimary">−</button>
          <button onClick={() => setScale(1)} className="rounded bg-elevated px-2 py-1 text-textPrimary">100%</button>
          <button onClick={() => zoom(0.1)} className="rounded bg-elevated px-2 py-1 text-textPrimary">+</button>
        </div>
      </div>

      <div
        className="relative h-[68vh] touch-none overflow-hidden rounded-xl bg-app"
        onWheel={(event) => {
          event.preventDefault()
          zoom(event.deltaY > 0 ? -0.08 : 0.08)
        }}
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y, active: true }
        }}
        onPointerMove={(event) => {
          if (!dragRef.current.active) return
          setOffset({ x: event.clientX - dragRef.current.x, y: event.clientY - dragRef.current.y })
        }}
        onPointerUp={() => {
          dragRef.current.active = false
        }}
        onPointerLeave={() => {
          dragRef.current.active = false
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width, height, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <svg width={width} height={height} className="absolute left-0 top-0">
            <defs>
              <marker id="bracket-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" fill="rgba(232,197,71,0.75)" />
              </marker>
            </defs>
            {connectors.map((line, index) => {
              const middleX = (line.fromX + line.toX) / 2
              const path = `M ${line.fromX} ${line.fromY} L ${middleX} ${line.fromY} L ${middleX} ${line.toY} L ${line.toX - 8} ${line.toY}`
              return <path key={index} d={path} fill="none" stroke="rgba(232,197,71,0.65)" strokeWidth="1.4" markerEnd="url(#bracket-arrow)" />
            })}
          </svg>

          {sortedRounds.map((round) => (
            <p
              key={round.id}
              className="absolute -translate-x-1/2 text-[11px] uppercase tracking-[0.13em] text-textMuted"
              style={{ left: roundCenters.get(round.id), top: 8 }}
            >
              {round.label}
            </p>
          ))}

          {positionedMatches.map((match) => {
            const homeWinner = match.winnerTeamId && match.homeTeamId === match.winnerTeamId
            const awayWinner = match.winnerTeamId && match.awayTeamId === match.winnerTeamId
            const content = (
              <>
                <div className={`flex items-center justify-between text-[11px] ${homeWinner ? 'text-accentYellow' : 'text-textPrimary'}`}>
                  <span>{match.homeTeamId ? teamMap[match.homeTeamId]?.shortName : 'TBD'}</span>
                  <span className="tabular-nums">{match.score?.home ?? '—'}</span>
                </div>
                <div className={`mt-1 flex items-center justify-between text-[11px] ${awayWinner ? 'text-accentYellow' : 'text-textPrimary'}`}>
                  <span>{match.awayTeamId ? teamMap[match.awayTeamId]?.shortName : 'TBD'}</span>
                  <span className="tabular-nums">{match.score?.away ?? '—'}</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-textMuted">{match.status === 'finished' ? 'завершен' : match.status === 'live' ? 'live' : 'ожидание'}</p>
              </>
            )

            if (match.linkedMatchId) {
              return (
                <Link
                  key={match.id}
                  to={`/matches/${match.linkedMatchId}`}
                  className="absolute block rounded-lg bg-surface px-2 py-2 shadow-surface"
                  style={{ left: match.x, top: match.y, width: NODE_W, height: NODE_H }}
                >
                  {content}
                </Link>
              )
            }

            return (
              <div
                key={match.id}
                className="absolute rounded-lg bg-surface px-2 py-2 shadow-surface"
                style={{ left: match.x, top: match.y, width: NODE_W, height: NODE_H }}
              >
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
