import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SearchField } from '../../components/ui/SearchField'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useTeams } from '../../hooks/data/useTeams'
import { useMatches } from '../../hooks/data/useMatches'
import { useEvents } from '../../hooks/data/useEvents'

type SearchType = 'all' | 'team' | 'player' | 'match' | 'event'
type SortType = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'

const typeLabel: Record<SearchType, string> = {
  all: 'ВСЕ',
  team: 'КОМАНДЫ',
  player: 'ИГРОКИ',
  match: 'МАТЧИ',
  event: 'СОБЫТИЯ',
}

const sortLabel: Record<SortType, string> = {
  date_desc: 'По дате ↓',
  date_asc: 'По дате ↑',
  name_asc: 'По названию А-Я',
  name_desc: 'По названию Я-А',
}

export const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<SearchType>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortType>('date_desc')

  const { data: teams } = useTeams()
  const { data: players } = usePlayers()
  const { data: matches } = useMatches()
  const { data: events } = useEvents()

  const filters = useMemo(() => {
    if (activeType === 'team') return ['Все группы', 'A', 'B']
    if (activeType === 'player') return ['Все позиции', 'GK', 'DF', 'MF', 'FW']
    if (activeType === 'match') return ['Все статусы', 'live', 'scheduled', 'finished']
    if (activeType === 'event') return ['Все типы', 'news', 'announcement', 'report']
    return ['Весь турнир']
  }, [activeType])

  const normalizedFilter = useMemo(() => {
    const map: Record<string, string> = {
      'Все группы': 'all',
      'Все позиции': 'all',
      'Все статусы': 'all',
      'Все типы': 'all',
      'Весь турнир': 'all',
    }
    return map[activeFilter] ?? activeFilter
  }, [activeFilter])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()

    const list = [
      ...(teams ?? []).map((team) => ({ id: team.id, type: 'team' as const, route: `/teams/${team.id}`, title: team.name, subtitle: `${team.shortName} • Группа ${team.group}`, date: '', filter: team.group })),
      ...(players ?? []).map((player) => ({ id: player.id, type: 'player' as const, route: `/players/${player.id}`, title: player.displayName, subtitle: `#${player.number} • ${player.position}`, date: '', filter: player.position })),
      ...(matches ?? []).map((match) => ({ id: match.id, type: 'match' as const, route: `/matches/${match.id}`, title: `${match.date} ${match.time}`, subtitle: `${match.venue} • ${match.round}`, date: match.date, filter: match.status })),
      ...(events ?? []).map((event) => ({ id: event.id, type: 'event' as const, route: `/events/${event.id}`, title: event.title, subtitle: `${event.date} • ${event.author}`, date: event.date, filter: event.category })),
    ]

    const byType = activeType === 'all' ? list : list.filter((item) => item.type === activeType)
    const byFilter = normalizedFilter === 'all' ? byType : byType.filter((item) => item.filter === normalizedFilter)
    const byQuery = q ? byFilter.filter((item) => `${item.title} ${item.subtitle}`.toLowerCase().includes(q)) : byFilter

    const sorted = [...byQuery].sort((a, b) => {
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title, 'ru')
      if (sortBy === 'name_desc') return b.title.localeCompare(a.title, 'ru')
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date)
      return b.date.localeCompare(a.date)
    })

    return sorted
  }, [activeType, events, matches, normalizedFilter, players, query, sortBy, teams])

  return (
    <PageContainer>
      <SearchField value={query} onChange={setQuery} placeholder="Поиск по турниру" />

      <div className="grid gap-2 sm:grid-cols-5">
        {(['all', 'player', 'team', 'match', 'event'] as SearchType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveType(type)
              setActiveFilter(type === 'all' ? 'Весь турнир' : 'all')
            }}
            className={`matte-panel px-3 py-2 text-xs font-semibold transition ${activeType === type ? 'text-textPrimary' : 'text-textMuted'}`}
          >
            {typeLabel[type]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.08em] ${activeFilter === filter ? 'bg-accentYellow text-app' : 'bg-elevated text-textSecondary'}`}
          >
            {filter}
          </button>
        ))}
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortType)} className="rounded-full bg-elevated px-3 py-1.5 text-xs text-textSecondary outline-none">
          {(Object.keys(sortLabel) as SortType[]).map((sortKey) => (
            <option key={sortKey} value={sortKey}>{sortLabel[sortKey]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {results.map((item) => (
          <Link key={`${item.type}_${item.id}`} to={item.route} className="matte-panel block p-3">
            <p className="text-base font-medium">{item.title}</p>
            <p className="text-sm text-textMuted">{item.subtitle}</p>
          </Link>
        ))}
        {results.length === 0 && <p className="text-sm text-textMuted">Ничего не найдено.</p>}
      </div>
    </PageContainer>
  )
}
