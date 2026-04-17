import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { TeamAvatar } from '../ui/TeamAvatar'
import type { PlayoffGrid, Team } from '../../domain/entities/types'

const GRID_COLS = 35
const GRID_ROWS = 35
const CELL_W = 132
const CELL_H = 66
const PAN_MARGIN_CELLS = 3

type EditorMode = 'navigation' | 'move' | 'lines'
type LineAnchorSide = 'left' | 'right'

type DraftCell = PlayoffGrid['cells'][number] & { clientKey: string }
type DraftLine = PlayoffGrid['lines'][number] & { clientKey: string; fromCellId: string; toCellId: string }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const sameLine = (a: { fromCellId: string; toCellId: string }, b: { fromCellId: string; toCellId: string }) => (
  (a.fromCellId === b.fromCellId && a.toCellId === b.toCellId)
  || (a.fromCellId === b.toCellId && a.toCellId === b.fromCellId)
)

const buildLinePath = (fromX: number, fromY: number, toX: number, toY: number) => ({ path: `M ${fromX} ${fromY} L ${toX} ${toY}`, midX: (fromX + toX) / 2, midY: (fromY + toY) / 2 })

export const PlayoffGridEditor = ({
  grid,
  teamMap,
  onSave,
  editable = true,
}: {
  grid: PlayoffGrid
  teamMap: Record<string, Team>
  onSave: (payload: {
    cells: Array<{ id?: string; tempId?: string; homeTeamId: string | null; awayTeamId: string | null; col: number; row: number; attachedMatchIds: string[] }>
    lines: Array<{ id?: string; fromRef: string; toRef: string }>
  }) => Promise<void>
  editable?: boolean
}) => {
  const toCells = (source: PlayoffGrid['cells']): DraftCell[] => source.map((cell, index) => ({ ...cell, clientKey: `cell:${cell.id}:${index}` }))
  const toLines = (source: PlayoffGrid['lines']): DraftLine[] => source.map((line, index) => ({ ...line, clientKey: `line:${line.id}:${index}`, fromCellId: line.fromPlayoffId, toCellId: line.toPlayoffId }))

  const [cellsDraft, setCellsDraft] = useState<DraftCell[]>(() => toCells(grid.cells))
  const [linesDraft, setLinesDraft] = useState<DraftLine[]>(() => toLines(grid.lines))
  const [dirty, setDirty] = useState(false)
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [lineSourceAnchor, setLineSourceAnchor] = useState<{ cellId: string; side: LineAnchorSide } | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>('navigation')
  const [viewport, setViewport] = useState({ x: 16, y: 16, scale: 0.76 })
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showCellDialog, setShowCellDialog] = useState(false)
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [cellDialogHomeTeamId, setCellDialogHomeTeamId] = useState<string | null>(null)
  const [cellDialogAwayTeamId, setCellDialogAwayTeamId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const boardW = GRID_COLS * CELL_W
  const boardH = GRID_ROWS * CELL_H
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const panStart = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null)
  const movingCell = useRef<{ id: string } | null>(null)

  useEffect(() => {
    setCellsDraft(toCells(grid.cells))
    setLinesDraft(toLines(grid.lines))
    setDirty(false)
    setSelectedCellId(null)
    setSelectedLineId(null)
    setLineSourceAnchor(null)
    setIsEditing(false)
    setShowCellDialog(false)
    setEditingCellId(null)
    setCellDialogHomeTeamId(null)
    setCellDialogAwayTeamId(null)
    setSaveError(null)
  }, [grid])

  useEffect(() => {
    if (!isEditing) setEditorMode('navigation')
    activePointers.current.clear()
    panStart.current = null
    pinchStart.current = null
    movingCell.current = null
  }, [isEditing])

  const cellsById = useMemo(() => Object.fromEntries(cellsDraft.map((cell) => [cell.id, cell])), [cellsDraft])

  const clampViewport = (next: { x: number; y: number; scale: number }) => {
    const viewportBounds = wrapperRef.current?.getBoundingClientRect()
    if (!viewportBounds) return next
    const marginX = PAN_MARGIN_CELLS * CELL_W * next.scale
    const marginY = PAN_MARGIN_CELLS * CELL_H * next.scale
    const minX = viewportBounds.width - boardW * next.scale - marginX
    const maxX = marginX
    const minY = viewportBounds.height - boardH * next.scale - marginY
    const maxY = marginY
    return {
      x: clamp(next.x, Math.min(minX, maxX), Math.max(minX, maxX)),
      y: clamp(next.y, Math.min(minY, maxY), Math.max(minY, maxY)),
      scale: clamp(next.scale, 0.55, 1.9),
    }
  }

  const occupied = useMemo(() => new Map(cellsDraft.map((cell) => [`${cell.col}:${cell.row}`, cell.id])), [cellsDraft])
  const showEditorOverlays = editable && isEditing

  const moveCellToPoint = (cellId: string, clientX: number, clientY: number) => {
    const wrap = wrapperRef.current?.getBoundingClientRect()
    if (!wrap) return
    const localX = (clientX - wrap.left - viewport.x) / viewport.scale
    const localY = (clientY - wrap.top - viewport.y) / viewport.scale
    const nextCol = clamp(Math.round(localX / CELL_W) + 1, 1, GRID_COLS)
    const nextRow = clamp(Math.round(localY / CELL_H) + 1, 1, GRID_ROWS)
    const slot = `${nextCol}:${nextRow}`
    const occupiedBy = occupied.get(slot)
    if (occupiedBy && occupiedBy !== cellId) return
    setCellsDraft((prev) => prev.map((cell) => (cell.id === cellId ? { ...cell, col: nextCol, row: nextRow } : cell)))
    setDirty(true)
  }

  const openAddCellDialog = () => {
    setEditingCellId(null)
    setCellDialogHomeTeamId(null)
    setCellDialogAwayTeamId(null)
    setShowCellDialog(true)
  }

  const openEditCellDialog = (cellId: string) => {
    const cell = cellsById[cellId]
    if (!cell) return
    setEditingCellId(cellId)
    setCellDialogHomeTeamId(cell.homeTeamId)
    setCellDialogAwayTeamId(cell.awayTeamId)
    setShowCellDialog(true)
  }

  const submitCellDialog = () => {
    if (editingCellId) {
      setCellsDraft((prev) => prev.map((cell) => (
        cell.id === editingCellId
          ? { ...cell, homeTeamId: cellDialogHomeTeamId, awayTeamId: cellDialogAwayTeamId }
          : cell
      )))
      setDirty(true)
      setShowCellDialog(false)
      return
    }
    for (let row = 1; row <= GRID_ROWS; row += 1) {
      for (let col = 1; col <= GRID_COLS; col += 1) {
        if (!occupied.has(`${col}:${row}`)) {
          const tmpId = `tmp_${Date.now()}_${row}_${col}`
          setCellsDraft((prev) => [...prev, {
            id: tmpId,
            clientKey: `cell:${tmpId}`,
            homeTeamId: cellDialogHomeTeamId,
            awayTeamId: cellDialogAwayTeamId,
            col,
            row,
            attachedMatchIds: [],
            attachedMatches: [],
            aggregateHomeScore: null,
            aggregateAwayScore: null,
            winnerTeamId: null,
            allMatchesFinished: false,
          }])
          setSelectedCellId(tmpId)
          setDirty(true)
          setShowCellDialog(false)
          return
        }
      }
    }
  }

  const boardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (activePointers.current.size === 2) {
      const points = [...activePointers.current.values()]
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      pinchStart.current = { dist, scale: viewport.scale }
      return
    }
    if (editorMode === 'navigation') {
      panStart.current = { startX: event.clientX, startY: event.clientY, baseX: viewport.x, baseY: viewport.y }
    }
  }

  const boardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return
    activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (isEditing && movingCell.current && editorMode === 'move') {
      moveCellToPoint(movingCell.current.id, event.clientX, event.clientY)
      return
    }

    if (activePointers.current.size >= 2 && pinchStart.current) {
      const points = [...activePointers.current.values()]
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
      const nextScale = clamp(pinchStart.current.scale * (dist / pinchStart.current.dist), 0.55, 1.9)
      setViewport((prev) => clampViewport({ ...prev, scale: nextScale }))
      return
    }

    const pan = panStart.current
    if (editorMode === 'navigation' && pan) {
      const dx = event.clientX - pan.startX
      const dy = event.clientY - pan.startY
      setViewport((prev) => clampViewport({ ...prev, x: pan.baseX + dx, y: pan.baseY + dy }))
    }
  }

  const boardWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    setViewport((prev) => clampViewport({ ...prev, scale: clamp(prev.scale + delta, 0.55, 1.9) }))
  }

  const boardPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId)
    if (activePointers.current.size < 2) pinchStart.current = null
    panStart.current = null
    movingCell.current = null
  }

  const onLineAnchorTap = (cellId: string, side: LineAnchorSide) => {
    setSelectedCellId(cellId)
    setSelectedLineId(null)
    if (!editable || !isEditing || editorMode !== 'lines') return
    if (!lineSourceAnchor) {
      setLineSourceAnchor({ cellId, side })
      return
    }
    if (lineSourceAnchor.cellId === cellId && lineSourceAnchor.side === side) {
      setLineSourceAnchor(null)
      return
    }
    const probe = { fromCellId: lineSourceAnchor.cellId, toCellId: cellId }
    const existing = linesDraft.find((line) => sameLine(line, probe))
    if (existing) {
      setLinesDraft((prev) => prev.filter((line) => line.id !== existing.id))
    } else {
      setLinesDraft((prev) => [...prev, {
        id: `tmp_line_${Date.now()}`,
        clientKey: `tmp-line:${Date.now()}`,
        fromPlayoffId: probe.fromCellId,
        toPlayoffId: probe.toCellId,
        fromCellId: probe.fromCellId,
        toCellId: probe.toCellId,
      }])
    }
    setLineSourceAnchor(null)
    setDirty(true)
  }

  const deleteCell = (cellId: string) => {
    setCellsDraft((prev) => prev.filter((cell) => cell.id !== cellId))
    setLinesDraft((prev) => prev.filter((line) => line.fromCellId !== cellId && line.toCellId !== cellId))
    setSelectedCellId((prev) => (prev === cellId ? null : prev))
    setDirty(true)
  }

  const saveDraft = async () => {
    const payload = {
      cells: cellsDraft.map((cell) => ({
        id: cell.id.startsWith('tmp_') ? undefined : cell.id,
        tempId: cell.id.startsWith('tmp_') ? `temp:${cell.id}` : undefined,
        homeTeamId: cell.homeTeamId,
        awayTeamId: cell.awayTeamId,
        col: cell.col,
        row: cell.row,
        attachedMatchIds: cell.attachedMatchIds,
      })),
      lines: linesDraft.map((line) => ({
        id: line.id.startsWith('tmp_') ? undefined : line.id,
        fromRef: line.fromCellId.startsWith('tmp_') ? `temp:${line.fromCellId}` : line.fromCellId,
        toRef: line.toCellId.startsWith('tmp_') ? `temp:${line.toCellId}` : line.toCellId,
      })),
    }
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(payload)
      setDirty(false)
      setIsEditing(false)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Ошибка сохранения сетки')
    } finally {
      setSaving(false)
    }
  }

  const cancelDraft = () => {
    setCellsDraft(toCells(grid.cells))
    setLinesDraft(toLines(grid.lines))
    setDirty(false)
    setSelectedCellId(null)
    setSelectedLineId(null)
    setLineSourceAnchor(null)
    setIsEditing(false)
    setShowCancelConfirm(false)
  }

  const deleteSelectedLine = () => {
    if (!selectedLineId) return
    setLinesDraft((prev) => prev.filter((line) => line.id !== selectedLineId))
    setSelectedLineId(null)
    setDirty(true)
  }

  const focusOnActiveArea = () => {
    if (!cellsDraft.length) return
    const minCol = Math.min(...cellsDraft.map((cell) => cell.col))
    const maxCol = Math.max(...cellsDraft.map((cell) => cell.col))
    const minRow = Math.min(...cellsDraft.map((cell) => cell.row))
    const maxRow = Math.max(...cellsDraft.map((cell) => cell.row))
    const wrap = wrapperRef.current?.getBoundingClientRect()
    if (!wrap) return
    const contentW = (maxCol - minCol + 1) * CELL_W
    const contentH = (maxRow - minRow + 1) * CELL_H
    const targetScale = clamp(Math.min((wrap.width * 0.86) / contentW, (wrap.height * 0.82) / contentH), 0.65, 1.55)
    const centerX = ((minCol + maxCol) / 2 - 0.5) * CELL_W
    const centerY = ((minRow + maxRow) / 2 - 0.5) * CELL_H
    setViewport(() => clampViewport({
      x: wrap.width / 2 - centerX * targetScale,
      y: wrap.height / 2 - centerY * targetScale,
      scale: targetScale,
    }))
  }

  return (
    <section data-allow-zoom="true" className="relative mb-[calc(74px+env(safe-area-inset-bottom,0px))] h-[calc(100svh-14.25rem)] overflow-hidden rounded-2xl border border-borderSubtle bg-panelBg md:mb-0 md:h-[calc(100vh-13.5rem)]">
      <div
        ref={wrapperRef}
        className="relative h-full w-full touch-none"
        onPointerDown={boardPointerDown}
        onPointerMove={boardPointerMove}
        onPointerUp={boardPointerUp}
        onPointerCancel={boardPointerUp}
        onPointerLeave={boardPointerUp}
        onWheel={boardWheel}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: boardW, height: boardH, transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
        >
          <svg width={boardW} height={boardH} className="absolute left-0 top-0">
            <defs>
              {linesDraft.map((line) => {
                const from = cellsById[line.fromCellId]
                const to = cellsById[line.toCellId]
                if (!from || !to) return null
                const fromX = (from.col - 1) * CELL_W + (to.col >= from.col ? CELL_W : 0)
                const fromY = (from.row - 1) * CELL_H + CELL_H / 2
                const toX = (to.col - 1) * CELL_W + (to.col >= from.col ? 0 : CELL_W)
                const toY = (to.row - 1) * CELL_H + CELL_H / 2
                const gradientId = `line-glow-${line.clientKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`
                return (
                  <linearGradient key={gradientId} id={gradientId} x1={fromX} y1={fromY} x2={toX} y2={toY} gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f4cf49" stopOpacity="0" />
                    <stop offset="12%" stopColor="#f4cf49" stopOpacity="0.8" />
                    <stop offset="88%" stopColor="#f4cf49" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f4cf49" stopOpacity="0" />
                  </linearGradient>
                )
              })}
            </defs>
            {showEditorOverlays && Array.from({ length: GRID_COLS + 1 }, (_, col) => <line key={`col:${col}`} x1={col * CELL_W} x2={col * CELL_W} y1={0} y2={boardH} stroke="rgba(255,255,255,0.08)" />)}
            {showEditorOverlays && Array.from({ length: GRID_ROWS + 1 }, (_, row) => <line key={`row:${row}`} x1={0} x2={boardW} y1={row * CELL_H} y2={row * CELL_H} stroke="rgba(255,255,255,0.08)" />)}
            {linesDraft.map((line) => {
              const from = cellsById[line.fromCellId]
              const to = cellsById[line.toCellId]
              if (!from || !to) return null
              const fromX = (from.col - 1) * CELL_W + (to.col >= from.col ? CELL_W : 0)
              const fromY = (from.row - 1) * CELL_H + CELL_H / 2
              const toX = (to.col - 1) * CELL_W + (to.col >= from.col ? 0 : CELL_W)
              const toY = (to.row - 1) * CELL_H + CELL_H / 2
              const path = buildLinePath(fromX, fromY, toX, toY)
              const gradientId = `line-glow-${line.clientKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`
              return (
                <g key={line.clientKey}>
                  <path
                    d={path.path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    onPointerDown={(event) => {
                      event.stopPropagation()
                      setSelectedLineId(line.id)
                      setSelectedCellId(null)
                    }}
                  />
                  <path
                    d={path.path}
                    fill="none"
                    stroke={selectedLineId === line.id ? '#f4cf49' : `url(#${gradientId})`}
                    strokeWidth={selectedLineId === line.id ? 4.4 : 3.1}
                    strokeLinecap="round"
                    pointerEvents="none"
                  />
                  {editable && isEditing && editorMode === 'lines' && (
                    <g transform={`translate(${path.midX}, ${path.midY})`}>
                      <circle r="9" fill="rgba(18, 23, 39, 0.95)" stroke="rgba(255,255,255,0.2)" />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fontSize="11"
                        fill="#f87171"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          setLinesDraft((prev) => prev.filter((item) => item.id !== line.id))
                          setSelectedLineId(null)
                          setDirty(true)
                        }}
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>

          {cellsDraft.map((cell) => {
            const isSelected = selectedCellId === cell.id
            const home = cell.homeTeamId ? teamMap[cell.homeTeamId] : null
            const away = cell.awayTeamId ? teamMap[cell.awayTeamId] : null
            const totalHome = cell.aggregateHomeScore ?? null
            const totalAway = cell.aggregateAwayScore ?? null
            const showWinner = Boolean(cell.allMatchesFinished && cell.winnerTeamId)
            const hasSingleMatch = cell.attachedMatches.length === 1
            const hasSeries = cell.attachedMatches.length > 1
            const homeScoreLabel = hasSingleMatch
              ? `${cell.attachedMatches[0].homeScore}`
              : hasSeries
                ? `${totalHome ?? '-'}`
                : '-'
            const awayScoreLabel = hasSingleMatch
              ? `${cell.attachedMatches[0].awayScore}`
              : hasSeries
                ? `${totalAway ?? '-'}`
                : '-'

            return (
              <div
                key={cell.clientKey}
                className={`absolute bg-transparent px-1 py-1 text-left ${showEditorOverlays && isSelected ? 'outline outline-2 outline-accentYellow/80' : ''}`}
                style={{ left: (cell.col - 1) * CELL_W, top: (cell.row - 1) * CELL_H, width: CELL_W, height: CELL_H }}
                onPointerDown={() => {
                  if (editable && isEditing && editorMode === 'move') movingCell.current = { id: cell.id }
                }}
                onClick={() => {
                  setSelectedCellId(cell.id)
                  setSelectedLineId(null)
                }}
              >
                {showEditorOverlays && (
                  <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded bg-panelBg/95 text-[10px] text-textSecondary"
                      onClick={(event) => {
                        event.stopPropagation()
                        openEditCellDialog(cell.id)
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded bg-panelBg/95 text-[10px] text-red-400"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteCell(cell.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
                <div className="h-full rounded-xl border border-accentYellow/30 bg-panelAlt/95 px-2 py-1 shadow-soft" style={{ boxShadow: 'inset 14px 0 18px rgba(244,207,73,0.2), inset -14px 0 18px rgba(244,207,73,0.2)' }}>
                  <div className="grid h-full grid-rows-2 gap-y-1">
                    <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-1">
                      {home ? <TeamAvatar team={home} size="sm" fit="cover" className="h-[18px] w-[18px] rounded-md border border-white/15 bg-white/10 p-[1px]" /> : <span className="h-[18px] w-[18px] rounded-md border border-dashed border-borderSubtle/70" />}
                      <span className={`truncate text-[11px] font-semibold ${showWinner && cell.winnerTeamId === cell.homeTeamId ? 'text-accentYellow' : 'text-textPrimary'}`}>{home?.shortName ?? 'TBD'}</span>
                      <span className="text-[11px] font-semibold text-textSecondary tabular-nums">{homeScoreLabel}</span>
                    </div>
                    <div className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-1">
                      {away ? <TeamAvatar team={away} size="sm" fit="cover" className="h-[18px] w-[18px] rounded-md border border-white/15 bg-white/10 p-[1px]" /> : <span className="h-[18px] w-[18px] rounded-md border border-dashed border-borderSubtle/70" />}
                      <span className={`truncate text-[11px] font-semibold ${showWinner && cell.winnerTeamId === cell.awayTeamId ? 'text-accentYellow' : 'text-textPrimary'}`}>{away?.shortName ?? 'TBD'}</span>
                      <span className="text-[11px] font-semibold text-textSecondary tabular-nums">{awayScoreLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {editable && isEditing && editorMode === 'lines' && cellsDraft.map((cell) => (
            <div key={`anchors:${cell.id}`} className="absolute" style={{ left: (cell.col - 1) * CELL_W, top: (cell.row - 1) * CELL_H, width: CELL_W, height: CELL_H }}>
              <button
                type="button"
                className="absolute left-[-10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-borderSubtle bg-panelBg text-[12px] text-textPrimary"
                onClick={(event) => {
                  event.stopPropagation()
                  onLineAnchorTap(cell.id, 'left')
                }}
              >
                +
              </button>
              <button
                type="button"
                className="absolute right-[-10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border border-borderSubtle bg-panelBg text-[12px] text-textPrimary"
                onClick={(event) => {
                  event.stopPropagation()
                  onLineAnchorTap(cell.id, 'right')
                }}
              >
                +
              </button>
            </div>
          ))}
        </div>
      </div>

      {editable && !isEditing && (
        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={focusOnActiveArea}
            className="rounded-lg border border-borderSubtle bg-panelAlt px-3 py-2 text-xs font-semibold text-textSecondary"
          >
            Фокус
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app"
          >
            Редактировать
          </button>
        </div>
      )}

      {editable && isEditing && (
        <div className="absolute inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom,0px))] border-t border-borderSubtle bg-app/95 p-2 md:bottom-0">
        <div className="grid grid-cols-4 gap-2 text-xs">
          <button type="button" onClick={() => setEditorMode('navigation')} className={`rounded-lg px-2 py-2 ${editorMode === 'navigation' ? 'bg-accentYellow text-app font-semibold' : 'bg-panelAlt text-textSecondary'}`}>Навигация</button>
          <button type="button" onClick={() => setEditorMode('move')} className={`rounded-lg px-2 py-2 ${editorMode === 'move' ? 'bg-accentYellow text-app font-semibold' : 'bg-panelAlt text-textSecondary'}`}>Движение</button>
          <button type="button" onClick={() => setEditorMode('lines')} className={`rounded-lg px-2 py-2 ${editorMode === 'lines' ? 'bg-accentYellow text-app font-semibold' : 'bg-panelAlt text-textSecondary'}`}>Линии</button>
          <button type="button" onClick={openAddCellDialog} className="rounded-lg border border-borderSubtle px-2 py-2 text-textSecondary">Добавить</button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <button type="button" onClick={() => (dirty ? setShowCancelConfirm(true) : cancelDraft())} className="rounded-lg border border-borderSubtle px-2 py-2 text-textSecondary">Отмена</button>
          <button type="button" disabled={!selectedLineId} onClick={deleteSelectedLine} className="rounded-lg border border-borderSubtle px-2 py-2 text-textSecondary disabled:opacity-40">Удалить линию</button>
          <button type="button" disabled={!dirty || saving} onClick={() => { void saveDraft() }} className="rounded-lg bg-accentYellow px-2 py-2 font-semibold text-app disabled:opacity-50">Сохранить</button>
        </div>
        {saveError && <p className="mt-2 text-xs text-red-400">{saveError}</p>}
        </div>
      )}

      <ConfirmDialog
        open={editable && isEditing && showCancelConfirm}
        title="Отменить изменения?"
        description="Несохраненные изменения сетки будут потеряны."
        confirmLabel="Сбросить"
        onConfirm={cancelDraft}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {editable && isEditing && showCellDialog && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-borderSubtle bg-app p-4">
            <p className="mb-3 text-sm font-semibold">{editingCellId ? 'Редактировать плейофф' : 'Добавить плейофф'}</p>
            <div className="space-y-2">
              <label className="block text-xs text-textMuted">Команда 1 (необязательно)</label>
              <select
                className="w-full rounded-lg border border-borderSubtle bg-panelAlt px-2 py-2 text-sm text-textPrimary"
                value={cellDialogHomeTeamId ?? ''}
                onChange={(event) => setCellDialogHomeTeamId(event.target.value || null)}
              >
                <option value="" className="text-app">Не выбрана</option>
                {Object.values(teamMap).map((team) => <option key={team.id} value={team.id} className="text-app">{team.shortName}</option>)}
              </select>
              <label className="block text-xs text-textMuted">Команда 2 (необязательно)</label>
              <select
                className="w-full rounded-lg border border-borderSubtle bg-panelAlt px-2 py-2 text-sm text-textPrimary"
                value={cellDialogAwayTeamId ?? ''}
                onChange={(event) => setCellDialogAwayTeamId(event.target.value || null)}
              >
                <option value="" className="text-app">Не выбрана</option>
                {Object.values(teamMap).map((team) => <option key={team.id} value={team.id} className="text-app">{team.shortName}</option>)}
              </select>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="rounded-lg border border-borderSubtle px-2 py-2 text-sm text-textSecondary" onClick={() => setShowCellDialog(false)}>Отмена</button>
              <button type="button" className="rounded-lg bg-accentYellow px-2 py-2 text-sm font-semibold text-app" onClick={submitCellDialog}>{editingCellId ? 'Сохранить' : 'Добавить'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
