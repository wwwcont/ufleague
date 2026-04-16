import { useCallback, useMemo, useState } from 'react'
import { useSession } from '../../app/providers/use-session'

type UserPreferenceState = {
  mutedMatchIds: string[]
  mutedFeedKeys: string[]
  favoriteEntityKeys: string[]
}

type UserPreferenceStore = Record<string, UserPreferenceState>

const STORAGE_KEY = 'ufl_user_preferences_v1'

const defaultState: UserPreferenceState = {
  mutedMatchIds: [],
  mutedFeedKeys: [],
  favoriteEntityKeys: [],
}

const readStore = (): UserPreferenceStore => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as UserPreferenceStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const writeStore = (store: UserPreferenceStore) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export const useUserPreferences = () => {
  const { session } = useSession()
  const userId = session.isAuthenticated ? session.user.id : null
  const [, setRevision] = useState(0)
  const state = !userId ? defaultState : (readStore()[userId] ?? defaultState)

  const updateState = useCallback((updater: (prev: UserPreferenceState) => UserPreferenceState) => {
    if (!userId) return
    const store = readStore()
    const current = store[userId] ?? defaultState
    const next = updater(current)
    writeStore({ ...store, [userId]: next })
    setRevision((value) => value + 1)
  }, [userId])

  const isMatchMuted = useCallback((matchId: string) => {
    if (state.mutedMatchIds.includes(matchId)) return true
    return !state.favoriteEntityKeys.includes(`match:${matchId}`)
  }, [state.favoriteEntityKeys, state.mutedMatchIds])
  const toggleMatchMuted = useCallback((matchId: string) => {
    updateState((prev) => {
      const entityKey = `match:${matchId}`
      const mutedNow = prev.mutedMatchIds.includes(matchId) || !prev.favoriteEntityKeys.includes(entityKey)
      if (mutedNow) {
        return {
          ...prev,
          mutedMatchIds: prev.mutedMatchIds.filter((item) => item !== matchId),
          favoriteEntityKeys: prev.favoriteEntityKeys.includes(entityKey) ? prev.favoriteEntityKeys : [...prev.favoriteEntityKeys, entityKey],
        }
      }
      return {
        ...prev,
        mutedMatchIds: prev.mutedMatchIds.includes(matchId) ? prev.mutedMatchIds : [...prev.mutedMatchIds, matchId],
      }
    })
  }, [updateState])

  const isFeedMuted = useCallback((feedKey: string) => {
    if (state.mutedFeedKeys.includes(feedKey)) return true
    return !state.favoriteEntityKeys.includes(`feed:${feedKey}`)
  }, [state.favoriteEntityKeys, state.mutedFeedKeys])
  const toggleFeedMuted = useCallback((feedKey: string) => {
    updateState((prev) => {
      const entityKey = `feed:${feedKey}`
      const mutedNow = prev.mutedFeedKeys.includes(feedKey) || !prev.favoriteEntityKeys.includes(entityKey)
      if (mutedNow) {
        return {
          ...prev,
          mutedFeedKeys: prev.mutedFeedKeys.filter((item) => item !== feedKey),
          favoriteEntityKeys: prev.favoriteEntityKeys.includes(entityKey) ? prev.favoriteEntityKeys : [...prev.favoriteEntityKeys, entityKey],
        }
      }
      return {
        ...prev,
        mutedFeedKeys: prev.mutedFeedKeys.includes(feedKey) ? prev.mutedFeedKeys : [...prev.mutedFeedKeys, feedKey],
      }
    })
  }, [updateState])

  const isFavorite = useCallback((entityKey: string) => state.favoriteEntityKeys.includes(entityKey), [state.favoriteEntityKeys])
  const toggleFavorite = useCallback((entityKey: string) => {
    updateState((prev) => ({
      ...prev,
      favoriteEntityKeys: prev.favoriteEntityKeys.includes(entityKey)
        ? prev.favoriteEntityKeys.filter((item) => item !== entityKey)
        : [...prev.favoriteEntityKeys, entityKey],
    }))
  }, [updateState])

  return useMemo(() => ({
    isMatchMuted,
    toggleMatchMuted,
    isFeedMuted,
    toggleFeedMuted,
    isFavorite,
    toggleFavorite,
  }), [isFavorite, isFeedMuted, isMatchMuted, toggleFavorite, toggleFeedMuted, toggleMatchMuted])
}
