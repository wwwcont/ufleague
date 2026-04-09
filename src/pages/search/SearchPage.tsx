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
      <SectionHeader title="Results" />
      {loading && <p className="text-sm text-textMuted">Searching...</p>}
      <div className="space-y-2">
        {results.map((r) => (
          <Link key={r.id} to={r.route} className="block rounded-lg border border-borderSubtle bg-surface p-3">
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-xs text-textMuted">{r.subtitle} • {r.type}</p>
          </Link>
        ))}
      </div>
      {!loading && query && results.length === 0 && <EmptyState title="No results" subtitle="Try another keyword" />}
    </PageContainer>
  )
}
