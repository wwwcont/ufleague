import { useEffect, useMemo, useState } from 'react'
import { BracketView } from '../../components/data-display/BracketView'
import { StandingsTable } from '../../components/data-display/StandingsTable'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useBracket } from '../../hooks/data/useBracket'
import { useStandings } from '../../hooks/data/useStandings'
import { useTeams } from '../../hooks/data/useTeams'

const ModeSwitch = ({ mode, setMode }: { mode: 'table' | 'bracket'; setMode: (mode: 'table' | 'bracket') => void }) => (
  <div className="matte-panel mb-3 flex p-1">
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'table' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('table')}>Таблица</button>
    <button className={`w-1/2 rounded-xl py-2 text-sm font-medium ${mode === 'bracket' ? 'text-accentYellow' : 'text-textMuted'}`} onClick={() => setMode('bracket')}>Сетка</button>
  </div>
)

export const TablePage = () => {
  const [mode, setMode] = useState<'table' | 'bracket'>('table')
  const { data: rows } = useStandings()
  const { data: bracket } = useBracket()
  const { data: teams } = useTeams()
  const teamMap = useMemo(() => Object.fromEntries((teams ?? []).map((t) => [t.id, t])), [teams])

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

  if (mode === 'bracket') {
    return (
      <div className="px-4 pb-20 pt-6 md:px-6">
        <ModeSwitch mode={mode} setMode={setMode} />
        {bracket && <BracketView rounds={bracket.rounds} matches={bracket.matches} teamMap={teamMap} fullScreen />}
      </div>
    )
  }

  return (
    <PageContainer>
      <ModeSwitch mode={mode} setMode={setMode} />
      {rows && <StandingsTable rows={rows} teamMap={teamMap} />}
    </PageContainer>
  )
}
