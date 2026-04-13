import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleHelp, LocateFixed, Minus, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import type { BracketMatchGroup, BracketStage, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

const NODE_W = 150
const NODE_H = 78
const ROUND_GAP = 172
const FIRST_ROUND_GAP = 8
const PADDING_X = 24
const PADDING_Y = 24
const CONNECTOR_STUB = 18
const CONNECTOR_RADIUS = 8
const MIN_SCALE = 0.24
const MAX_SCALE = 1.7

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

type StageNode = BracketMatchGroup & { layoutSlot: number; isPlaceholder?: boolean }
type LayoutNode = StageNode & { x: number; y: number }

const isFinished = (status: string) => status === 'finished'

export const BracketView = ({
  stages,
  groups,
  teamMap,
  fullScreen = false,
  editable = false,
  onCreateTie,
  onEditTie,
  onDeleteTie,
}: {
  stages: BracketStage[]
  groups: BracketMatchGroup[]
  teamMap: Record<string, Team>
  fullScreen?: boolean
  editable?: boolean
  onCreateTie?: (stageId: string, slot: number) => void
  onEditTie?: (group: BracketMatchGroup) => void
  onDeleteTie?: (group: BracketMatchGroup) => void
}) => {
  const [scale, setScale] = useState(1)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const slotMemoryRef = useRef<Map<string, number>>(new Map())

  const sortedStages = [...stages].sort((a, b) => a.order - b.order)

  const { positionedGroups, width, height, stageCenters } = useMemo(() => {
    const byStage = new Map<string, StageNode[]>()
    sortedStages.forEach((stage) => {
      const existing = groups
        .filter((group) => group.stageId === stage.id)
        .sort((a, b) => a.slot - b.slot)

      const occupiedLayoutSlots = new Set<number>()
      const existingWithLayout: StageNode[] = existing.map((group) => {
        const memoryKey = `${stage.id}:${group.id}`
        const remembered = slotMemoryRef.current.get(memoryKey)
        const slotCandidate = Number.isInteger(group.slot) && group.slot >= 1 && group.slot <= stage.size ? group.slot : null
        const preferred = slotCandidate ?? (remembered && remembered >= 1 && remembered <= stage.size ? remembered : null)
        let layoutSlot = preferred && !occupiedLayoutSlots.has(preferred) ? preferred : null
        if (!layoutSlot) {
          layoutSlot = Array.from({ length: stage.size }, (_, offset) => offset + 1).find((slot) => !occupiedLayoutSlots.has(slot)) ?? 1
        }
        occupiedLayoutSlots.add(layoutSlot)
        slotMemoryRef.current.set(memoryKey, layoutSlot)
        return { ...group, slot: group.slot, layoutSlot }
      })

      if (!editable) {
        byStage.set(stage.id, existingWithLayout)
        return
      }

      const placeholders: StageNode[] = []
      for (let slot = 1; slot <= stage.size; slot += 1) {
        if (occupiedLayoutSlots.has(slot)) continue
        placeholders.push({
          id: `placeholder:${stage.id}:${slot}`,
          stageId: stage.id,
          slot,
          layoutSlot: slot,
          homeTeamId: null,
          awayTeamId: null,
          tieFormat: 1,
          firstLeg: { matchId: null, status: 'scheduled' },
          winnerTeamId: null,
          isPlaceholder: true,
        })
      }
      byStage.set(stage.id, [...existingWithLayout, ...placeholders].sort((a, b) => a.layoutSlot - b.layoutSlot))
    })

    const stageLayouts = new Map<string, LayoutNode[]>()

    const verticalStep = NODE_H + FIRST_ROUND_GAP

    sortedStages.forEach((stage, stageIndex) => {
      const stageGroups = byStage.get(stage.id) ?? []
      const x = PADDING_X + stageIndex * ROUND_GAP

      const blockSize = Math.pow(1.7, stageIndex)
      stageLayouts.set(stage.id, stageGroups.map((group, index) => {
        const slotIndex = Math.max(0, group.layoutSlot - 1)
        const fallbackIndex = Math.max(0, index)
        const effectiveSlot = Number.isFinite(slotIndex) ? slotIndex : fallbackIndex
        const centerY = PADDING_Y + NODE_H / 2 + (effectiveSlot * blockSize + (blockSize - 1) / 2) * verticalStep
        return { ...group, x, y: centerY - NODE_H / 2, ...(group.id.startsWith('placeholder:') ? { isPlaceholder: true as const } : {}) }
      }))
    })

    const positioned = sortedStages.flatMap((stage) => stageLayouts.get(stage.id) ?? [])
    const maxX = Math.max(...positioned.map((node) => node.x), PADDING_X) + NODE_W + PADDING_X
    const maxY = Math.max(...positioned.map((node) => node.y), PADDING_Y) + NODE_H + PADDING_Y

    const centers = new Map<string, number>()
    sortedStages.forEach((stage, index) => centers.set(stage.id, PADDING_X + index * ROUND_GAP + NODE_W / 2))

    return { positionedGroups: positioned, width: maxX, height: maxY, stageCenters: centers }
  }, [editable, groups, sortedStages])

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

      const current = (nodesByStage.get(stage.id) ?? []).slice().sort((a, b) => a.layoutSlot - b.layoutSlot)
      const next = (nodesByStage.get(nextStage.id) ?? []).slice().sort((a, b) => a.layoutSlot - b.layoutSlot)
      if (!current.length || !next.length) return

      next.forEach((nextNode) => {
        const firstSourceSlot = nextNode.layoutSlot * 2 - 1
        const lastSourceSlot = nextNode.layoutSlot * 2
        current
          .filter((fromNode) => fromNode.layoutSlot >= firstSourceSlot && fromNode.layoutSlot <= lastSourceSlot)
          .forEach((fromNode) => lines.push({ fromX: fromNode.x + NODE_W, fromY: fromNode.y + NODE_H / 2, toX: nextNode.x, toY: nextNode.y + NODE_H / 2 }))
      })
    })

    return lines
  }, [nodesByStage, sortedStages])

  const fitToViewport = () => {
    const viewport = viewportRef.current?.getBoundingClientRect()
    if (!viewport) return
    const fitScale = clamp(Math.min((viewport.width - 24) / width, (viewport.height - 24) / height), MIN_SCALE, 1)
    setScale(fitScale)
  }

  useEffect(() => {
    fitToViewport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  const zoom = (delta: number) => {
    setScale((prev) => clamp(Number((prev + delta).toFixed(2)), MIN_SCALE, MAX_SCALE))
  }

  const nodeClass = 'absolute block rounded-xl border border-white/10 bg-panelAlt/85 px-2 py-1.5 shadow-soft backdrop-blur'
  const viewportClass = fullScreen ? 'relative h-[calc(100vh-11.6rem)] overflow-auto' : 'relative h-[68vh] overflow-auto rounded-xl'

  return (
    <section className={fullScreen ? '' : 'matte-panel p-3'}>
      {!fullScreen && (
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-textMuted">
          <p>Тяните сетку • масштаб: колесо, пинч или кнопки</p>
        </div>
      )}
      <div className="mb-2 flex justify-end gap-1.5">
        <button type="button" onClick={fitToViewport} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle bg-panelBg text-textMuted hover:border-accentYellow/70 hover:text-accentYellow" aria-label="Показать всю сетку">
          <LocateFixed size={14} />
        </button>
        <button type="button" onClick={() => zoom(-0.12)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle bg-panelBg text-textMuted hover:border-accentYellow/70 hover:text-accentYellow" aria-label="Уменьшить сетку">
          <Minus size={14} />
        </button>
        <button type="button" onClick={() => zoom(0.12)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle bg-panelBg text-textMuted hover:border-accentYellow/70 hover:text-accentYellow" aria-label="Увеличить сетку">
          <Plus size={14} />
        </button>
      </div>

      <div
        ref={viewportRef}
        className={viewportClass}
        onWheel={(event) => {
          if (!event.ctrlKey) return
          event.preventDefault()
          zoom(event.deltaY > 0 ? -0.08 : 0.08)
        }}
      >
        <div className="relative left-0 top-0 origin-top-left" style={{ width, height, transform: `scale(${scale})` }}>
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
            if ('isPlaceholder' in group && group.isPlaceholder) {
              return (
                <button
                  key={group.id}
                  type="button"
                  className={`${nodeClass} border-dashed text-textMuted hover:border-accentYellow/60 hover:text-accentYellow`}
                  style={{ left: group.x, top: group.y, width: NODE_W, height: NODE_H }}
                  onClick={() => onCreateTie?.(group.stageId, group.slot)}
                >
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-xs">
                    <Plus size={14} />
                    <span>Добавить плей-офф #{group.slot}</span>
                  </div>
                </button>
              )
            }

            const legs = [group.firstLeg, group.secondLeg, group.thirdLeg].filter(Boolean)
            const firstLeg = group.firstLeg.score
            const canComputeTotal = legs.length > 1 && legs.every((leg) => leg?.score)
            const totalHome = canComputeTotal ? legs.reduce((sum, leg) => sum + (leg?.score?.home ?? 0), 0) : null
            const totalAway = canComputeTotal ? legs.reduce((sum, leg) => sum + (leg?.score?.away ?? 0), 0) : null
            const hasAllGamesFinished = legs.every((leg) => isFinished(leg?.status ?? 'scheduled'))
            const homeScore = totalHome ?? firstLeg?.home
            const awayScore = totalAway ?? firstLeg?.away

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
                <div className="leading-4">{teamRow(group.homeTeamId, homeWinner, homeScore)}</div>
                <div className="mt-1 leading-4">{teamRow(group.awayTeamId, awayWinner, awayScore)}</div>
                {legs.length > 1 && <div className="mt-1 text-[9px] uppercase tracking-[0.08em] text-textMuted">матчей: {legs.length}</div>}

                {group.adminLockedWinner && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-accentYellow/40 bg-accentYellow/10 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-accentYellow">
                    <ShieldCheck size={10} /> winner by admin
                  </div>
                )}
              </>
            )

            const primaryMatch = group.firstLeg.matchId
            const editControls = editable ? (
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onEditTie?.(group)
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-borderSubtle bg-panelBg/80 text-textMuted hover:border-accentYellow/70 hover:text-accentYellow"
                  aria-label="Редактировать плей-офф"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onDeleteTie?.(group)
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-borderSubtle bg-panelBg/80 text-textMuted hover:border-rose-500/70 hover:text-rose-400"
                  aria-label="Удалить плей-офф"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ) : null

            if (primaryMatch && !editable) {
              return <Link key={group.id} to={`/matches/${primaryMatch}`} className={nodeClass} style={{ left: group.x, top: group.y, width: NODE_W, height: NODE_H }}>{content}</Link>
            }

            return <div key={group.id} className={`${nodeClass} relative`} style={{ left: group.x, top: group.y, width: NODE_W, height: NODE_H }}>{editControls}{content}</div>
          })}
        </div>
      </div>
    </section>
  )
}
