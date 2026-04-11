import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SearchField } from '../../components/ui/SearchField'
import { useSearch } from '../../hooks/data/useSearch'

type SearchType = 'all' | 'team' | 'player' | 'match' | 'event'

type SortType =
  | 'name_asc'
  | 'name_desc'
  | 'goals_desc'
  | 'age_desc'
  | 'wins_desc'
  | 'date_desc'
  | 'date_asc'
  | 'total_desc'
  | 'likes_desc'

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
  all: [{ label: 'Все', value: 'all' }],
  player: [{ label: 'Все', value: 'all' }, { label: 'Капитаны', value: 'captains' }],
  team: [
    { label: 'Все', value: 'all' },
    { label: 'Выбывшие', value: 'eliminated' },
    { label: '1/4', value: 'quarterfinal' },
    { label: '1/8', value: 'round16' },
    { label: 'Полуфинал', value: 'semifinal' },
  ],
  match: [{ label: 'Live', value: 'live' }, { label: 'Предстоящие', value: 'upcoming' }, { label: 'Прошедшие', value: 'past' }],
  event: [{ label: 'Все', value: 'all' }, { label: 'Турнир', value: 'tournament' }, { label: 'Командные', value: 'team_events' }],
}

const sortConfig: Record<SearchType, { label: string; value: SortType }[]> = {
  all: [],
  player: [
    { label: 'По голам ↓', value: 'goals_desc' },
    { label: 'Возраст ↓', value: 'age_desc' },
    { label: 'А-Я', value: 'name_asc' },
    { label: 'Я-А', value: 'name_desc' },
  ],
  team: [{ label: 'А-Я', value: 'name_asc' }, { label: 'Победы ↓', value: 'wins_desc' }],
  match: [{ label: 'По дате ↓', value: 'date_desc' }, { label: 'По дате ↑', value: 'date_asc' }, { label: 'По тоталу ↓', value: 'total_desc' }],
  event: [{ label: 'По дате ↓', value: 'date_desc' }, { label: 'По лайкам ↓', value: 'likes_desc' }],
}

export const SearchPage = () => {
  const location = useLocation()
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<SearchType>('all')
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all')
  const [sortBy, setSortBy] = useState<SortType>('date_desc')

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

    return [...byFilter].sort((a, b) => {
      if (sortBy === 'name_asc') return a.title.localeCompare(b.title, 'ru')
      if (sortBy === 'name_desc') return b.title.localeCompare(a.title, 'ru')
      if (sortBy === 'goals_desc') return Number((b.subtitle ?? '').match(/(\d+)\s*гол/)?.[1] ?? 0) - Number((a.subtitle ?? '').match(/(\d+)\s*гол/)?.[1] ?? 0)
      if (sortBy === 'age_desc') return Number((b.subtitle ?? '').match(/(\d+)\s*лет/)?.[1] ?? 0) - Number((a.subtitle ?? '').match(/(\d+)\s*лет/)?.[1] ?? 0)
      if (sortBy === 'wins_desc') return Number((b.subtitle ?? '').match(/(\d+)\s*поб/)?.[1] ?? 0) - Number((a.subtitle ?? '').match(/(\d+)\s*поб/)?.[1] ?? 0)
      if (sortBy === 'total_desc') return parseMatchTotal(b.subtitle ?? '') - parseMatchTotal(a.subtitle ?? '')
      if (sortBy === 'likes_desc') return Number((b.subtitle ?? '').match(/(\d+)\s*лайк/)?.[1] ?? 0) - Number((a.subtitle ?? '').match(/(\d+)\s*лайк/)?.[1] ?? 0)
      if (sortBy === 'date_asc') return (a.subtitle ?? '').localeCompare(b.subtitle ?? '')
      return (b.subtitle ?? '').localeCompare(a.subtitle ?? '')
    })
  }, [activeFilter, activeType, backendResults, query, sortBy])

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
              setActiveFilter(filterConfig[type][0].value)
              setSortBy(sortConfig[type][0]?.value ?? 'date_desc')
            }}
            className={`matte-panel px-3 py-2 text-xs font-semibold transition ${activeType === type ? 'text-textPrimary' : 'text-textMuted'}`}
          >
            {typeLabel[type]}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-2xl border border-borderSubtle bg-panelBg p-3">
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

        {availableSorts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-[0.08em] text-textMuted">Сортировка</span>
            {availableSorts.map((sortItem) => (
              <button
                type="button"
                key={sortItem.value}
                onClick={() => setSortBy(sortItem.value)}
                className={`rounded-xl border px-3 py-1.5 text-xs transition ${sortBy === sortItem.value ? 'border-accentYellow bg-accentYellow/15 text-accentYellow' : 'border-borderSubtle bg-mutedBg text-textSecondary'}`}
              >
                {sortItem.label}
              </button>
            ))}
          </div>
        )}
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
