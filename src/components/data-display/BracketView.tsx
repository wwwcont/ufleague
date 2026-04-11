import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, ShieldCheck } from 'lucide-react'
import type { BracketMatchGroup, BracketStage, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

const NODE_W = 238
const NODE_H = 174
const ROUND_GAP = 274
const FIRST_ROUND_GAP = 34
const PADDING_X = 48
const PADDING_Y = 44
const CONNECTOR_STUB = 18
const CONNECTOR_RADIUS = 8

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type LayoutNode = BracketMatchGroup & { x: number; y: number }

const isFinished = (status: string) => status === 'finished'

export const BracketView = ({ stages, groups, teamMap, fullScreen = false }: { stages: BracketStage[]; groups: BracketMatchGroup[]; teamMap: Record<string, Team>; fullScreen?: boolean }) => {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false })
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  const { positionedGroups, width, height, stageCenters } = useMemo(() => {
    const byStage = new Map<string, BracketMatchGroup[]>()
    sortedStages.forEach((stage) => byStage.set(stage.id, groups.filter((group) => group.stageId === stage.id).sort((a, b) => a.slot - b.slot)))

    const stageLayouts = new Map<string, LayoutNode[]>()

    sortedStages.forEach((stage, stageIndex) => {
      const stageGroups = byStage.get(stage.id) ?? []
      const x = PADDING_X + stageIndex * ROUND_GAP

      if (stageIndex === 0) {
        stageLayouts.set(stage.id, stageGroups.map((group, index) => ({ ...group, x, y: PADDING_Y + index * (NODE_H + FIRST_ROUND_GAP) })))
        return
      }

      const prevNodes = stageLayouts.get(sortedStages[stageIndex - 1].id) ?? []
      const groupSize = prevNodes.length && stageGroups.length ? Math.max(1, Math.floor(prevNodes.length / stageGroups.length)) : 1

      stageLayouts.set(stage.id, stageGroups.map((group, index) => {
        const start = index * groupSize
        const end = clamp(start + groupSize - 1, start, prevNodes.length - 1)
        const centers = prevNodes.slice(start, end + 1).map((node) => node.y + NODE_H / 2)
        const centerY = centers.length ? centers.reduce((sum, c) => sum + c, 0) / centers.length : PADDING_Y + index * (NODE_H + FIRST_ROUND_GAP)
        return { ...group, x, y: centerY - NODE_H / 2 }
      }))
    })

    const positioned = sortedStages.flatMap((stage) => stageLayouts.get(stage.id) ?? [])
    const maxX = Math.max(...positioned.map((node) => node.x), PADDING_X) + NODE_W + PADDING_X
    const maxY = Math.max(...positioned.map((node) => node.y), PADDING_Y) + NODE_H + PADDING_Y

    const centers = new Map<string, number>()
    sortedStages.forEach((stage, index) => centers.set(stage.id, PADDING_X + index * ROUND_GAP + NODE_W / 2))

    return { positionedGroups: positioned, width: maxX, height: maxY, stageCenters: centers }
  }, [groups, sortedStages])

  const nodesByStage = useMemo(() => {
    const map = new Map<string, LayoutNode[]>()
    sortedStages.forEach((stage) => map.set(stage.id, positionedGroups.filter((group) => group.stageId === stage.id).sort((a, b) => a.slot - b.slot)))
    return map
  }, [positionedGroups, sortedStages])

  const connectors = useMemo(() => {
    const lines: Array<{ fromX: number; fromY: number; toX: number; toY: number }> = []

    sortedStages.forEach((stage, stageIndex) => {
      const nextStage = sortedStages[stageIndex + 1]
      if (!nextStage) return

      const current = nodesByStage.get(stage.id) ?? []
      const next = nodesByStage.get(nextStage.id) ?? []
      if (!current.length || !next.length) return

      const groupSize = Math.max(1, Math.floor(current.length / next.length))

      next.forEach((nextNode, nextIndex) => {
        const start = nextIndex * groupSize
        const end = clamp(start + groupSize - 1, start, current.length - 1)
        current.slice(start, end + 1).forEach((fromNode) => lines.push({ fromX: fromNode.x + NODE_W, fromY: fromNode.y + NODE_H / 2, toX: nextNode.x, toY: nextNode.y + NODE_H / 2 }))
      })
    })

    return lines
  }, [nodesByStage, sortedStages])

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
      const nextScale = clamp(Number((prev + delta).toFixed(2)), 0.68, 1.7)
      setOffset((prevOffset) => clampOffset(prevOffset.x, prevOffset.y, nextScale))
      return nextScale
    })
  }

  const nodeClass = 'absolute block rounded-xl border border-white/10 bg-panelAlt/85 px-2.5 py-2 shadow-soft backdrop-blur'
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

          {sortedStages.map((stage) => (
            <p key={stage.id} className="absolute -translate-x-1/2 text-[11px] uppercase tracking-[0.13em] text-textMuted" style={{ left: stageCenters.get(stage.id), top: 6 }}>
              {stage.label}
            </p>
          ))}

          {positionedGroups.map((group) => {
            const firstLeg = group.firstLeg.score
            const secondLeg = group.secondLeg?.score
            const canComputeTotal = group.tieFormat === 2 && firstLeg && secondLeg
            const totalHome = canComputeTotal ? firstLeg.home + secondLeg.home : null
            const totalAway = canComputeTotal ? firstLeg.away + secondLeg.away : null
            const hasAllGamesFinished = group.tieFormat === 1
              ? isFinished(group.firstLeg.status)
              : isFinished(group.firstLeg.status) && isFinished(group.secondLeg?.status ?? 'scheduled')

            const homeWinner = group.winnerTeamId ? group.homeTeamId === group.winnerTeamId : false
            const awayWinner = group.winnerTeamId ? group.awayTeamId === group.winnerTeamId : false

            const teamRow = (teamId: string | null, winner: boolean, score?: number) => {
              const team = teamId ? teamMap[teamId] : null
              const faded = hasAllGamesFinished && group.winnerTeamId && !winner

              return (
                <div className={`flex items-center justify-between text-xs ${winner ? 'text-accentYellow' : 'text-textPrimary'} ${faded ? 'opacity-45' : ''}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    {team ? <TeamAvatar team={team} size="sm" /> : <CircleHelp size={14} className="text-textMuted" />}
                    <span className="truncate">{team ? team.shortName : 'TBD'}</span>
                  </div>
                  <span className="font-semibold tabular-nums text-textMuted">{score ?? '—'}</span>
                </div>
              )
            }

            const content = (
              <>
                <div className="leading-4">{teamRow(group.homeTeamId, homeWinner, firstLeg?.home)}</div>
                <div className="mt-1 leading-4">{teamRow(group.awayTeamId, awayWinner, firstLeg?.away)}</div>

                {group.tieFormat === 2 && (
                  <>
                    <div className="mt-1.5 border-t border-white/10 pt-1.5">
                      <div className="text-[10px] uppercase tracking-[0.08em] text-textMuted">2-й матч</div>
                      <div className="mt-1 leading-4">{teamRow(group.homeTeamId, homeWinner, secondLeg?.home)}</div>
                      <div className="mt-1 leading-4">{teamRow(group.awayTeamId, awayWinner, secondLeg?.away)}</div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between border-t border-white/10 pt-1 text-[10px] uppercase tracking-[0.08em] text-textMuted">
                      <span>Тотал</span>
                      <span className="font-semibold tabular-nums text-textPrimary">{totalHome === null || totalAway === null ? '- : -' : `${totalHome}:${totalAway}`}</span>
                    </div>
                  </>
                )}

                {group.adminLockedWinner && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-accentYellow/40 bg-accentYellow/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-accentYellow">
                    <ShieldCheck size={10} /> winner by admin
                  </div>
                )}
              </>
            )

            const primaryMatch = group.firstLeg.matchId
            if (primaryMatch) {
              return <Link key={group.id} to={`/matches/${primaryMatch}`} className={nodeClass} style={{ left: group.x, top: group.y, width: NODE_W, height: NODE_H }}>{content}</Link>
            }

            return <div key={group.id} className={nodeClass} style={{ left: group.x, top: group.y, width: NODE_W, height: NODE_H }}>{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
