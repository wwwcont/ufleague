import { useCallback, useMemo, useState } from 'react'
import { useSession } from '../../app/providers/use-session'

type UserPreferenceState = {
  mutedMatchIds: string[]
  mutedFeedKeys: string[]
  favoriteEntityKeys: string[]
}

type UserPreferenceStore = Record<string, UserPreferenceState>

const STORAGE_KEY = 'ufl_user_preferences_v1'
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

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

const toggleValue = (list: string[], value: string) => (
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
)

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
    void fetch(`${API_BASE}/api/me/notification-preferences`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        muted_match_ids: next.mutedMatchIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0),
        muted_feed_keys: next.mutedFeedKeys,
        favorite_entity_keys: next.favoriteEntityKeys,
      }),
    }).catch(() => undefined)
    setRevision((value) => value + 1)
  }, [userId])

  const isMatchMuted = useCallback((matchId: string) => state.mutedMatchIds.includes(matchId), [state.mutedMatchIds])
  const toggleMatchMuted = useCallback((matchId: string) => {
    updateState((prev) => ({ ...prev, mutedMatchIds: toggleValue(prev.mutedMatchIds, matchId) }))
  }, [updateState])

  const isFeedMuted = useCallback((feedKey: string) => state.mutedFeedKeys.includes(feedKey), [state.mutedFeedKeys])
  const toggleFeedMuted = useCallback((feedKey: string) => {
    updateState((prev) => ({ ...prev, mutedFeedKeys: toggleValue(prev.mutedFeedKeys, feedKey) }))
  }, [updateState])

  const isFavorite = useCallback((entityKey: string) => state.favoriteEntityKeys.includes(entityKey), [state.favoriteEntityKeys])
  const toggleFavorite = useCallback((entityKey: string) => {
    updateState((prev) => ({ ...prev, favoriteEntityKeys: toggleValue(prev.favoriteEntityKeys, entityKey) }))
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
