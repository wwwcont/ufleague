import { createContext } from 'react'
import type { AuthSession, AuthStatus, UserRole } from '../../domain/entities/types'

export interface SessionContextValue {
  session: AuthSession
  status: AuthStatus
  isLoading: boolean
  startTelegramLogin: (role?: UserRole) => Promise<{ authUrl: string; requestId: string; expiresAt: string }>
  completeTelegramLoginWithCode: (requestId: string, code: string) => Promise<void>
  loginAsDevRole: (role: UserRole) => Promise<void>
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue>({
  session: {
    isAuthenticated: false,
    user: { id: 'u_guest', displayName: 'Guest', role: 'guest' },
    permissions: [],
  },
  status: 'loading',
  isLoading: true,
  startTelegramLogin: async () => ({ authUrl: '#', requestId: '', expiresAt: new Date().toISOString() }),
  completeTelegramLoginWithCode: async () => undefined,
  loginAsDevRole: async () => undefined,
  refreshSession: async () => undefined,
  logout: async () => undefined,
})
