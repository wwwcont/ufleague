import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SearchField } from '../../components/ui/SearchField'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useTeams } from '../../hooks/data/useTeams'
import { useMatches } from '../../hooks/data/useMatches'
import { useEvents } from '../../hooks/data/useEvents'

type SearchType = 'team' | 'player' | 'match' | 'event'

const typeLabel: Record<SearchType, string> = {
  team: 'КОМАНДЫ',
  player: 'ИГРОКИ',
  match: 'МАТЧИ',
  event: 'СОБЫТИЯ',
}

export const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<SearchType>('team')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { data: matches } = useMatches()
  const { data: events } = useEvents()

  const filters = useMemo(() => {
    if (activeType === 'team') return ['all', 'A', 'B']
    if (activeType === 'player') return ['all', 'GK', 'DF', 'MF', 'FW']
    if (activeType === 'match') return ['all', 'live', 'scheduled', 'finished']
    return ['all', 'news', 'announcement', 'report']
  }, [activeType])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (activeType === 'team') {
      return (teams ?? [])
        .filter((team) => (activeFilter === 'all' ? true : team.group === activeFilter))
        .filter((team) => (q ? `${team.name} ${team.shortName} ${team.city}`.toLowerCase().includes(q) : true))
        .map((team) => ({ id: team.id, route: `/teams/${team.id}`, title: team.name, subtitle: `${team.shortName} • Группа ${team.group}` }))
    }

    if (activeType === 'player') {
      return (players ?? [])
        .filter((player) => (activeFilter === 'all' ? true : player.position === activeFilter))
        .filter((player) => (q ? `${player.displayName} ${player.position}`.toLowerCase().includes(q) : true))
        .map((player) => ({ id: player.id, route: `/players/${player.id}`, title: player.displayName, subtitle: `#${player.number} • ${player.position}` }))
    }

    if (activeType === 'match') {
      return (matches ?? [])
        .filter((match) => (activeFilter === 'all' ? true : match.status === activeFilter))
        .filter((match) => (q ? `${match.round} ${match.venue} ${match.date}`.toLowerCase().includes(q) : true))
        .map((match) => ({ id: match.id, route: `/matches/${match.id}`, title: `${match.date} ${match.time}`, subtitle: `${match.venue} • ${match.round}` }))
    }

    return (events ?? [])
      .filter((event) => (activeFilter === 'all' ? true : event.category === activeFilter))
      .filter((event) => (q ? `${event.title} ${event.text} ${event.author}`.toLowerCase().includes(q) : true))
      .map((event) => ({ id: event.id, route: `/events/${event.id}`, title: event.title, subtitle: `${event.date} • ${event.author}` }))
  }, [activeType, activeFilter, events, matches, players, query, teams])

  return (
    <PageContainer>
      <SearchField value={query} onChange={setQuery} placeholder="Поиск по турниру" />

      <div className="grid gap-2 sm:grid-cols-4">
        {(['player', 'team', 'match', 'event'] as SearchType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveType(type)
              setActiveFilter('all')
            }}
            className={`matte-panel px-3 py-2 text-xs font-semibold transition ${activeType === type ? 'text-textPrimary' : 'text-textMuted'}`}
          >
            {typeLabel[type]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.08em] ${activeFilter === filter ? 'bg-accentYellow text-app' : 'bg-elevated text-textSecondary'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {results.map((item) => (
          <Link key={item.id} to={item.route} className="matte-panel block p-3">
            <p className="text-base font-medium">{item.title}</p>
            <p className="text-sm text-textMuted">{item.subtitle}</p>
          </Link>
        ))}
        {results.length === 0 && <p className="text-sm text-textMuted">Ничего не найдено.</p>}
      </div>
    </PageContainer>
  )
}
