import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { subscribeNotifications, type AppNotificationPayload } from '../../lib/notifications'

type NotificationItem = Required<Pick<AppNotificationPayload, 'id' | 'tone' | 'message'>> & { ttlMs: number }

type NotificationsContextValue = {
  removeNotification: (id: string) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

const iconByTone = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const

const classByTone = {
  success: 'text-emerald-300',
  error: 'text-rose-300',
  info: 'text-accentYellow',
} as const

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => subscribeNotifications((payload) => {
    const id = payload.id ?? `n_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const ttlMs = payload.ttlMs ?? (payload.tone === 'error' ? 5200 : 3200)
    setItems((prev) => [...prev, { id, tone: payload.tone, message: payload.message, ttlMs }].slice(-4))
  }), [])

  useEffect(() => {
    if (!items.length) return
    const timers = items.map((item) => window.setTimeout(() => {
      setItems((prev) => prev.filter((candidate) => candidate.id !== item.id))
    }, item.ttlMs))
    return () => { timers.forEach(window.clearTimeout) }
  }, [items])

  const value = useMemo<NotificationsContextValue>(() => ({
    removeNotification: (id: string) => setItems((prev) => prev.filter((item) => item.id !== id)),
  }), [])

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[130] flex w-[min(94vw,560px)] -translate-x-1/2 flex-col gap-2 px-2">
        {items.map((item) => {
          const Icon = iconByTone[item.tone]
          return (
            <section key={item.id} className="pointer-events-auto rounded-xl border border-borderSubtle bg-panelBg/95 px-4 py-3 text-sm shadow-soft backdrop-blur">
              <p className={`flex items-start gap-2 ${classByTone[item.tone]}`}>
                <Icon size={16} className="mt-0.5 shrink-0" />
                <span className="flex-1">{item.message}</span>
                <button type="button" className="text-xs text-textMuted" onClick={() => value.removeNotification(item.id)}>
                  Закрыть
                </button>
              </p>
            </section>
          )
        })}
      </div>
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
