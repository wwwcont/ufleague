import { useContext } from 'react'
import { SessionContext } from './session-context'

export const useSession = () => useContext(SessionContext)
