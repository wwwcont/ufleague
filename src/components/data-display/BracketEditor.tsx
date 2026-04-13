import { useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { GitBranch, Hand, Pencil, Save } from 'lucide-react'
import type { BracketEditorEdge, BracketEditorNode, PlayoffTieViewModel, Team } from '../../domain/entities/types'
import { TeamAvatar } from '../ui/TeamAvatar'

type EditorMode = 'move' | 'connect' | 'edit'

const GRID = 24
const NODE_W = 220
const NODE_H = 132

const snap = (value: number) => Math.round(value / GRID) * GRID

const centerOf = (node: BracketEditorNode) => ({ x: node.x + node.w / 2, y: node.y + node.h / 2 })

export const BracketEditor = ({
  ties,
  nodes,
  edges,
  teamMap,
  onChange,
  onSave,
  onEditTie,
}: {
  ties: PlayoffTieViewModel[]
  nodes: BracketEditorNode[]
  edges: BracketEditorEdge[]
  teamMap: Record<string, Team>
  onChange: (next: { nodes: BracketEditorNode[]; edges: BracketEditorEdge[] }) => void
  onSave: () => void
  onEditTie?: (tieId: string) => void
}) => {
  const [mode, setMode] = useState<EditorMode>('move')
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 })

  const dragRef = useRef<{ nodeId: string; pointerStartX: number; pointerStartY: number; nodeStartX: number; nodeStartY: number } | null>(null)
  const panRef = useRef<{ pointerStartX: number; pointerStartY: number; x: number; y: number } | null>(null)

  const tieMap = useMemo(() => Object.fromEntries(ties.map((tie) => [tie.id, tie])), [ties])

  const edgeLines = useMemo(() => {
    const byTie = new Map(nodes.map((node) => [node.tieId, node]))
    return edges
      .map((edge) => {
        const from = byTie.get(edge.fromTieId)
        const to = byTie.get(edge.toTieId)
        if (!from || !to) return null
        const c1 = centerOf(from)
        const c2 = centerOf(to)
        return { id: edge.id, x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y }
      })
      .filter(Boolean) as Array<{ id: string; x1: number; y1: number; x2: number; y2: number }>
  }, [edges, nodes])

  const onNodePointerDown = (event: ReactPointerEvent, node: BracketEditorNode) => {
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

    if (mode === 'edit') {
      onEditTie?.(node.tieId)
    }
  }

  const onCanvasPointerDown = (event: ReactPointerEvent) => {
    if (event.target !== event.currentTarget) return
    panRef.current = { pointerStartX: event.clientX, pointerStartY: event.clientY, x: viewport.x, y: viewport.y }
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

  return (
    <section className="relative h-[calc(100dvh-13.5rem)] overflow-hidden rounded-2xl border border-borderSubtle bg-panelBg">
      <div className="absolute inset-x-3 bottom-3 z-30 flex items-center justify-between gap-2 rounded-xl border border-borderStrong bg-app/90 p-2 backdrop-blur">
        <div className="flex gap-1">
          <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'move' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('move')}><Hand size={14} className="inline" /> Move</button>
          <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'connect' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('connect')}><GitBranch size={14} className="inline" /> Connect</button>
          <button type="button" className={`rounded-lg px-3 py-2 text-xs ${mode === 'edit' ? 'bg-accentYellow text-app' : 'text-textMuted'}`} onClick={() => setMode('edit')}><Pencil size={14} className="inline" /> Edit</button>
        </div>
        <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={onSave}><Save size={14} className="inline" /> Save</button>
      </div>

      <div
        className="relative h-full w-full touch-none"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null; panRef.current = null }}
        onPointerCancel={() => { dragRef.current = null; panRef.current = null }}
        onWheel={(event) => {
          event.preventDefault()
          setViewport((prev) => ({ ...prev, scale: Math.max(0.35, Math.min(1.8, Number((prev.scale + (event.deltaY > 0 ? -0.08 : 0.08)).toFixed(2)))) }))
        }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`, backgroundSize: `${GRID}px ${GRID}px` }} />

        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, width: 3200, height: 2200 }}>
          <svg width={3200} height={2200} className="absolute left-0 top-0 pointer-events-none">
            {edgeLines.map((edge) => (
              <path
                key={edge.id}
                d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 80} ${edge.y1}, ${edge.x2 - 80} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                fill="none"
                stroke="rgba(227,193,75,0.8)"
                strokeWidth={3}
              />
            ))}
          </svg>

          {nodes.map((node) => {
            const tie = tieMap[node.tieId]
            if (!tie) return null
            return (
              <article
                key={node.id}
                className={`absolute rounded-xl border bg-panelAlt/95 p-3 shadow-soft ${connectingFrom === node.tieId ? 'border-accentYellow' : 'border-borderSubtle'}`}
                style={{ left: node.x, top: node.y, width: node.w, minHeight: node.h }}
                onPointerDown={(event) => onNodePointerDown(event, node)}
              >
                <p className="text-[10px] uppercase tracking-[0.08em] text-textMuted">{tie.stageLabel} • #{tie.slot}</p>
                <div className="mt-1 space-y-1">
                  {[tie.homeTeamId, tie.awayTeamId].map((teamId, index) => {
                    const team = teamId ? teamMap[teamId] : null
                    return (
                      <div key={`${node.id}_${index}`} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {team ? <TeamAvatar team={team} size="sm" /> : <div className="h-5 w-5 rounded-full bg-mutedBg" />}
                          <span className="truncate">{team?.shortName ?? 'TBD'}</span>
                        </div>
                        {tie.winnerTeamId && teamId === tie.winnerTeamId && <span className="text-[10px] text-accentYellow">WIN</span>}
                      </div>
                    )
                  })}
                </div>

                <div className="mt-2 space-y-1">
                  {tie.matches.length <= 1
                    ? <p className="text-xs text-textSecondary">{tie.matches[0]?.score ? `${tie.matches[0].score.home}:${tie.matches[0].score.away}` : '—'}</p>
                    : (
                      <>
                        {tie.matches.map((match, idx) => <p key={match.id} className="text-[11px] text-textMuted">M{idx + 1}: {match.score ? `${match.score.home}:${match.score.away}` : '—'}</p>)}
                        <p className="text-xs font-semibold text-textPrimary">Total: {tie.total ? `${tie.total.home}:${tie.total.away}` : '—'}</p>
                      </>
                    )}
                </div>
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
  y: snap(96 + Math.floor(index / 4) * 180),
  w: NODE_W,
  h: NODE_H,
}))
