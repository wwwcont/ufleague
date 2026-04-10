import { createContext } from 'react'
import type { AuthSession, UserRole } from '../../domain/entities/types'

export interface SessionContextValue {
  session: AuthSession
  isLoading: boolean
  loginAsRole: (role: UserRole) => Promise<void>
  logout: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue>({
  session: {
    isAuthenticated: false,
    user: { id: 'u_guest', displayName: 'Guest', role: 'guest' },
    permissions: [],
  },
  isLoading: true,
  loginAsRole: async () => undefined,
  logout: async () => undefined,
})
