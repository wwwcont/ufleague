import { useEffect, useState } from 'react'
import { useRepositories } from '../../app/providers/use-repositories'
import type { SearchResult } from '../../domain/entities/types'

export const useSearch = (query: string) => {
  const { searchRepository } = useRepositories()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)
        const next = await searchRepository.searchAll(q)
        if (!cancelled) setResults(next)
      } catch (e) {
        if (!cancelled) {
          setResults([])
          setError(e instanceof Error ? e.message : 'Не удалось выполнить поиск')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, searchRepository])

  return { results, loading, error }
}
