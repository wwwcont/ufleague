import { useEffect, useMemo, useState } from 'react'
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
      <div className="px-4 pb-20 pt-20 md:px-6">
        <div className="matte-panel relative mb-3 flex p-1">
          <span className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-xl bg-panelSoft transition-transform duration-300 translate-x-full" />
          <button className="relative z-10 w-1/2 rounded-xl py-2 text-sm font-medium text-textMuted" onClick={() => setMode('table')}>Таблица</button>
          <button className="relative z-10 w-1/2 rounded-xl py-2 text-sm font-medium text-textPrimary" onClick={() => setMode('bracket')}>Сетка</button>
        </div>
        {bracket && <BracketView rounds={bracket.rounds} matches={bracket.matches} teamMap={teamMap} fullScreen />}
      </div>
    )
  }

  return (
    <PageContainer>
      <div className="matte-panel relative flex p-1">
        <span className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-xl bg-panelSoft transition-transform duration-300 translate-x-0" />
        <button className="relative z-10 w-1/2 rounded-xl py-2 text-sm font-medium text-textPrimary" onClick={() => setMode('table')}>Таблица</button>
        <button className="relative z-10 w-1/2 rounded-xl py-2 text-sm font-medium text-textMuted" onClick={() => setMode('bracket')}>Сетка</button>
      </div>
      {rows && <StandingsTable rows={rows} teamMap={teamMap} />}
    </PageContainer>
  )
}
