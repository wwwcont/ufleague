import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react'
import { GitBranch, Hand, Move, Plus, Save, Trash2 } from 'lucide-react'
import type { BracketEditorEdge, BracketEditorNode, PlayoffTieViewModel, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

type EditorMode = 'pan' | 'move' | 'connect'

const GRID = 24
const NODE_W = 150
const NODE_H = 78

const snap = (value: number) => Math.round(value / GRID) * GRID

const clampScale = (value: number) => Math.max(0.35, Math.min(2.4, Number(value.toFixed(2))))

const centerBetween = (x1: number, y1: number, x2: number, y2: number) => ({ x: (x1 + x2) / 2, y: (y1 + y2) / 2 })

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

export const BracketEditor = ({
  ties,
  nodes,
  edges,
  teamMap,
  editable,
  showGrid,
  onChange,
  onSave,
  onEditTie,
  onDeleteTie,
  onRequestCreateTie,
}: {
  ties: PlayoffTieViewModel[]
  nodes: BracketEditorNode[]
  edges: BracketEditorEdge[]
  teamMap: Record<string, Team>
  editable: boolean
  showGrid: boolean
  onChange: (next: { nodes: BracketEditorNode[]; edges: BracketEditorEdge[] }) => void
  onSave?: () => void
  onEditTie?: (tieId: string) => void
  onDeleteTie?: (tieId: string) => void
  onRequestCreateTie?: (anchor: { x: number; y: number }) => void
}) => {
  const [mode, setMode] = useState<EditorMode>('pan')
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [viewport, setViewport] = useState({ scale: 1, x: 24, y: 24 })

  const dragRef = useRef<{ nodeId: string; pointerStartX: number; pointerStartY: number; nodeStartX: number; nodeStartY: number } | null>(null)
  const panRef = useRef<{ pointerStartX: number; pointerStartY: number; x: number; y: number } | null>(null)
  const pinchRef = useRef<{ initialDistance: number; initialScale: number; initialCenter: { x: number; y: number } } | null>(null)

  const tieMap = useMemo(() => Object.fromEntries(ties.map((tie) => [tie.id, tie])), [ties])
  const nodeByTieId = useMemo(() => new Map(nodes.map((node) => [node.tieId, node])), [nodes])

  const edgeLines = useMemo(() => edges
    .map((edge) => {
      const from = nodeByTieId.get(edge.fromTieId)
      const to = nodeByTieId.get(edge.toTieId)
      if (!from || !to) return null
      const x1 = from.x + from.w
      const y1 = from.y + from.h / 2
      const x2 = to.x
      const y2 = to.y + to.h / 2
      return { id: edge.id, x1, y1, x2, y2, mid: centerBetween(x1, y1, x2, y2) }
    })
    .filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number; mid: { x: number; y: number } }>, [edges, nodeByTieId])

  const applyZoomAtClientPoint = (clientX: number, clientY: number, nextScale: number) => {
    setViewport((prev) => {
      const scale = clampScale(nextScale)
      const canvasX = (clientX - prev.x) / prev.scale
      const canvasY = (clientY - prev.y) / prev.scale
      return {
        scale,
        x: clientX - canvasX * scale,
        y: clientY - canvasY * scale,
      }
    })
  }

  const onNodePointerDown = (event: ReactPointerEvent, node: BracketEditorNode) => {
    event.stopPropagation()

    if (!editable) return

    if (mode === 'move') {
      dragRef.current = {
        nodeId: node.id,
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        nodeStartX: node.x,
        nodeStartY: node.y,
      }
      return
    }

    if (mode === 'connect') {
      if (!connectingFrom) {
        setConnectingFrom(node.tieId)
        return
      }

      if (connectingFrom !== node.tieId) {
        const edgeId = `${connectingFrom}:${node.tieId}`
        if (!edges.some((edge) => edge.id === edgeId)) {
          onChange({
            nodes,
            edges: [...edges, { id: edgeId, fromTieId: connectingFrom, toTieId: node.tieId, type: 'winner' }],
          })
        }
      }
      setConnectingFrom(null)
      return
    }

    onEditTie?.(node.tieId)
  }

  const onCanvasPointerDown = (event: ReactPointerEvent) => {
    if (event.target !== event.currentTarget) return
    panRef.current = { pointerStartX: event.clientX, pointerStartY: event.clientY, x: viewport.x, y: viewport.y }
    setSelectedEdgeId(null)
    setConnectingFrom(null)
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (dragRef.current) {
      const active = dragRef.current
      const dx = (event.clientX - active.pointerStartX) / viewport.scale
      const dy = (event.clientY - active.pointerStartY) / viewport.scale

      onChange({
        nodes: nodes.map((node) => (node.id === active.nodeId
          ? { ...node, x: snap(active.nodeStartX + dx), y: snap(active.nodeStartY + dy) }
          : node)),
        edges,
      })
      return
    }

    if (panRef.current) {
      setViewport((prev) => ({
        ...prev,
        x: panRef.current!.x + (event.clientX - panRef.current!.pointerStartX),
        y: panRef.current!.y + (event.clientY - panRef.current!.pointerStartY),
      }))
    }
  }

  const onTouchStart = (event: ReactTouchEvent) => {
    if (event.touches.length !== 2) return
    const a = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    const b = { x: event.touches[1].clientX, y: event.touches[1].clientY }
    pinchRef.current = {
      initialDistance: distance(a, b),
      initialScale: viewport.scale,
      initialCenter: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }

  const onTouchMove = (event: ReactTouchEvent) => {
    if (event.touches.length !== 2 || !pinchRef.current) return
    const a = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    const b = { x: event.touches[1].clientX, y: event.touches[1].clientY }
    const dist = distance(a, b)
    const scaleRatio = dist / pinchRef.current.initialDistance
    const nextScale = pinchRef.current.initialScale * scaleRatio
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    applyZoomAtClientPoint(center.x, center.y, nextScale)
    event.preventDefault()
  }

  return (
    <section className="relative h-[calc(100dvh-13.5rem)] overflow-hidden rounded-2xl border border-borderSubtle bg-panelBg">
      {editable && (
        <div className="absolute inset-x-3 bottom-3 z-30 flex items-center justify-between gap-2 rounded-xl border border-borderStrong bg-app/90 p-2 backdrop-blur">
          <div className="flex gap-1">
            <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'pan' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('pan')}><Hand size={14} className="inline" /> Навигация</button>
            <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'move' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('move')}><Move size={14} className="inline" /> Позиция</button>
            <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'connect' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('connect')}><GitBranch size={14} className="inline" /> Линии</button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-borderSubtle px-2 py-2 text-xs text-textPrimary"
              onClick={() => {
                const canvasAnchor = { x: snap((window.innerWidth / 2 - viewport.x) / viewport.scale), y: snap((window.innerHeight / 2 - viewport.y) / viewport.scale) }
                onRequestCreateTie?.(canvasAnchor)
              }}
            >
              <Plus size={14} className="inline" /> Плей-офф
            </button>
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={onSave}><Save size={14} className="inline" /> Save</button>
          </div>
        </div>
      )}

      <div
        className="relative h-full w-full touch-none"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null; panRef.current = null }}
        onPointerCancel={() => { dragRef.current = null; panRef.current = null }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { pinchRef.current = null }}
        onWheel={(event) => {
          if (!event.ctrlKey && !event.metaKey) return
          event.preventDefault()
          const delta = event.deltaY > 0 ? -0.07 : 0.07
          applyZoomAtClientPoint(event.clientX, event.clientY, viewport.scale + delta)
        }}
      >
        {showGrid && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: `${GRID}px ${GRID}px`,
            }}
          />
        )}

        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, width: 3200, height: 2200 }}>
          <svg width={3200} height={2200} className="absolute left-0 top-0">
            {edgeLines.map((edge) => (
              <g key={edge.id}>
                <path
                  d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 80} ${edge.y1}, ${edge.x2 - 80} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                  fill="none"
                  stroke="rgba(227,193,75,0.82)"
                  strokeWidth={3}
                  onClick={(event) => {
                    if (!editable) return
                    event.stopPropagation()
                    setSelectedEdgeId(edge.id)
                  }}
                  className="cursor-pointer"
                />
                {editable && selectedEdgeId === edge.id && (
                  <foreignObject x={edge.mid.x - 18} y={edge.mid.y - 18} width={36} height={36}>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/70 bg-panelBg text-rose-300"
                      onClick={() => {
                        onChange({ nodes, edges: edges.filter((item) => item.id !== edge.id) })
                        setSelectedEdgeId(null)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </foreignObject>
                )}
              </g>
            ))}
          </svg>

          {nodes.map((node) => {
            const tie = tieMap[node.tieId]
            if (!tie) return null
            return (
              <article
                key={node.id}
                className={`absolute block rounded-xl border border-white/10 bg-panelAlt/85 px-2 py-1.5 shadow-soft backdrop-blur relative ${connectingFrom === node.tieId ? 'ring-2 ring-accentYellow/80' : ''}`}
                style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
                onPointerDown={(event) => onNodePointerDown(event, node)}
              >
                {editable && (
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-borderSubtle bg-panelBg/80 text-textMuted hover:border-accentYellow/70 hover:text-accentYellow" aria-label="Редактировать плей-офф" onClick={(event) => { event.stopPropagation(); onEditTie?.(node.tieId) }}>
                      <Move size={12} />
                    </button>
                    <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-borderSubtle bg-panelBg/80 text-textMuted hover:border-rose-500/70 hover:text-rose-400" aria-label="Удалить плей-офф" onClick={(event) => { event.stopPropagation(); onDeleteTie?.(node.tieId) }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                <div className="leading-4">
                  {[tie.homeTeamId, tie.awayTeamId].map((teamId, index) => {
                    const team = teamId ? teamMap[teamId] : null
                    const score = tie.matches.length > 0 ? tie.matches[0]?.score : undefined
                    const value = index === 0 ? score?.home : score?.away
                    return (
                      <div key={`${node.id}_${index}`} className={`flex items-center justify-between text-xs ${tie.winnerTeamId && teamId === tie.winnerTeamId ? 'text-accentYellow' : 'text-textPrimary'}`}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          {team ? <TeamAvatar team={team} size="sm" /> : <div className="h-6 w-6 rounded-full bg-mutedBg" />}
                          <span className="truncate">{team?.shortName ?? 'TBD'}</span>
                        </div>
                        <span className="font-semibold tabular-nums text-textMuted">{value ?? 0}</span>
                      </div>
                    )
                  })}
                </div>
                {tie.matches.length > 1 && (
                  <p className="mt-1 text-[10px] text-textMuted">{tie.matches.map((match, idx) => `M${idx + 1}:${match.score ? `${match.score.home}:${match.score.away}` : '-'}`).join(', ')} · total {tie.total ? `${tie.total.home}:${tie.total.away}` : '-'}</p>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export const buildInitialEditorNodes = (ties: PlayoffTieViewModel[]): BracketEditorNode[] => ties.map((tie, index) => ({
  id: `node_${tie.id}`,
  tieId: tie.id,
  stageId: tie.stageId,
  x: snap(72 + (index % 4) * 280),
  y: snap(96 + Math.floor(index / 4) * 128),
  w: NODE_W,
  h: NODE_H,
}))
