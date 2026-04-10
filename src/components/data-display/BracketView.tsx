import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp } from 'lucide-react'
import type { BracketMatch, BracketRound, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

const NODE_W = 142
const NODE_H = 72
const ROUND_GAP = 168
const FIRST_ROUND_GAP = 58
const PADDING_X = 48
const PADDING_Y = 44
const CONNECTOR_STUB = 14
const CONNECTOR_RADIUS = 8

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type LayoutNode = BracketMatch & { x: number; y: number }

export const BracketView = ({ rounds, matches, teamMap, fullScreen = false }: { rounds: BracketRound[]; matches: BracketMatch[]; teamMap: Record<string, Team>; fullScreen?: boolean }) => {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const sortedRounds = [...rounds].sort((a, b) => a.order - b.order)

  const { positionedMatches, width, height, roundCenters } = useMemo(() => {
    const byRound = new Map<string, BracketMatch[]>()
    sortedRounds.forEach((round) => byRound.set(round.id, matches.filter((m) => m.roundId === round.id).sort((a, b) => a.slot - b.slot)))

    const roundLayouts = new Map<string, LayoutNode[]>()

    sortedRounds.forEach((round, roundIndex) => {
      const roundMatches = byRound.get(round.id) ?? []
      const x = PADDING_X + roundIndex * ROUND_GAP

      if (roundIndex === 0) {
        roundLayouts.set(round.id, roundMatches.map((match, index) => ({ ...match, x, y: PADDING_Y + index * (NODE_H + FIRST_ROUND_GAP) })))
        return
      }

      const prevNodes = roundLayouts.get(sortedRounds[roundIndex - 1].id) ?? []
      const groupSize = prevNodes.length && roundMatches.length ? Math.max(1, Math.floor(prevNodes.length / roundMatches.length)) : 1

      roundLayouts.set(round.id, roundMatches.map((match, index) => {
        const start = index * groupSize
        const end = clamp(start + groupSize - 1, start, prevNodes.length - 1)
        const centers = prevNodes.slice(start, end + 1).map((node) => node.y + NODE_H / 2)
        const centerY = centers.length ? centers.reduce((sum, c) => sum + c, 0) / centers.length : PADDING_Y + index * (NODE_H + FIRST_ROUND_GAP)
        return { ...match, x, y: centerY - NODE_H / 2 }
      }))
    })

    const positioned = sortedRounds.flatMap((round) => roundLayouts.get(round.id) ?? [])
    const maxX = Math.max(...positioned.map((node) => node.x), PADDING_X) + NODE_W + PADDING_X
    const maxY = Math.max(...positioned.map((node) => node.y), PADDING_Y) + NODE_H + PADDING_Y

    const centers = new Map<string, number>()
    sortedRounds.forEach((round, index) => centers.set(round.id, PADDING_X + index * ROUND_GAP + NODE_W / 2))

    return { positionedMatches: positioned, width: maxX, height: maxY, roundCenters: centers }
  }, [matches, sortedRounds])

  const nodesByRound = useMemo(() => {
    const map = new Map<string, LayoutNode[]>()
    sortedRounds.forEach((round) => map.set(round.id, positionedMatches.filter((m) => m.roundId === round.id).sort((a, b) => a.slot - b.slot)))
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
        current.slice(start, end + 1).forEach((fromNode) => lines.push({ fromX: fromNode.x + NODE_W, fromY: fromNode.y + NODE_H / 2, toX: nextNode.x, toY: nextNode.y + NODE_H / 2 }))
      })
    })

    return lines
  }, [nodesByRound, sortedRounds])

  const clampOffset = (nextX: number, nextY: number, localScale: number) => {
    const viewport = viewportRef.current?.getBoundingClientRect()
    if (!viewport) return { x: nextX, y: nextY }

    const minX = viewport.width - width * localScale - 20
    const minY = viewport.height - height * localScale - 20
    return {
      x: clamp(nextX, Math.min(minX, 20), 20),
      y: clamp(nextY, Math.min(minY, 20), 20),
    }
  }

  const zoom = (delta: number) => {
    setScale((prev) => {
      const nextScale = clamp(Number((prev + delta).toFixed(2)), 0.75, 1.7)
      setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, nextScale))
      return nextScale
    })
  }

  const nodeClass = 'absolute block rounded-lg border border-white/10 bg-panelAlt/80 px-2 py-2 shadow-soft backdrop-blur'
  const viewportClass = fullScreen ? 'relative h-[calc(100vh-11.6rem)] touch-none overflow-hidden' : 'relative h-[68vh] touch-none overflow-hidden rounded-xl'

  return (
    <section className={fullScreen ? '' : 'matte-panel p-3'}>
      {!fullScreen && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-textMuted">
          <p>Тяните сетку • масштаб: колесо</p>
        </div>
      )}

      <div
        ref={viewportRef}
        className={viewportClass}
        onWheel={(event) => {
          event.preventDefault()
          zoom(event.deltaY > 0 ? -0.08 : 0.08)
        }}
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y, active: true }
        }}
        onPointerMove={(event) => {
          if (!dragRef.current.active) return
          const next = clampOffset(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y, scale)
          setOffset(next)
        }}
        onPointerUp={() => { dragRef.current.active = false }}
        onPointerLeave={() => { dragRef.current.active = false }}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ width, height, transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}>
          <svg width={width} height={height} className="absolute left-0 top-0">
            {connectors.map((line, index) => {
              const midX = line.fromX + CONNECTOR_STUB
              const direction = line.toY >= line.fromY ? 1 : -1
              const verticalDistance = Math.abs(line.toY - line.fromY)
              const corner = Math.min(CONNECTOR_RADIUS, verticalDistance / 2 || CONNECTOR_RADIUS)
              const firstVerticalEnd = line.toY - direction * corner
              const cornerJoinX = midX + corner
              const path = [
                `M ${line.fromX} ${line.fromY}`,
                `H ${midX}`,
                verticalDistance
                  ? `V ${firstVerticalEnd} Q ${midX} ${line.toY} ${cornerJoinX} ${line.toY}`
                  : '',
                `H ${line.toX}`,
              ].filter(Boolean).join(' ')
              return <path key={index} d={path} fill="none" stroke="rgba(227,193,75,0.76)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            })}
          </svg>

          {sortedRounds.map((round) => (
            <p key={round.id} className="absolute -translate-x-1/2 text-[11px] uppercase tracking-[0.13em] text-textMuted" style={{ left: roundCenters.get(round.id), top: 6 }}>
              {round.label}
            </p>
          ))}

          {positionedMatches.map((match) => {
            const homeWinner = match.winnerTeamId && match.homeTeamId === match.winnerTeamId
            const awayWinner = match.winnerTeamId && match.awayTeamId === match.winnerTeamId

            const teamRow = (teamId: string | null, winner: boolean, score?: number) => {
              const team = teamId ? teamMap[teamId] : null

              return (
                <div className={`flex items-center justify-between text-sm ${winner ? 'text-accentYellow' : 'text-textPrimary'}`}>
                  <div className="flex items-center gap-2">
                    {team ? <TeamAvatar team={team} size="sm" /> : <CircleHelp size={16} className="text-textMuted" />}
                    <span>{team ? team.shortName : 'TBD'}</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-textMuted">{score ?? '—'}</span>
                </div>
              )
            }

            const content = (<><div className="leading-4">{teamRow(match.homeTeamId, Boolean(homeWinner), match.score?.home)}</div><div className="mt-1 leading-4">{teamRow(match.awayTeamId, Boolean(awayWinner), match.score?.away)}</div></>)

            if (match.linkedMatchId) {
              return <Link key={match.id} to={`/matches/${match.linkedMatchId}`} className={nodeClass} style={{ left: match.x, top: match.y, width: NODE_W, height: NODE_H }}>{content}</Link>
            }

            return <div key={match.id} className={nodeClass} style={{ left: match.x, top: match.y, width: NODE_W, height: NODE_H }}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
