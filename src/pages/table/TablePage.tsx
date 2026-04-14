import { useEffect, useMemo, useState } from 'react'
import { StandingsTable } from '../../components/data-display/StandingsTable'
import { PlayoffGridEditor } from '../../components/data-display/PlayoffGridEditor'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'
import { usePlayoffGrid } from '../../hooks/data/usePlayoffGrid'
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
  const [activeTournamentId, setActiveTournamentId] = useState('1')
  const normalizedTournamentId = /^\d+$/.test(activeTournamentId) ? activeTournamentId : '1'
  const { data: rows } = useStandings(normalizedTournamentId)
  const { data: teams } = useTeams()
  const { data: playoffGrid, isLoading: playoffLoading, error, refetch } = usePlayoffGrid(normalizedTournamentId)
  const { session } = useSession()
  const { cabinetRepository, playoffGridRepository } = useRepositories()
  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((t) => [t.id, t])), [teams])
  const canEditBracket = canManageMatch(session)

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
      if (active && /^\d+$/.test(active.id)) setActiveTournamentId(active.id)
    })()
  }, [cabinetRepository, canEditBracket])

  return (
    <div className="px-4 pb-20 pt-6 md:px-6">
      <ModeSwitch mode={mode} setMode={changeMode} />
      <div key={mode} className={transitionName === 'swipe-left' ? 'mode-swipe-left' : 'mode-swipe-right'}>
        {mode === 'bracket'
          ? (
            <>
              {playoffLoading && <p className="text-sm text-textMuted">Загрузка сетки...</p>}
              {error && <p className="text-sm text-red-400">Ошибка загрузки: {String(error)}</p>}
              {playoffGrid && (
                <PlayoffGridEditor
                  grid={playoffGrid}
                  teamMap={teamMap}
                  editable={canEditBracket}
                  onSave={async (payload) => {
                    await playoffGridRepository.validateDraft(normalizedTournamentId, payload)
                    await playoffGridRepository.savePlayoffGrid(normalizedTournamentId, payload)
                    await refetch()
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
