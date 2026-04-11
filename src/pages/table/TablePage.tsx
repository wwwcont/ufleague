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
  const { data: bracket } = useBracket()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { cabinetRepository } = useRepositories()
  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((t) => [t.id, t])), [teams])
  const canEditBracket = canManageMatch(session)
  const [isEditingBracket, setIsEditingBracket] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ stageId: string; slot: number } | null>(null)
  const [tieHomeTeamId, setTieHomeTeamId] = useState('')
  const [tieAwayTeamId, setTieAwayTeamId] = useState('')
  const [activeTournamentId, setActiveTournamentId] = useState('')
  const [bracketStatus, setBracketStatus] = useState<string | null>(null)

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
                  <p className="text-xs text-textMuted">Edit mode: кликните по пустому slot в сетке, затем выберите команды и создайте tie.</p>
                  {selectedSlot && (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-textSecondary">Stage ID: <span className="text-textPrimary">{selectedSlot.stageId}</span> • Slot: <span className="text-textPrimary">#{selectedSlot.slot}</span></p>
                      <select value={tieHomeTeamId} onChange={(event) => setTieHomeTeamId(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
                        <option value="">Домашняя команда</option>
                        {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                      </select>
                      <select value={tieAwayTeamId} onChange={(event) => setTieAwayTeamId(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-sm">
                        <option value="">Гостевая команда</option>
                        {(teams ?? []).map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
                      </select>
                      <button type="button" disabled={!activeTournamentId || !tieHomeTeamId || !tieAwayTeamId} className="rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                        await cabinetRepository.createBracketTie?.({
                          tournamentId: activeTournamentId,
                          stageId: selectedSlot.stageId,
                          slot: selectedSlot.slot,
                          homeTeamId: tieHomeTeamId,
                          awayTeamId: tieAwayTeamId,
                        })
                        setBracketStatus('Tie/slot создан')
                        setSelectedSlot(null)
                        setTieHomeTeamId('')
                        setTieAwayTeamId('')
                      }}>Создать tie</button>
                    </div>
                  )}
                  {bracketStatus && <p className="mt-2 text-xs text-textMuted">{bracketStatus}</p>}
                </section>
              )}
              {bracket && (
                <BracketView
                  stages={bracket.stages}
                  groups={bracket.groups}
                  teamMap={teamMap}
                  fullScreen
                  editable={isEditingBracket}
                  onCreateTie={(stageId, slot) => {
                    setSelectedSlot({ stageId, slot })
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
