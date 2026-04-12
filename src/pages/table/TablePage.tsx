import { useEffect, useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { BracketView } from '../../components/data-display/BracketView'
import { StandingsTable } from '../../components/data-display/StandingsTable'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useBracket } from '../../hooks/data/useBracket'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'
import { useSession } from '../../app/providers/use-session'
import { canManageMatch } from '../../domain/services/accessControl'
import { useRepositories } from '../../app/providers/use-repositories'
import type { BracketMatchGroup, BracketStage } from '../../domain/entities/types'

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

    return Array.from({ length: required }, (_, index) => {
      const stage = sorted[index]
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
  }, [bracket, localTieOverrides, visibleStageIds])

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
        <div className="mb-3 flex items-center justify-end">
          <button type="button" className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs ${isEditingBracket ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textMuted'}`} onClick={() => {
            setIsEditingBracket((prev) => !prev)
            setSelectedSlot(null)
          }}>
            <Pencil size={12} /> {isEditingBracket ? 'Выйти из edit mode' : 'Редактировать сетку'}
          </button>
        </div>
      )}
      <div key={mode} className={transitionName === 'swipe-left' ? 'mode-swipe-left' : 'mode-swipe-right'}>
        {mode === 'bracket'
          ? (
            <>
              {isEditingBracket && (
                <section className="mb-3 rounded-2xl border border-borderSubtle bg-panelBg p-3 shadow-soft">
                  <p className="text-xs text-textMuted">Настройка плей-офф: размер сетки и пары команд для каждого блока.</p>

                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <label className="text-xs text-textMuted sm:col-span-1">
                      Размер плей-офф
                      <select value={playoffSize} onChange={(event) => { void changePlayoffSize(Number(event.target.value) as 4 | 8 | 16) }} className="mt-1 w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1.5 text-sm text-textPrimary">
                        <option value={4}>4 команды</option>
                        <option value={8}>8 команд</option>
                        <option value={16}>16 команд</option>
                      </select>
                    </label>
                  </div>

                  {selectedSlot && (
                    <div className="mt-3 space-y-2 rounded-lg border border-borderSubtle bg-mutedBg p-2">
                      <p className="text-xs text-textSecondary">Вершина: <span className="text-textPrimary">{selectedSlot.stageId}</span> • слот <span className="text-textPrimary">#{selectedSlot.slot}</span></p>
                      <label className="block text-xs text-textMuted">
                        Номер плей-офф
                        <input value={selectedPlayoffNumber} readOnly className="mt-1 w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1 text-sm text-textPrimary" />
                      </label>
                      <select value={tieHomeTeamId} onChange={(event) => setTieHomeTeamId(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1 text-sm">
                        <option value="">Команда 1</option>
                        {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                      </select>
                      <select value={tieAwayTeamId} onChange={(event) => setTieAwayTeamId(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-panelBg px-2 py-1 text-sm">
                        <option value="">Команда 2</option>
                        {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                      </select>
                      <button type="button" disabled={!tieHomeTeamId || !tieAwayTeamId || tieHomeTeamId === tieAwayTeamId} className="rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app disabled:opacity-50" onClick={() => { void applyTieConfig() }}>
                        {selectedSlot.tieId ? 'Сохранить настройки' : 'Создать плей-офф'}
                      </button>
                    </div>
                  )}
                  {bracketStatus && <p className="mt-2 text-xs text-textMuted">{bracketStatus}</p>}
                </section>
              )}
              {bracket && (
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
                />
              )}
            </>
          )
          : rows && (
            <PageContainer className="px-0">
              <StandingsTable rows={rows} teamMap={teamMap} />
            </PageContainer>
          )}
      </div>
    </div>
  )
}
