import { useMemo, useState } from 'react'
import { BracketView } from '../../components/data-display/BracketView'
import { StandingsTable } from '../../components/data-display/StandingsTable'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useBracket } from '../../hooks/data/useBracket'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'

export const TablePage = () => {
  const [mode, setMode] = useState<'table' | 'bracket'>('table')
  const { data: rows } = useStandings()
  const { data: bracket } = useBracket()
  const { data: teams } = useTeams()
  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((t) => [t.id, t])), [teams])

  return (
    <PageContainer>
      <div className="matte-panel relative flex p-1">
        <span
          className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-xl bg-elevated transition-transform duration-300 ${
            mode === 'table' ? 'translate-x-0' : 'translate-x-full'
          }`}
        />
        <button className={`relative z-10 w-1/2 rounded-xl py-2 text-sm font-medium transition ${mode === 'table' ? 'text-textPrimary' : 'text-textMuted'}`} onClick={() => setMode('table')}>Таблица</button>
        <button className={`relative z-10 w-1/2 rounded-xl py-2 text-sm font-medium transition ${mode === 'bracket' ? 'text-textPrimary' : 'text-textMuted'}`} onClick={() => setMode('bracket')}>Сетка</button>
      </div>

      {mode === 'table' ? rows && <StandingsTable rows={rows} teamMap={teamMap} /> : bracket && <BracketView rounds={bracket.rounds} matches={bracket.matches} teamMap={teamMap} fullScreen />}
    </PageContainer>
  )
}
