import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SearchField } from '../../components/ui/SearchField'
import { useSearch } from '../../hooks/data/useSearch'

type SearchType = 'all' | 'team' | 'player' | 'match' | 'event'
type SortDirection = 'asc' | 'desc'
type SortKey = 'name' | 'goals' | 'age' | 'wins' | 'date' | 'total' | 'likes'

type FilterValue =
  | 'all'
  | 'captains'
  | 'eliminated'
  | 'quarterfinal'
  | 'round16'
  | 'semifinal'
  | 'live'
  | 'upcoming'
  | 'past'
  | 'tournament'
  | 'team_events'

const typeLabel: Record<SearchType, string> = {
  all: 'ВСЕ',
  player: 'ИГРОКИ',
  team: 'КОМАНДЫ',
  match: 'МАТЧИ',
  event: 'СОБЫТИЯ',
}

const filterConfig: Record<SearchType, { label: string; value: FilterValue }[]> = {
  all: [],
  player: [{ label: 'Все', value: 'all' }, { label: 'Капитаны', value: 'captains' }],
  team: [
    { label: 'Все', value: 'all' },
    { label: 'Выбывшие', value: 'eliminated' },
    { label: '1/4', value: 'quarterfinal' },
    { label: '1/8', value: 'round16' },
    { label: 'Полуфинал', value: 'semifinal' },
  ],
  match: [{ label: 'Все', value: 'all' }, { label: 'LIVE', value: 'live' }, { label: 'Предстоящие', value: 'upcoming' }, { label: 'Прошедшие', value: 'past' }],
  event: [{ label: 'Все', value: 'all' }, { label: 'Турнир', value: 'tournament' }, { label: 'Командные', value: 'team_events' }],
}

const sortConfig: Record<SearchType, { label: string; key: SortKey; defaultDirection: SortDirection }[]> = {
  all: [],
  player: [
    { label: 'По голам', key: 'goals', defaultDirection: 'desc' },
    { label: 'Возраст', key: 'age', defaultDirection: 'desc' },
    { label: 'Алфавит', key: 'name', defaultDirection: 'asc' },
  ],
  team: [
    { label: 'Алфавит', key: 'name', defaultDirection: 'asc' },
    { label: 'Победы', key: 'wins', defaultDirection: 'desc' },
  ],
  match: [
    { label: 'По дате', key: 'date', defaultDirection: 'desc' },
    { label: 'По тоталу', key: 'total', defaultDirection: 'desc' },
  ],
  event: [
    { label: 'По дате', key: 'date', defaultDirection: 'desc' },
    { label: 'По лайкам', key: 'likes', defaultDirection: 'desc' },
  ],
}

export const SearchPage = () => {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<SearchType>('all')
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all')
  const [sortState, setSortState] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'date', direction: 'desc' })

  const { results: backendResults } = useSearch(query)
  const parseMatchTotal = (value: string) => {
    const parts = value.match(/(\d+)\s*:\s*(\d+)/)
    if (!parts) return 0
    return Number(parts[1]) + Number(parts[2])
  }

  const results = useMemo(() => {
    const list = backendResults.map((item) => ({ ...item, normalized: `${item.title} ${item.subtitle ?? ''}`.toLowerCase() }))

    const byType = activeType === 'all' ? list : list.filter((item) => item.type === activeType)
    const byFilter = byType.filter((item) => {
      if (activeFilter === 'all') return true
      if (activeType === 'player' && activeFilter === 'captains') return item.normalized.includes('капитан')
      if (activeType === 'team' && activeFilter === 'eliminated') return item.normalized.includes('выб')
      if (activeType === 'team' && activeFilter === 'quarterfinal') return item.normalized.includes('1/4')
      if (activeType === 'team' && activeFilter === 'round16') return item.normalized.includes('1/8')
      if (activeType === 'team' && activeFilter === 'semifinal') return item.normalized.includes('полуфин')
      if (activeType === 'match' && activeFilter === 'live') return item.normalized.includes('live')
      if (activeType === 'match' && activeFilter === 'upcoming') return item.normalized.includes('предст') || item.normalized.includes('scheduled')
      if (activeType === 'match' && activeFilter === 'past') return item.normalized.includes('прош') || item.normalized.includes('finished')
      if (activeType === 'event' && activeFilter === 'tournament') return item.normalized.includes('турнир')
      if (activeType === 'event' && activeFilter === 'team_events') return item.normalized.includes('команд')
      return true
    })

    if (!query.trim()) return []

    const sorted = [...byFilter].sort((a, b) => {
      if (sortState.key === 'name') return a.title.localeCompare(b.title, 'ru')
      if (sortState.key === 'goals') return Number((a.subtitle ?? '').match(/(\d+)\s*гол/)?.[1] ?? 0) - Number((b.subtitle ?? '').match(/(\d+)\s*гол/)?.[1] ?? 0)
      if (sortState.key === 'age') return Number((a.subtitle ?? '').match(/(\d+)\s*лет/)?.[1] ?? 0) - Number((b.subtitle ?? '').match(/(\d+)\s*лет/)?.[1] ?? 0)
      if (sortState.key === 'wins') return Number((a.subtitle ?? '').match(/(\d+)\s*поб/)?.[1] ?? 0) - Number((b.subtitle ?? '').match(/(\d+)\s*поб/)?.[1] ?? 0)
      if (sortState.key === 'total') return parseMatchTotal(a.subtitle ?? '') - parseMatchTotal(b.subtitle ?? '')
      if (sortState.key === 'likes') return Number((a.subtitle ?? '').match(/(\d+)\s*лайк/)?.[1] ?? 0) - Number((b.subtitle ?? '').match(/(\d+)\s*лайк/)?.[1] ?? 0)
      return (a.subtitle ?? '').localeCompare(b.subtitle ?? '')
    })

    return sortState.direction === 'asc' ? sorted : sorted.reverse()
  }, [activeFilter, activeType, backendResults, query, sortState])

  const openedFromHome = Boolean((location.state as { fromHome?: boolean } | null)?.fromHome)
  const availableFilters = filterConfig[activeType]
  const availableSorts = sortConfig[activeType]

  return (
    <PageContainer className={openedFromHome ? 'search-sheet-enter' : undefined}>
      <SearchField value={query} onChange={setQuery} placeholder="Поиск по турниру" autoFocus={openedFromHome} className="search-field-morph" />

      <div className="grid gap-2 sm:grid-cols-5">
        {(['all', 'player', 'team', 'match', 'event'] as SearchType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setActiveType(type)
              setActiveFilter(filterConfig[type][0]?.value ?? 'all')
              const firstSort = sortConfig[type][0]
              if (firstSort) {
                setSortState({ key: firstSort.key, direction: firstSort.defaultDirection })
              }
            }}
            className={`matte-panel px-3 py-2 text-xs font-semibold transition ${activeType === type ? 'text-textPrimary' : 'text-textMuted'}`}
          >
            {typeLabel[type]}
          </button>
        ))}
      </div>

      {activeType !== 'all' && (
        <div className="space-y-2 rounded-2xl border border-borderSubtle bg-panelBg p-3">
          {availableFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {availableFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setActiveFilter(filter.value)}
                  className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.08em] ${activeFilter === filter.value ? 'bg-accentYellow text-app' : 'bg-panelSoft text-textSecondary'}`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {availableSorts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.08em] text-textMuted">Сортировка</span>
              {availableSorts.map((sortItem) => {
                const isActive = sortState.key === sortItem.key
                const nextDirection = isActive ? (sortState.direction === 'asc' ? 'desc' : 'asc') : sortItem.defaultDirection
                const directionArrow = isActive ? (sortState.direction === 'asc' ? '↑' : '↓') : ''

                return (
                  <button
                    type="button"
                    key={sortItem.key}
                    onClick={() => setSortState({ key: sortItem.key, direction: nextDirection })}
                    className={`rounded-xl border px-3 py-1.5 text-xs transition ${isActive ? 'border-accentYellow bg-accentYellow/15 text-accentYellow' : 'border-borderSubtle bg-mutedBg text-textSecondary'}`}
                  >
                    {sortItem.label} {directionArrow}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

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
