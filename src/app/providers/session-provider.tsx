import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthSession, AuthStatus, UserRole } from '../../domain/entities/types'
import { useRepositories } from './use-repositories'
import { SessionContext } from './session-context'

const guestSession: AuthSession = {
  isAuthenticated: false,
  user: { id: 'u_guest', displayName: 'Guest', role: 'guest' },
  permissions: [],
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { sessionRepository } = useRepositories()
  const [session, setSession] = useState<AuthSession>(guestSession)
  const [status, setStatus] = useState<AuthStatus>('loading')

  const applySession = useCallback((next: AuthSession) => {
    setSession(next)
    setStatus(next.isAuthenticated ? 'authenticated' : 'unauthenticated')
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

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshSession()
      }
    }
    window.addEventListener('visibilitychange', onVisibilityChange)
    return () => window.removeEventListener('visibilitychange', onVisibilityChange)
  }, [refreshSession])

  const startTelegramLogin = useCallback(async (role?: UserRole) => {
    return sessionRepository.startTelegramLogin(role)
  }, [sessionRepository])

  const completeTelegramLoginWithCode = useCallback(async (requestId: string, code: string) => {
    setStatus('loading')
    const next = await sessionRepository.completeTelegramLoginWithCode(requestId, code)
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
    await sessionRepository.logout().catch(() => undefined)
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
