import { useCallback, useEffect, useState } from 'react'

export interface QueryState<T> {
  data: T | null
  isLoading: boolean
  isRefreshing: boolean
  isEmpty: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useQueryState = <T,>(loader: () => Promise<T>, emptyCheck?: (data: T) => boolean): QueryState<T> => {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (refresh = false) => {
    setError(null)
    if (refresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const res = await loader()
      setData(res)
    } catch {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [loader])

  useEffect(() => {
    void run(false)
  }, [run])

  const isEmpty = data ? (emptyCheck ? emptyCheck(data) : false) : false
  return { data, isLoading, isRefreshing, isEmpty, error, refetch: () => run(true) }
}
