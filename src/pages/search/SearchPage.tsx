import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { SearchEntityType } from '../../domain/entities/types'
import { SearchField } from '../../components/ui/SearchField'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSearch } from '../../hooks/data/useSearch'

const typeLabel: Record<SearchEntityType, string> = {
  team: 'Команды',
  player: 'Игроки',
  match: 'Матчи',
}

export const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<SearchEntityType | null>(null)
  const { results, loading } = useSearch(query)

  const filteredResults = useMemo(
    () => (activeType ? results.filter((result) => result.type === activeType) : results),
    [activeType, results],
  )

  return (
    <PageContainer>
      <SearchField value={query} onChange={setQuery} />

      {!query && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(['team', 'player', 'match'] as SearchEntityType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`rounded-2xl bg-gradient-to-r px-4 py-3 text-left text-sm font-semibold transition ${
                activeType === type
                  ? 'from-accentYellow/30 to-transparent text-textPrimary'
                  : 'from-accentYellow/15 to-transparent text-textSecondary'
              }`}
            >
              {typeLabel[type]}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-4 text-sm text-textMuted">Поиск...</p>}

      <div className="mt-4 space-y-2">
        {filteredResults.map((r) => (
          <Link key={r.id} to={r.route} className="block rounded-2xl bg-gradient-to-r from-accentYellow/15 to-transparent p-3">
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-xs text-textMuted">{r.subtitle} • {typeLabel[r.type]}</p>
          </Link>
        ))}
      </div>

      {!loading && query && filteredResults.length === 0 && <EmptyState title="Ничего не найдено" subtitle="Попробуйте другой запрос" />}
    </PageContainer>
  )
}
