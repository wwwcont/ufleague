import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthSession, AuthStatus, UserRole } from '../../domain/entities/types'
import { useRepositories } from './use-repositories'
import { SessionContext } from './session-context'

const STORAGE_KEY = 'ufl_session_v1'

const guestSession: AuthSession = {
  isAuthenticated: false,
  user: { id: 'u_guest', displayName: 'Guest', role: 'guest' },
  permissions: [],
}

const persistSession = (session: AuthSession) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

const clearPersistedSession = () => {
  window.localStorage.removeItem(STORAGE_KEY)
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { sessionRepository } = useRepositories()
  const [session, setSession] = useState<AuthSession>(guestSession)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const applySession = useCallback((next: AuthSession) => {
    setSession(next)
    setStatus(next.isAuthenticated ? 'authenticated' : 'unauthenticated')

    if (next.isAuthenticated) {
      persistSession(next)
      return
    }

    clearPersistedSession()
  }, [])

  const refreshSession = useCallback(async () => {
    setStatus('loading')

    try {
      const next = await sessionRepository.getSession()
      applySession(next)
    } catch {
      applySession(guestSession)
    }
  }, [applySession, sessionRepository])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const startTelegramLogin = useCallback(async () => {
    return sessionRepository.startTelegramLogin()
  }, [sessionRepository])

  const completeTelegramLoginWithCode = useCallback(async (code: string) => {
    setStatus('loading')
    const next = await sessionRepository.completeTelegramLoginWithCode(code)
    applySession(next)
  }, [applySession, sessionRepository])

  const loginAsDevRole = useCallback(async (role: UserRole) => {
    if (!sessionRepository.loginAsDevRole) {
      return
    }

    setStatus('loading')
    const next = await sessionRepository.loginAsDevRole(role)
    applySession(next)
  }, [applySession, sessionRepository])

  const logout = useCallback(async () => {
    setStatus('loading')
    await sessionRepository.logout()
    applySession(guestSession)
  }, [applySession, sessionRepository])

  const isLoading = status === 'loading'

  const value = useMemo(() => ({
    session,
    status,
    isLoading,
    startTelegramLogin,
    completeTelegramLoginWithCode,
    loginAsDevRole,
    refreshSession,
    logout,
  }), [completeTelegramLoginWithCode, isLoading, loginAsDevRole, logout, refreshSession, session, startTelegramLogin, status])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
