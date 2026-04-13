import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { BracketView } from '../../components/data-display/BracketView'
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
import type { BracketEditorEdge, BracketEditorNode, BracketMatchGroup, BracketStage, PlayoffTieViewModel } from '../../domain/entities/types'

const ModeSwitch = ({ mode, setMode }: { mode: 'table' | 'bracket'; setMode: (mode: 'table' | 'bracket') => void }) => (
  <div className="matte-panel mb-3 flex p-1">
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'table' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('table')}>Таблица</button>
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'bracket' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('bracket')}>Сетка</button>
  </div>
)

const playoffLabel = (size: number) => {
  if (size <= 1) return 'Финал'
  if (size === 2) return 'Полуфинал'
  return `1/${size * 2} плей-офф`
}

export const TablePage = () => {
  const [mode, setMode] = useState<'table' | 'bracket'>('table')
  const [transitionName, setTransitionName] = useState<'swipe-left' | 'swipe-right'>('swipe-left')
  const { data: rows } = useStandings()
  const { data: bracket } = useBracket()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { cabinetRepository } = useRepositories()
  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((t) => [t.id, t])), [teams])
  const canEditBracket = canManageMatch(session)
  const [isEditingBracket, setIsEditingBracket] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ stageId: string; slot: number; tieId?: string } | null>(null)
  const [tieHomeTeamId, setTieHomeTeamId] = useState('')
  const [tieAwayTeamId, setTieAwayTeamId] = useState('')
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [bracketStatus, setBracketStatus] = useState<string | null>(null)
  const [playoffSize, setPlayoffSize] = useState<4 | 8 | 16>(16)
  const [localTieOverrides, setLocalTieOverrides] = useState<Record<string, { homeTeamId: string; awayTeamId: string }>>({})
  const [selectedPlayoffNumber, setSelectedPlayoffNumber] = useState<string>('')
  const [hiddenTieIds, setHiddenTieIds] = useState<Set<string>>(new Set())
  const [tiePendingDelete, setTiePendingDelete] = useState<BracketMatchGroup | null>(null)
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false)
  const [sizeDraft, setSizeDraft] = useState<4 | 8 | 16>(16)
  const [editorNodes, setEditorNodes] = useState<BracketEditorNode[]>([])
  const [editorEdges, setEditorEdges] = useState<BracketEditorEdge[]>([])

  const getPlayoffNumber = (groupOrSlot: { tieId?: string; stageId: string; slot: number }) => groupOrSlot.tieId ? String(groupOrSlot.tieId).replace(/\D/g, '') || String(groupOrSlot.tieId) : `${groupOrSlot.stageId}-${groupOrSlot.slot}`

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
      if (active) {
        setActiveTournamentId(active.id)
        if (active.bracketTeamCapacity === 4 || active.bracketTeamCapacity === 8 || active.bracketTeamCapacity === 16) {
          setPlayoffSize(active.bracketTeamCapacity)
        }
      }
    })()
  }, [cabinetRepository, canEditBracket])

  useEffect(() => {
    if (!bracket?.settings?.teamCapacity) return
    const capacity = bracket.settings.teamCapacity
    if (capacity === 4 || capacity === 8 || capacity === 16) setPlayoffSize(capacity)
  }, [bracket?.settings?.teamCapacity])

  const playoffStages = useMemo((): BracketStage[] => {
    if (!bracket) return []
    const sorted = [...bracket.stages].sort((a, b) => a.order - b.order)
    const required = Math.max(1, Math.log2(playoffSize))
    const stageWindow = sorted.length > required ? sorted.slice(-required) : sorted

    return Array.from({ length: required }, (_, index) => {
      const stage = stageWindow[index]
      const size = Math.max(1, playoffSize / (2 ** (index + 1)))
      return {
        id: stage?.id ?? `virtual_stage_${index + 1}`,
        order: index + 1,
        label: stage?.label ?? playoffLabel(size),
        size,
      }
    })
  }, [bracket, playoffSize])

  const visibleStageIds = useMemo(() => new Set(playoffStages.map((stage) => stage.id)), [playoffStages])

  const playoffGroups = useMemo((): BracketMatchGroup[] => {
    if (!bracket) return []
    return bracket.groups
      .filter((group) => !hiddenTieIds.has(group.id))
      .filter((group) => visibleStageIds.has(group.stageId))
      .map((group) => {
        const key = `${group.stageId}:${group.slot}`
        const override = localTieOverrides[key]
        if (!override) return group
        return {
          ...group,
          homeTeamId: override.homeTeamId,
          awayTeamId: override.awayTeamId,
        }
      })
  }, [bracket, hiddenTieIds, localTieOverrides, visibleStageIds])

  const tieViewModels = useMemo<PlayoffTieViewModel[]>(() => {
    const stageById = Object.fromEntries(playoffStages.map((stage) => [stage.id, stage]))
    return playoffGroups.map((group) => {
      const matches = [group.firstLeg, group.secondLeg, group.thirdLeg]
        .filter(Boolean)
        .map((leg, index) => ({
          id: String(leg?.matchId ?? `${group.id}_${index + 1}`),
          status: leg?.status ?? 'scheduled',
          score: leg?.score,
        }))
      const total = matches.length > 1 && matches.every((item) => item.score)
        ? { home: matches.reduce((sum, item) => sum + (item.score?.home ?? 0), 0), away: matches.reduce((sum, item) => sum + (item.score?.away ?? 0), 0) }
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
  }, [playoffGroups, playoffStages])

  useEffect(() => {
    if (!isEditingBracket) return
    const existingTieIds = new Set(tieViewModels.map((tie) => tie.id))
    setEditorNodes((prev) => {
      const filtered = prev.filter((node) => existingTieIds.has(node.tieId))
      if (filtered.length === tieViewModels.length && filtered.length > 0) return filtered
      return buildInitialEditorNodes(tieViewModels)
    })
    setEditorEdges((prev) => prev.filter((edge) => existingTieIds.has(edge.fromTieId) && existingTieIds.has(edge.toTieId)))
  }, [isEditingBracket, tieViewModels])

  useEffect(() => {
    if (!isEditingBracket || !activeTournamentId) return
    const raw = localStorage.getItem(`bracket_editor_layout_${activeTournamentId}`)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { nodes?: BracketEditorNode[]; edges?: BracketEditorEdge[] }
      if (Array.isArray(parsed.nodes)) setEditorNodes(parsed.nodes)
      if (Array.isArray(parsed.edges)) setEditorEdges(parsed.edges)
    } catch {
      // ignore malformed cache
    }
  }, [activeTournamentId, isEditingBracket])

  const changePlayoffSize = async (nextSize: 4 | 8 | 16) => {
    setPlayoffSize(nextSize)
    setBracketStatus(null)
    if (!activeTournamentId || !cabinetRepository.updateTournamentBracketSettings) return

    try {
      await cabinetRepository.updateTournamentBracketSettings(activeTournamentId, { teamCapacity: nextSize })
      setBracketStatus('Размер плей-офф обновлен')
    } catch {
      setBracketStatus('Не удалось сохранить размер плей-офф. Изменение применено локально.')
    }
  }

  const applyTieConfig = async () => {
    if (!selectedSlot || !tieHomeTeamId || !tieAwayTeamId || tieHomeTeamId === tieAwayTeamId) return
    const key = `${selectedSlot.stageId}:${selectedSlot.slot}`

    setLocalTieOverrides((prev) => ({ ...prev, [key]: { homeTeamId: tieHomeTeamId, awayTeamId: tieAwayTeamId } }))

    if (!selectedSlot.tieId && activeTournamentId && cabinetRepository.createBracketTie) {
      try {
        await cabinetRepository.createBracketTie({
          tournamentId: activeTournamentId,
          stageId: selectedSlot.stageId,
          slot: selectedSlot.slot,
          homeTeamId: tieHomeTeamId,
          awayTeamId: tieAwayTeamId,
        })
        setBracketStatus('Плей-офф слот создан')
      } catch {
        setBracketStatus('Слот сохранен локально. Проверьте API для серверного сохранения.')
      }
    } else {
      setBracketStatus('Плей-офф обновлен локально')
    }

    setSelectedSlot(null)
    setTieHomeTeamId('')
    setTieAwayTeamId('')
  }

  return (
    <div className="px-4 pb-20 pt-6 md:px-6">
      <ModeSwitch mode={mode} setMode={changeMode} />
      {mode === 'bracket' && canEditBracket && (
        <div className="mb-3 flex items-center justify-end gap-2">
          {isEditingBracket && (
            <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textMuted" onClick={() => { setSizeDraft(playoffSize); setIsSizeModalOpen(true) }}>
              Размер сетки
            </button>
          )}
          <button type="button" className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${isEditingBracket ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textMuted'}`} onClick={() => {
            setIsEditingBracket((prev) => !prev)
            setSelectedSlot(null)
            setIsSizeModalOpen(false)
          }}>
            <Pencil size={12} /> {isEditingBracket ? 'Выйти из edit mode' : 'Редактировать сетку'}
          </button>
        </div>
      )}
      <div key={mode} className={transitionName === 'swipe-left' ? 'mode-swipe-left' : 'mode-swipe-right'}>
        {mode === 'bracket'
          ? (
            <>
              {bracket && !isEditingBracket && (
                <BracketView
                  stages={playoffStages}
                  groups={playoffGroups}
                  teamMap={teamMap}
                  fullScreen
                  editable={isEditingBracket}
                  onCreateTie={(stageId, slot) => {
                    const next = { stageId, slot }
                    setSelectedSlot(next)
                    setSelectedPlayoffNumber(getPlayoffNumber(next))
                    setTieHomeTeamId('')
                    setTieAwayTeamId('')
                    setBracketStatus(null)
                  }}
                  onEditTie={(group) => {
                    const next = { stageId: group.stageId, slot: group.slot, tieId: group.id }
                    setSelectedSlot(next)
                    setSelectedPlayoffNumber(getPlayoffNumber(next))
                    setTieHomeTeamId(group.homeTeamId ?? '')
                    setTieAwayTeamId(group.awayTeamId ?? '')
                    setBracketStatus(null)
                  }}
                  onDeleteTie={(group) => { setTiePendingDelete(group) }}
                />
              )}
              {bracket && isEditingBracket && (
                <BracketEditor
                  ties={tieViewModels}
                  nodes={editorNodes}
                  edges={editorEdges}
                  teamMap={teamMap}
                  onChange={({ nodes, edges }) => {
                    setEditorNodes(nodes)
                    setEditorEdges(edges)
                  }}
                  onEditTie={(tieId) => {
                    const tie = playoffGroups.find((group) => group.id === tieId)
                    if (!tie) return
                    const next = { stageId: tie.stageId, slot: tie.slot, tieId: tie.id }
                    setSelectedSlot(next)
                    setSelectedPlayoffNumber(getPlayoffNumber(next))
                    setTieHomeTeamId(tie.homeTeamId ?? '')
                    setTieAwayTeamId(tie.awayTeamId ?? '')
                  }}
                  onSave={() => {
                    if (!activeTournamentId) {
                      setBracketStatus('Layout сохранён локально')
                      return
                    }
                    localStorage.setItem(`bracket_editor_layout_${activeTournamentId}`, JSON.stringify({ nodes: editorNodes, edges: editorEdges }))
                    setBracketStatus('Layout сохранён локально')
                  }}
                />
              )}
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
        description={tiePendingDelete ? `Удалить плей-офф #${getPlayoffNumber({ stageId: tiePendingDelete.stageId, slot: tiePendingDelete.slot, tieId: tiePendingDelete.id })} из сетки?` : ''}
        confirmLabel="Удалить"
        onCancel={() => setTiePendingDelete(null)}
        onConfirm={() => {
          if (!tiePendingDelete) return
          const currentTie = tiePendingDelete
          setHiddenTieIds((prev) => new Set(prev).add(currentTie.id))
          setLocalTieOverrides((prev) => {
            const key = `${currentTie.stageId}:${currentTie.slot}`
            if (!prev[key]) return prev
            const next = { ...prev }
            delete next[key]
            return next
          })
          setBracketStatus('Плей-офф удален из сетки локально (до синхронизации с API).')
          if (selectedSlot?.tieId === currentTie.id) {
            setSelectedSlot(null)
            setTieHomeTeamId('')
            setTieAwayTeamId('')
          }
          setTiePendingDelete(null)
        }}
      />
      {selectedSlot && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
            <p className="text-sm font-semibold text-textPrimary">Редактирование плей-оффа</p>
            <p className="mt-1 text-xs text-textSecondary">Вершина: {selectedSlot.stageId} • слот #{selectedSlot.slot}</p>
            <label className="mt-2 block text-xs text-textMuted">
              Номер плей-офф
              <input value={selectedPlayoffNumber} readOnly className="mt-1 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm text-textPrimary" />
            </label>
            <select value={tieHomeTeamId} onChange={(event) => setTieHomeTeamId(event.target.value)} className="mt-2 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
              <option value="">Команда 1</option>
              {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
            </select>
            <select value={tieAwayTeamId} onChange={(event) => setTieAwayTeamId(event.target.value)} className="mt-2 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
              <option value="">Команда 2</option>
              {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedSlot(null)} className="rounded-lg border border-borderSubtle px-3 py-1.5 text-sm text-textSecondary">Отмена</button>
              <button type="button" disabled={!tieHomeTeamId || !tieAwayTeamId || tieHomeTeamId === tieAwayTeamId} className="rounded-lg bg-accentYellow px-3 py-1.5 text-sm font-semibold text-app disabled:opacity-50" onClick={() => { void applyTieConfig() }}>
                {selectedSlot.tieId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isSizeModalOpen && (
        <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
            <p className="text-sm font-semibold text-textPrimary">Размер сетки</p>
            <select value={sizeDraft} onChange={(event) => setSizeDraft(Number(event.target.value) as 4 | 8 | 16)} className="mt-3 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1.5 text-sm text-textPrimary">
              <option value={4}>4 команды</option>
              <option value={8}>8 команд</option>
              <option value={16}>16 команд</option>
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsSizeModalOpen(false)} className="rounded-lg border border-borderSubtle px-3 py-1.5 text-sm text-textSecondary">Отмена</button>
              <button type="button" className="rounded-lg bg-accentYellow px-3 py-1.5 text-sm font-semibold text-app" onClick={() => { void changePlayoffSize(sizeDraft); setIsSizeModalOpen(false) }}>
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
