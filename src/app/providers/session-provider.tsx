import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import type { AuthSession, UserRole } from '../../domain/entities/types'
import { useRepositories } from './use-repositories'
import { SessionContext } from './session-context'

const STORAGE_KEY = 'ufl_session_v1'

const parseStored = (raw: string | null): AuthSession | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { sessionRepository } = useRepositories()
  const [session, setSession] = useState<AuthSession>({
    isAuthenticated: false,
    user: { id: 'u_guest', displayName: 'Guest_42', role: 'guest' },
    permissions: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      const stored = parseStored(window.localStorage.getItem(STORAGE_KEY))
      if (stored && mounted) {
        setSession(stored)
        setIsLoading(false)
        return
      }
      const base = await sessionRepository.getSession()
      if (!mounted) return
      setSession(base)
      setIsLoading(false)
    }

    void run()
    return () => {
      mounted = false
    }
  }, [sessionRepository])

  const loginAsRole = useCallback(async (role: UserRole) => {
    const next = await sessionRepository.setSessionByRole(role)
    setSession(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [sessionRepository])

  const logout = useCallback(async () => {
    await sessionRepository.clearSession()
    const next = await sessionRepository.getSession()
    setSession(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [sessionRepository])

  return <SessionContext.Provider value={{ session, isLoading, loginAsRole, logout }}>{children}</SessionContext.Provider>
}
