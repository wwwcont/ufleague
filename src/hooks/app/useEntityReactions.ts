import { useEffect, useMemo, useState } from 'react'

type ReactionKind = 'like' | 'dislike'
type UserReaction = ReactionKind | null

interface ReactionState {
  likes: number
  dislikes: number
  userReaction: UserReaction
}

const STORAGE_KEY = 'ufl_entity_reactions_v1'

const readStore = (): Record<string, ReactionState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Record<string, ReactionState> : {}
  } catch {
    return {}
  }
}

const writeStore = (value: Record<string, ReactionState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore localStorage errors in private mode
  }
}

export const useEntityReactions = (entityKey: string, initial?: { likes?: number; dislikes?: number }) => {
  const [store, setStore] = useState<Record<string, ReactionState>>({})

  useEffect(() => {
    setStore(readStore())
  }, [])

  const state = useMemo<ReactionState>(() => {
    const fromStore = store[entityKey]
    if (fromStore) return fromStore
    return { likes: initial?.likes ?? 0, dislikes: initial?.dislikes ?? 0, userReaction: null }
  }, [entityKey, initial?.dislikes, initial?.likes, store])

  const react = (next: ReactionKind) => {
    setStore((prev) => {
      const current = prev[entityKey] ?? state
      let likes = current.likes
      let dislikes = current.dislikes

      if (current.userReaction === 'like') likes = Math.max(likes - 1, 0)
      if (current.userReaction === 'dislike') dislikes = Math.max(dislikes - 1, 0)

      const userReaction: UserReaction = current.userReaction === next ? null : next
      if (userReaction === 'like') likes += 1
      if (userReaction === 'dislike') dislikes += 1

      const updated = { ...prev, [entityKey]: { likes, dislikes, userReaction } }
      writeStore(updated)
      return updated
    })
  }

  return { ...state, react }
}
