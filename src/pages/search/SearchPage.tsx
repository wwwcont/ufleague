import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchField } from '../../components/ui/SearchField'
import { EmptyState } from '../../components/ui/EmptyState'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSearch } from '../../hooks/data/useSearch'

export const SearchPage = () => {
  const [query, setQuery] = useState('')
  const { results, loading } = useSearch(query)

  return (
    <PageContainer>
      <SearchField value={query} onChange={setQuery} />
      <SectionHeader title="Результаты" />
      {loading && <p className="text-sm text-textMuted">Поиск...</p>}
      <div className="space-y-2">
        {results.map((r) => (
          <Link key={r.id} to={r.route} className="block border-b border-accentYellow/50 p-3">
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-xs text-textMuted">{r.subtitle} • {{ team: 'команда', player: 'игрок', match: 'матч' }[r.type]}</p>
          </Link>
        ))}
      </div>
      {!loading && query && results.length === 0 && <EmptyState title="Ничего не найдено" subtitle="Попробуйте другой запрос" />}
    </PageContainer>
  )
}
