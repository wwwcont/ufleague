import { useCallback, useMemo, useState } from 'react'
import { useSession } from '../../app/providers/use-session'

type UserPreferenceState = {
  mutedMatchIds: string[]
  mutedFeedKeys: string[]
  enabledFeedKeys: string[]
  favoriteEntityKeys: string[]
}

type UserPreferenceStore = Record<string, UserPreferenceState>

const STORAGE_KEY = 'ufl_user_preferences_v2'

const defaultState: UserPreferenceState = {
  mutedMatchIds: [],
  mutedFeedKeys: [],
  enabledFeedKeys: [],
  favoriteEntityKeys: [],
}

const isFeedMutedByDefault = (feedKey: string) => feedKey.startsWith('events:team:') || feedKey.startsWith('events:player:')

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
  const [revision, setRevision] = useState(0)
  const state = useMemo<UserPreferenceState>(() => {
    if (!userId) return defaultState
    const raw = readStore()[userId]
    if (!raw) return defaultState
    return {
      mutedMatchIds: Array.isArray(raw.mutedMatchIds) ? raw.mutedMatchIds : [],
      mutedFeedKeys: Array.isArray(raw.mutedFeedKeys) ? raw.mutedFeedKeys : [],
      enabledFeedKeys: Array.isArray((raw as Partial<UserPreferenceState>).enabledFeedKeys) ? (raw as Partial<UserPreferenceState>).enabledFeedKeys ?? [] : [],
      favoriteEntityKeys: Array.isArray(raw.favoriteEntityKeys) ? raw.favoriteEntityKeys : [],
    }
  }, [revision, userId])

  const updateState = useCallback((updater: (prev: UserPreferenceState) => UserPreferenceState) => {
    if (!userId) return
    const store = readStore()
    const current = store[userId] ?? defaultState
    const next = updater(current)
    writeStore({ ...store, [userId]: next })
    setRevision((value) => value + 1)
  }, [userId])

  const isMatchMuted = useCallback((matchId: string) => {
    return state.mutedMatchIds.includes(matchId)
  }, [state.mutedMatchIds])
  const toggleMatchMuted = useCallback((matchId: string) => {
    updateState((prev) => {
      const mutedNow = prev.mutedMatchIds.includes(matchId)
      if (mutedNow) {
        return {
          ...prev,
          mutedMatchIds: prev.mutedMatchIds.filter((item) => item !== matchId),
        }
      }
      return {
        ...prev,
        mutedMatchIds: prev.mutedMatchIds.includes(matchId) ? prev.mutedMatchIds : [...prev.mutedMatchIds, matchId],
      }
    })
  }, [updateState])

  const isFeedMuted = useCallback((feedKey: string) => {
    if (isFeedMutedByDefault(feedKey)) return !state.enabledFeedKeys.includes(feedKey)
    return state.mutedFeedKeys.includes(feedKey)
  }, [state.enabledFeedKeys, state.mutedFeedKeys])
  const toggleFeedMuted = useCallback((feedKey: string) => {
    updateState((prev) => {
      const defaultMuted = isFeedMutedByDefault(feedKey)
      if (defaultMuted) {
        const mutedNow = !prev.enabledFeedKeys.includes(feedKey)
        if (mutedNow) {
          return {
            ...prev,
            enabledFeedKeys: prev.enabledFeedKeys.includes(feedKey) ? prev.enabledFeedKeys : [...prev.enabledFeedKeys, feedKey],
          }
        }
        return {
          ...prev,
          enabledFeedKeys: prev.enabledFeedKeys.filter((item) => item !== feedKey),
        }
      }
      const mutedNow = prev.mutedFeedKeys.includes(feedKey)
      if (mutedNow) {
        return {
          ...prev,
          mutedFeedKeys: prev.mutedFeedKeys.filter((item) => item !== feedKey),
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
    favoriteEntityKeys: state.favoriteEntityKeys,
  }), [isFavorite, isFeedMuted, isMatchMuted, state.favoriteEntityKeys, toggleFavorite, toggleFeedMuted, toggleMatchMuted])
}
