import { useEffect, useState } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import type { SearchResult } from '../../domain/entities/types'

export const useSearch = (query: string) => {
  const { searchRepository } = useRepositories()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      setResults(await searchRepository.searchAll(query))
      setLoading(false)
    }, 180)
    return () => clearTimeout(t)
  }, [query, searchRepository])

  return { results, loading }
}
