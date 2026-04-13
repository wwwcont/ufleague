import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { BracketEditor, buildInitialEditorNodes } from '../../components/data-display/BracketEditor'
import { StandingsTable } from '../../components/data-display/StandingsTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useBracket } from '../../hooks/data/useBracket'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'
import { useSession } from '../../app/providers/use-session'
import { canManageMatch } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import type { BracketEditorEdge, BracketEditorNode, BracketMatchGroup, PlayoffTieViewModel } from '../../domain/entities/types'

const ModeSwitch = ({ mode, setMode }: { mode: 'table' | 'bracket'; setMode: (mode: 'table' | 'bracket') => void }) => (
  <div className="matte-panel mb-3 flex p-1">
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'table' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('table')}>Таблица</button>
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'bracket' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('bracket')}>Сетка</button>
  </div>
)

const NODE_W = 150
const NODE_H = 78

export const TablePage = () => {
  const [mode, setMode] = useState<'table' | 'bracket'>('table')
  const [transitionName, setTransitionName] = useState<'swipe-left' | 'swipe-right'>('swipe-left')
  const { data: rows } = useStandings()
  const { data: bracket } = useBracket()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { cabinetRepository } = useRepositories()

  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((team) => [team.id, team])), [teams])
  const canEditBracket = canManageMatch(session)

  const [isEditingBracket, setIsEditingBracket] = useState(false)
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [bracketStatus, setBracketStatus] = useState<string | null>(null)

  const [localCreatedGroups, setLocalCreatedGroups] = useState<BracketMatchGroup[]>([])
  const [deletedTieIds, setDeletedTieIds] = useState<Set<string>>(new Set())
  const [editorNodes, setEditorNodes] = useState<BracketEditorNode[]>([])
  const [editorEdges, setEditorEdges] = useState<BracketEditorEdge[]>([])

  const [selectedTieId, setSelectedTieId] = useState<string | null>(null)
  const [tiePendingDelete, setTiePendingDelete] = useState<string | null>(null)
  const [pendingCreateAnchor, setPendingCreateAnchor] = useState<{ x: number; y: number } | null>(null)

  const [tieStageId, setTieStageId] = useState('')
  const [tieHomeTeamId, setTieHomeTeamId] = useState('')
  const [tieAwayTeamId, setTieAwayTeamId] = useState('')

  const changeMode = (nextMode: 'table' | 'bracket') => {
    if (nextMode === mode) return
    setTransitionName(nextMode === 'bracket' ? 'swipe-left' : 'swipe-right')
    setMode(nextMode)
  }

  useEffect(() => {
    if (mode !== 'bracket') {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mode])

  useEffect(() => {
    if (!canEditBracket) return
    void (async () => {
      const cycles = await cabinetRepository.getTournamentCycles?.()
      const active = cycles?.find((item) => item.isActive)
      if (active) setActiveTournamentId(active.id)
    })()
  }, [cabinetRepository, canEditBracket])

  const mergedGroups = useMemo(() => {
    const remote = bracket?.groups ?? []
    return [...remote, ...localCreatedGroups].filter((group) => !deletedTieIds.has(group.id))
  }, [bracket?.groups, deletedTieIds, localCreatedGroups])

  useEffect(() => {
    if ((bracket?.groups?.length ?? 0) > 0 || localCreatedGroups.length > 0) return
    const demo: BracketMatchGroup[] = [
      {
        id: 'demo_tie_1',
        stageId: 'demo_stage',
        slot: 1,
        homeTeamId: (teams ?? [])[0]?.id ?? null,
        awayTeamId: (teams ?? [])[1]?.id ?? null,
        winnerTeamId: null,
        tieFormat: 1,
        firstLeg: { matchId: null, status: 'scheduled' },
      },
      {
        id: 'demo_tie_2',
        stageId: 'demo_stage',
        slot: 2,
        homeTeamId: (teams ?? [])[2]?.id ?? null,
        awayTeamId: (teams ?? [])[3]?.id ?? null,
        winnerTeamId: null,
        tieFormat: 1,
        firstLeg: { matchId: null, status: 'scheduled' },
      },
      {
        id: 'demo_tie_3',
        stageId: 'demo_stage',
        slot: 3,
        homeTeamId: null,
        awayTeamId: null,
        winnerTeamId: null,
        tieFormat: 1,
        firstLeg: { matchId: null, status: 'scheduled' },
      },
    ]
    setLocalCreatedGroups(demo)
    setEditorNodes([
      { id: 'node_demo_1', tieId: 'demo_tie_1', stageId: 'demo_stage', x: 120, y: 160, w: NODE_W, h: NODE_H },
      { id: 'node_demo_2', tieId: 'demo_tie_2', stageId: 'demo_stage', x: 120, y: 360, w: NODE_W, h: NODE_H },
      { id: 'node_demo_3', tieId: 'demo_tie_3', stageId: 'demo_stage', x: 460, y: 260, w: NODE_W, h: NODE_H },
    ])
    setEditorEdges([
      { id: 'demo_tie_1:demo_tie_3', fromTieId: 'demo_tie_1', toTieId: 'demo_tie_3', type: 'winner' },
      { id: 'demo_tie_2:demo_tie_3', fromTieId: 'demo_tie_2', toTieId: 'demo_tie_3', type: 'winner' },
    ])
  }, [bracket, localCreatedGroups.length, teams])

  const tieViewModels = useMemo<PlayoffTieViewModel[]>(() => {
    const stageById = Object.fromEntries((bracket?.stages ?? []).map((stage) => [stage.id, stage]))
    return mergedGroups.map((group) => {
      const matches = [group.firstLeg, group.secondLeg, group.thirdLeg]
        .filter(Boolean)
        .map((leg, index) => ({
          id: String(leg?.matchId ?? `${group.id}_${index + 1}`),
          status: leg?.status ?? 'scheduled',
          score: leg?.score,
        }))

      const total = matches.length > 1 && matches.every((item) => item.score)
        ? {
          home: matches.reduce((sum, item) => sum + (item.score?.home ?? 0), 0),
          away: matches.reduce((sum, item) => sum + (item.score?.away ?? 0), 0),
        }
        : null

      return {
        id: group.id,
        stageId: group.stageId,
        stageLabel: stageById[group.stageId]?.label ?? group.stageId,
        slot: group.slot,
        homeTeamId: group.homeTeamId,
        awayTeamId: group.awayTeamId,
        winnerTeamId: group.winnerTeamId,
        matches,
        total,
      }
    })
  }, [bracket?.stages, mergedGroups])

  useEffect(() => {
    const tieIds = new Set(tieViewModels.map((tie) => tie.id))

    setEditorNodes((prev) => {
      const filtered = prev.filter((node) => tieIds.has(node.tieId))
      const missingTies = tieViewModels.filter((tie) => !filtered.some((node) => node.tieId === tie.id))
      if (missingTies.length === 0) return filtered
      return [...filtered, ...buildInitialEditorNodes(missingTies)]
    })

    setEditorEdges((prev) => prev.filter((edge) => tieIds.has(edge.fromTieId) && tieIds.has(edge.toTieId)))
  }, [tieViewModels])

  useEffect(() => {
    if (!activeTournamentId) return
    const raw = localStorage.getItem(`bracket_editor_layout_${activeTournamentId}`)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { nodes?: BracketEditorNode[]; edges?: BracketEditorEdge[] }
      if (Array.isArray(parsed.nodes)) setEditorNodes(parsed.nodes)
      if (Array.isArray(parsed.edges)) setEditorEdges(parsed.edges)
    } catch {
      // ignore malformed cache
    }
  }, [activeTournamentId])

  const openTieEdit = (tieId: string) => {
    const tie = mergedGroups.find((group) => group.id === tieId)
    if (!tie) return
    setSelectedTieId(tie.id)
    setTieStageId(tie.stageId)
    setTieHomeTeamId(tie.homeTeamId ?? '')
    setTieAwayTeamId(tie.awayTeamId ?? '')
    setPendingCreateAnchor(null)
  }

  const saveLayout = () => {
    if (!activeTournamentId) {
      setBracketStatus('Layout сохранён локально')
      return
    }
    localStorage.setItem(`bracket_editor_layout_${activeTournamentId}`, JSON.stringify({ nodes: editorNodes, edges: editorEdges }))
    setBracketStatus('Layout сохранён')
  }

  const handleUpsertTie = async () => {
    if (!tieHomeTeamId || !tieAwayTeamId || tieHomeTeamId === tieAwayTeamId) return

    if (selectedTieId) {
      setLocalCreatedGroups((prev) => prev.map((group) => (group.id === selectedTieId
        ? { ...group, stageId: tieStageId || group.stageId, homeTeamId: tieHomeTeamId, awayTeamId: tieAwayTeamId }
        : group)))
      setBracketStatus('Плей-офф обновлён локально')
      setSelectedTieId(null)
      return
    }

    if (!pendingCreateAnchor) return

    const tieId = `local_tie_${Date.now()}`
    const stageId = tieStageId || bracket?.stages?.[0]?.id || 'custom'
    const nextGroup: BracketMatchGroup = {
      id: tieId,
      stageId,
      slot: Date.now(),
      homeTeamId: tieHomeTeamId,
      awayTeamId: tieAwayTeamId,
      winnerTeamId: null,
      tieFormat: 1,
      firstLeg: { matchId: null, status: 'scheduled' },
    }

    setLocalCreatedGroups((prev) => [...prev, nextGroup])
    setEditorNodes((prev) => [...prev, {
      id: `node_${tieId}`,
      tieId,
      stageId,
      x: pendingCreateAnchor.x,
      y: pendingCreateAnchor.y,
      w: NODE_W,
      h: NODE_H,
    }])

    if (activeTournamentId && cabinetRepository.createBracketTie) {
      try {
        await cabinetRepository.createBracketTie({
          tournamentId: activeTournamentId,
          stageId,
          slot: nextGroup.slot,
          homeTeamId: tieHomeTeamId,
          awayTeamId: tieAwayTeamId,
        })
      } catch {
        // local-first mode
      }
    }

    setBracketStatus('Плей-офф добавлен')
    setPendingCreateAnchor(null)
  }

  const startCreateTie = (anchor: { x: number; y: number }) => {
    setPendingCreateAnchor(anchor)
    setSelectedTieId(null)
    setTieStageId(bracket?.stages?.[0]?.id ?? '')
    setTieHomeTeamId('')
    setTieAwayTeamId('')
  }

  const deleteTie = (tieId: string) => {
    setLocalCreatedGroups((prev) => prev.filter((group) => group.id !== tieId))
    setDeletedTieIds((prev) => new Set(prev).add(tieId))
    setEditorNodes((prev) => prev.filter((node) => node.tieId !== tieId))
    setEditorEdges((prev) => prev.filter((edge) => edge.fromTieId !== tieId && edge.toTieId !== tieId))
    setTiePendingDelete(null)
    setBracketStatus('Плей-офф удалён вместе со связанными линиями')
  }

  return (
    <div className="px-4 pb-20 pt-6 md:px-6">
      <ModeSwitch mode={mode} setMode={changeMode} />

      {mode === 'bracket' && canEditBracket && (
        <div className="mb-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${isEditingBracket ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textMuted'}`}
            onClick={() => {
              setIsEditingBracket((prev) => !prev)
              setSelectedTieId(null)
              setPendingCreateAnchor(null)
            }}
          >
            <Pencil size={12} /> {isEditingBracket ? 'Завершить редактирование' : 'Редактировать сетку'}
          </button>
        </div>
      )}

      <div key={mode} className={transitionName === 'swipe-left' ? 'mode-swipe-left' : 'mode-swipe-right'}>
        {mode === 'bracket'
          ? (
            <>
              <BracketEditor
                ties={tieViewModels}
                nodes={editorNodes}
                edges={editorEdges}
                teamMap={teamMap}
                editable={isEditingBracket}
                showGrid={isEditingBracket}
                onChange={({ nodes, edges }) => {
                  setEditorNodes(nodes)
                  setEditorEdges(edges)
                }}
                onEditTie={openTieEdit}
                onDeleteTie={(tieId) => setTiePendingDelete(tieId)}
                onRequestCreateTie={startCreateTie}
                onSave={saveLayout}
              />
              {bracketStatus && <p className="mt-2 text-xs text-textMuted">{bracketStatus}</p>}
            </>
          )
          : rows && (
            <PageContainer className="px-0">
              <StandingsTable rows={rows} teamMap={teamMap} />
            </PageContainer>
          )}
      </div>

      <ConfirmDialog
        open={Boolean(tiePendingDelete)}
        title="Подтвердить удаление"
        description="Удалить плей-офф и все связанные линии?"
        confirmLabel="Удалить"
        onCancel={() => setTiePendingDelete(null)}
        onConfirm={() => {
          if (!tiePendingDelete) return
          deleteTie(tiePendingDelete)
        }}
      />

      {(selectedTieId || pendingCreateAnchor) && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
            <p className="text-sm font-semibold text-textPrimary">{selectedTieId ? 'Редактировать плей-офф' : 'Новый плей-офф'}</p>
            <p className="mt-1 text-xs text-textSecondary">Добавление требует выбора двух команд.</p>

            <select value={tieStageId} onChange={(event) => setTieStageId(event.target.value)} className="mt-3 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
              {(bracket?.stages ?? []).map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
            <select value={tieHomeTeamId} onChange={(event) => setTieHomeTeamId(event.target.value)} className="mt-2 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
              <option value="">Команда 1</option>
              {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
            </select>
            <select value={tieAwayTeamId} onChange={(event) => setTieAwayTeamId(event.target.value)} className="mt-2 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
              <option value="">Команда 2</option>
              {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTieId(null)
                  setPendingCreateAnchor(null)
                }}
                className="rounded-lg border border-borderSubtle px-3 py-1.5 text-sm text-textSecondary"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!tieHomeTeamId || !tieAwayTeamId || tieHomeTeamId === tieAwayTeamId}
                className="rounded-lg bg-accentYellow px-3 py-1.5 text-sm font-semibold text-app disabled:opacity-50"
                onClick={() => { void handleUpsertTie() }}
              >
                {selectedTieId ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
