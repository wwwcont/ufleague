import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, TouchEvent as ReactTouchEvent } from 'react'
import { Check, GitBranch, Hand, Minus, Move, Plus, Save, Trash2, X } from 'lucide-react'
import type { BracketEditorEdge, BracketEditorNode, PlayoffTieViewModel, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

type EditorMode = 'pan' | 'move' | 'connect'
type HandleSide = 'left' | 'right'

const GRID_COLS = 35
const GRID_ROWS = 35
const NODE_W = 150
const NODE_H = 78
const CANVAS_W = GRID_COLS * NODE_W
const CANVAS_H = GRID_ROWS * NODE_H

const snapX = (value: number) => Math.max(0, Math.min(CANVAS_W - NODE_W, Math.round(value / NODE_W) * NODE_W))
const snapY = (value: number) => Math.max(0, Math.min(CANVAS_H - NODE_H, Math.round(value / NODE_H) * NODE_H))
const clampScale = (value: number) => Math.max(0.35, Math.min(2.4, Number(value.toFixed(2))))

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
  onRequestCreateTie?: (anchor: { col: number; row: number }) => void
}) => {
  const [mode, setMode] = useState<EditorMode>('pan')
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedHandle, setSelectedHandle] = useState<{ tieId: string; side: HandleSide } | null>(null)
  const [viewport, setViewport] = useState({ scale: 1, x: 24, y: 24 })

  const dragRef = useRef<{ nodeId: string; pointerStartX: number; pointerStartY: number; nodeStartX: number; nodeStartY: number } | null>(null)
  const panRef = useRef<{ pointerStartX: number; pointerStartY: number; x: number; y: number } | null>(null)
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null)

  const tieMap = useMemo(() => Object.fromEntries(ties.map((tie) => [tie.id, tie])), [ties])
  const nodeByTieId = useMemo(() => new Map(nodes.map((node) => [node.tieId, node])), [nodes])

  const edgeLines = useMemo(() => edges
    .map((edge) => {
      const from = nodeByTieId.get(edge.fromTieId)
      const to = nodeByTieId.get(edge.toTieId)
      if (!from || !to) return null
      const fromSide = edge.fromSide ?? 'right'
      const toSide = edge.toSide ?? 'left'
      const x1 = fromSide === 'right' ? from.x + from.w : from.x
      const y1 = from.y + from.h / 2
      const x2 = toSide === 'left' ? to.x : to.x + to.w
      const y2 = to.y + to.h / 2
      const midX = (x1 + x2) / 2
      return { id: edge.id, x1, y1, x2, y2, midX, midY: (y1 + y2) / 2 }
    })
    .filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number; midX: number; midY: number }>, [edges, nodeByTieId])

  const applyZoomAtClientPoint = (clientX: number, clientY: number, nextScale: number) => {
    setViewport((prev) => {
      const scale = clampScale(nextScale)
      const canvasX = (clientX - prev.x) / prev.scale
      const canvasY = (clientY - prev.y) / prev.scale
      const clamped = clampViewport({ scale, x: clientX - canvasX * scale, y: clientY - canvasY * scale })
      return clamped
    })
  }

  const clampViewport = (state: { scale: number; x: number; y: number }) => {
    const boundX = NODE_W * 2
    const boundY = NODE_H * 2
    const minX = Math.min(boundX, window.innerWidth - CANVAS_W * state.scale - boundX)
    const minY = Math.min(boundY, window.innerHeight - CANVAS_H * state.scale - boundY)
    return {
      ...state,
      x: Math.max(minX, Math.min(boundX, state.x)),
      y: Math.max(minY, Math.min(boundY, state.y)),
    }
  }

  const zoomByStep = (delta: number) => setViewport((prev) => clampViewport({ ...prev, scale: clampScale(prev.scale + delta) }))

  const onCanvasPointerDown = (event: ReactPointerEvent) => {
    const target = event.target as HTMLElement
    if (target.closest('article,button,path,foreignObject')) return
    panRef.current = { pointerStartX: event.clientX, pointerStartY: event.clientY, x: viewport.x, y: viewport.y }
    setSelectedEdgeId(null)
    setSelectedHandle(null)
  }

  const onNodePointerDown = (event: ReactPointerEvent, node: BracketEditorNode) => {
    if (!editable || mode === 'pan') {
      panRef.current = { pointerStartX: event.clientX, pointerStartY: event.clientY, x: viewport.x, y: viewport.y }
      return
    }
    if (mode !== 'move') return

    event.stopPropagation()
    dragRef.current = {
      nodeId: node.id,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      nodeStartX: node.x,
      nodeStartY: node.y,
    }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (dragRef.current) {
      const active = dragRef.current
      const dx = (event.clientX - active.pointerStartX) / viewport.scale
      const dy = (event.clientY - active.pointerStartY) / viewport.scale
      onChange({
        nodes: nodes.map((node) => (node.id === active.nodeId ? { ...node, x: snapX(active.nodeStartX + dx), y: snapY(active.nodeStartY + dy) } : node)),
        edges,
      })
      return
    }

    const pan = panRef.current
    if (pan) {
      setViewport((prev) => clampViewport({ ...prev, x: pan.x + (event.clientX - pan.pointerStartX), y: pan.y + (event.clientY - pan.pointerStartY) }))
    }
  }

  const onHandleClick = (tieId: string, side: HandleSide) => {
    if (!editable || mode !== 'connect') return

    if (selectedHandle?.tieId === tieId && selectedHandle.side === side) {
      setSelectedHandle(null)
      return
    }

    if (!selectedHandle) {
      setSelectedHandle({ tieId, side })
      return
    }

    const from = selectedHandle
    const to = { tieId, side }
    if (from.tieId === to.tieId) {
      setSelectedHandle(null)
      return
    }
    if (from.side !== 'right' || to.side !== 'left') {
      setSelectedHandle(to)
      return
    }

    const edgeId = `${from.tieId}:${to.tieId}:${from.side}:${to.side}`
    if (!edges.some((edge) => edge.id === edgeId)) {
      onChange({
        nodes,
        edges: [...edges, { id: edgeId, fromTieId: from.tieId, toTieId: to.tieId, fromSide: from.side, toSide: to.side, type: 'winner' }],
      })
    }
    setSelectedHandle(null)
  }

  const onTouchStart = (event: ReactTouchEvent) => {
    if (event.touches.length !== 2) return
    const a = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    const b = { x: event.touches[1].clientX, y: event.touches[1].clientY }
    pinchRef.current = { initialDistance: distance(a, b), initialScale: viewport.scale }
  }

  const onTouchMove = (event: ReactTouchEvent) => {
    if (event.touches.length !== 2 || !pinchRef.current) return
    const a = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    const b = { x: event.touches[1].clientX, y: event.touches[1].clientY }
    const dist = distance(a, b)
    applyZoomAtClientPoint((a.x + b.x) / 2, (a.y + b.y) / 2, pinchRef.current.initialScale * (dist / pinchRef.current.initialDistance))
    event.preventDefault()
  }

  return (
    <section className="relative h-[calc(100dvh-16.5rem)] min-h-[26rem] overflow-hidden rounded-2xl border border-borderSubtle bg-panelBg">
      <div className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-xl border border-borderStrong bg-app/90 p-1.5 backdrop-blur">
        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-borderSubtle text-textMuted" onClick={() => zoomByStep(-0.1)} aria-label="Уменьшить"><Minus size={14} /></button>
        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-borderSubtle text-textMuted" onClick={() => zoomByStep(0.1)} aria-label="Увеличить"><Plus size={14} /></button>
      </div>

      {editable && (
        <div className="absolute inset-x-3 bottom-3 z-30 flex items-center justify-between gap-2 rounded-xl border border-borderStrong bg-app/90 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="flex gap-1">
            <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'pan' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('pan')}><Hand size={14} className="inline" /> Навигация</button>
            <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'move' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('move')}><Move size={14} className="inline" /> Позиция</button>
            <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'connect' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => { setMode('connect'); setSelectedHandle(null) }}><GitBranch size={14} className="inline" /> Линии</button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-borderSubtle px-2 py-2 text-xs text-textPrimary"
              onClick={() => {
                const x = (window.innerWidth / 2 - viewport.x) / viewport.scale
                const y = (window.innerHeight / 2 - viewport.y) / viewport.scale
                onRequestCreateTie?.({ col: Math.max(1, Math.min(GRID_COLS, Math.round(x / NODE_W) + 1)), row: Math.max(1, Math.min(GRID_ROWS, Math.round(y / NODE_H) + 1)) })
              }}
            >
              <Plus size={14} className="inline" /> Плей-офф
            </button>
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={onSave}><Save size={14} className="inline" /> Save</button>
          </div>
        </div>
      )}

      <div
        className="relative h-full w-full touch-none pb-24"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null; panRef.current = null }}
        onPointerCancel={() => { dragRef.current = null; panRef.current = null }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { pinchRef.current = null }}
        onWheel={(event) => {
          event.preventDefault()
          applyZoomAtClientPoint(event.clientX, event.clientY, viewport.scale + (event.deltaY > 0 ? -0.07 : 0.07))
        }}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, width: CANVAS_W, height: CANVAS_H }}>
          {showGrid && (
            <div
              className="absolute left-0 top-0"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)`,
                backgroundSize: `${NODE_W}px ${NODE_H}px`,
              }}
            />
          )}
          <svg width={CANVAS_W} height={CANVAS_H} className="absolute left-0 top-0">
            {edgeLines.map((edge) => (
              <g key={edge.id}>
                <path
                  d={`M ${edge.x1} ${edge.y1} L ${edge.midX} ${edge.y1} L ${edge.midX} ${edge.y2} L ${edge.x2} ${edge.y2}`}
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
                  <foreignObject x={edge.midX - 18} y={edge.midY - 18} width={36} height={36}>
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
                className="absolute block rounded-xl border border-white/10 bg-panelAlt/85 px-2 py-1.5 shadow-soft backdrop-blur relative"
                style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
                onPointerDown={(event) => onNodePointerDown(event, node)}
              >
                {editable && (
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-borderSubtle bg-panelBg/80 text-textMuted hover:border-accentYellow/70 hover:text-accentYellow" onClick={(event) => { event.stopPropagation(); onEditTie?.(node.tieId) }}><Move size={12} /></button>
                    <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-borderSubtle bg-panelBg/80 text-textMuted hover:border-rose-500/70 hover:text-rose-400" onClick={(event) => { event.stopPropagation(); onDeleteTie?.(node.tieId) }}><Trash2 size={12} /></button>
                  </div>
                )}

                {editable && mode === 'connect' && (
                  <>
                    {(['left', 'right'] as HandleSide[]).map((side) => {
                      const isSelected = selectedHandle?.tieId === node.tieId && selectedHandle.side === side
                      return (
                        <button
                          key={side}
                          type="button"
                          className={`absolute top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border-2 transition ${isSelected ? 'scale-125 border-accentYellow bg-accentYellow text-app' : 'border-accentYellow bg-panelBg text-accentYellow'}`}
                          style={{ left: side === 'left' ? -16 : undefined, right: side === 'right' ? -16 : undefined }}
                          onClick={(event) => { event.stopPropagation(); onHandleClick(node.tieId, side) }}
                        >
                          {isSelected ? <Check size={14} /> : <Plus size={14} />}
                        </button>
                      )
                    })}
                  </>
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
                {tie.matches.length > 1 && <p className="mt-1 text-[10px] text-textMuted">{tie.matches.map((match, idx) => `M${idx + 1}:${match.score ? `${match.score.home}:${match.score.away}` : '-'}`).join(', ')} · total {tie.total ? `${tie.total.home}:${tie.total.away}` : '-'}</p>}
              </article>
            )
          })}
        </div>
      </div>

      {editable && mode === 'connect' && selectedHandle && (
        <button type="button" className="absolute left-3 top-3 z-30 inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-app/90 px-2 py-1 text-xs text-textMuted" onClick={() => setSelectedHandle(null)}>
          <X size={12} /> Сброс выбора
        </button>
      )}
    </section>
  )
}

export const buildInitialEditorNodes = (ties: PlayoffTieViewModel[]): BracketEditorNode[] => ties.map((tie, index) => ({
  id: `node_${tie.id}`,
  tieId: tie.id,
  stageId: tie.stageId,
  x: snapX((index % 6) * NODE_W),
  y: snapY(Math.floor(index / 6) * NODE_H),
  w: NODE_W,
  h: NODE_H,
}))
