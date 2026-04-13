import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { BracketEditor } from '../../components/data-display/BracketEditor'
import { StandingsTable } from '../../components/data-display/StandingsTable'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useBracket } from '../../hooks/data/useBracket'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'
import { useSession } from '../../app/providers/use-session'
import { canManageMatch } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import type { BracketEditorEdge, BracketEditorNode, PlayoffTieViewModel } from '../../domain/entities/types'

const ModeSwitch = ({ mode, setMode }: { mode: 'table' | 'bracket'; setMode: (mode: 'table' | 'bracket') => void }) => (
  <div className="matte-panel mb-3 flex p-1">
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'table' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('table')}>Таблица</button>
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'bracket' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('bracket')}>Сетка</button>
  </div>
)

export const TablePage = () => {
  const [mode, setMode] = useState<'table' | 'bracket'>('table')
  const [transitionName, setTransitionName] = useState<'swipe-left' | 'swipe-right'>('swipe-left')
  const { data: rows } = useStandings()
  const { data: bracket, refetch: refetchBracket } = useBracket()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { cabinetRepository, bracketRepository } = useRepositories()

  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((team) => [team.id, team])), [teams])
  const canEditBracket = canManageMatch(session)

  const [isEditingBracket, setIsEditingBracket] = useState(false)
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [bracketStatus, setBracketStatus] = useState<string | null>(null)

  const [editorNodes, setEditorNodes] = useState<BracketEditorNode[]>([])
  const [editorEdges, setEditorEdges] = useState<BracketEditorEdge[]>([])

  const [selectedTieId, setSelectedTieId] = useState<string | null>(null)
  const [tiePendingDelete, setTiePendingDelete] = useState<string | null>(null)
  const [pendingCreateAnchor, setPendingCreateAnchor] = useState<{ col: number; row: number } | null>(null)

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

  const mergedGroups = useMemo(() => bracket?.groups ?? [], [bracket?.groups])

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
    setEditorNodes((prev) => prev.filter((node) => tieIds.has(node.tieId)))
    setEditorEdges((prev) => prev.filter((edge) => tieIds.has(edge.fromTieId) && tieIds.has(edge.toTieId)))
  }, [tieViewModels])

  const loadLayoutFromBackend = async () => {
    if (!activeTournamentId || !cabinetRepository.getBracketEditorLayout) return
    const layout = await cabinetRepository.getBracketEditorLayout(activeTournamentId)
    if (!layout) {
      setEditorNodes([])
      setEditorEdges([])
      return
    }
    setEditorNodes(layout.nodes)
    setEditorEdges(layout.edges)
  }

  useEffect(() => {
    void loadLayoutFromBackend()
  }, [activeTournamentId, cabinetRepository])

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
      setBracketStatus('Нет активного турнира')
      return
    }
    if (!cabinetRepository.saveBracketEditorLayout) {
      setBracketStatus('Сохранение layout недоступно')
      return
    }
    void (async () => {
      await cabinetRepository.saveBracketEditorLayout?.({ tournamentId: activeTournamentId, nodes: editorNodes, edges: editorEdges })
      await loadLayoutFromBackend()
      await refetchBracket()
    })()
    setBracketStatus('Layout сохранён на сервере')
  }

  const handleUpsertTie = async () => {
    if (!tieHomeTeamId || !tieAwayTeamId || tieHomeTeamId === tieAwayTeamId) return

    if (selectedTieId) {
      setBracketStatus('Редактирование существующего tie через это окно отключено')
      setSelectedTieId(null)
      return
    }

    if (!pendingCreateAnchor) return

    const stageId = tieStageId || bracket?.stages?.[0]?.id || 'custom'
    const slot = Date.now()

    if (activeTournamentId && cabinetRepository.createBracketTie) {
      try {
        const created = await cabinetRepository.createBracketTie({
          tournamentId: activeTournamentId,
          stageId,
          slot,
          homeTeamId: tieHomeTeamId,
          awayTeamId: tieAwayTeamId,
        })
        let tieId = created?.id
        if (!tieId) {
          const fresh = await bracketRepository.getBracket()
          const candidate = [...fresh.groups]
            .reverse()
            .find((group) => group.stageId === stageId && group.homeTeamId === tieHomeTeamId && group.awayTeamId === tieAwayTeamId)
          tieId = candidate?.id
        }
        if (tieId) {
          setEditorNodes((prev) => [...prev, {
            id: `node_${tieId}`,
            tieId,
            stageId,
            x: (pendingCreateAnchor.col - 1) * 150,
            y: (pendingCreateAnchor.row - 1) * 78,
            w: 150,
            h: 78,
          }])
        }
        await refetchBracket()
        await loadLayoutFromBackend()
      } catch {
        setBracketStatus('Не удалось создать tie на сервере')
        return
      }
    } else {
      setBracketStatus('Нет API метода createBracketTie')
      return
    }

    setBracketStatus('Плей-офф добавлен на сервере')
    setPendingCreateAnchor(null)
  }

  const startCreateTie = (anchor: { col: number; row: number }) => {
    setPendingCreateAnchor(anchor)
    setSelectedTieId(null)
    setTieStageId(bracket?.stages?.[0]?.id ?? '')
    setTieHomeTeamId('')
    setTieAwayTeamId('')
  }

  const deleteTie = (tieId: string) => {
    setTiePendingDelete(null)
    setBracketStatus(`Удаление tie ${tieId} нужно делать через backend endpoint`)
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
