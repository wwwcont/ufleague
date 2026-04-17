export type AppNotificationTone = 'success' | 'error' | 'info'

export type AppNotificationPayload = {
  id?: string
  tone: AppNotificationTone
  message: string
  ttlMs?: number
}

const EVENT_NAME = 'ufl:notify'

const normalizeMessage = (raw: string) => {
  const value = raw.trim()
  if (!value) return 'Неизвестный ответ сервера'

  const map: Array<[string, string]> = [
    ['unauthorized', 'Нужно войти в аккаунт'],
    ['forbidden', 'Недостаточно прав для этого действия'],
    ['bad request', 'Некорректный запрос'],
    ['not found', 'Данные не найдены'],
    ['failed', 'Операция не выполнена'],
    ['invalid code', 'Неверный код'],
    ['expired code', 'Срок действия кода истёк'],
    ['expired login session', 'Сессия входа истекла, начните вход заново'],
    ['validation failed', 'Проверьте корректность заполнения полей'],
    ['rate limited', 'Слишком много запросов, попробуйте позже'],
    ['comments restricted', 'Комментарии временно недоступны'],
    ['csrf validation failed', 'Сессия безопасности обновилась, повторите действие'],
    ['rate limit exceeded', 'Превышен лимит запросов, попробуйте позже'],
    ['invalid scope', 'Неверная область действия'],
    ['storage unavailable', 'Хранилище временно недоступно'],
    ['team already has captain; revoke current captain first', 'У команды уже есть капитан. Сначала снимите текущего капитана'],
    ['user already captain', 'Пользователь уже назначен капитаном'],
    ['seed user not found', 'Тестовый пользователь не найден'],
    ['code is required', 'Введите код'],
  ]

  const lower = value.toLowerCase()
  const exact = map.find(([source]) => lower === source)
  if (exact) return exact[1]
  const includes = map.find(([source]) => lower.includes(source))
  if (includes) return includes[1]
  return value
}

export const toRussianMessage = (message: string) => normalizeMessage(message)

const emitNotification = (payload: AppNotificationPayload) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<AppNotificationPayload>(EVENT_NAME, { detail: { ...payload, message: toRussianMessage(payload.message) } }))
}

export const notifySuccess = (message: string, ttlMs?: number) => emitNotification({ tone: 'success', message, ttlMs })
export const notifyError = (message: string, ttlMs?: number) => emitNotification({ tone: 'error', message, ttlMs })
export const notifyInfo = (message: string, ttlMs?: number) => emitNotification({ tone: 'info', message, ttlMs })

export const subscribeNotifications = (listener: (payload: AppNotificationPayload) => void) => {
  if (typeof window === 'undefined') return () => {}
  const handler = (event: Event) => {
    const custom = event as CustomEvent<AppNotificationPayload>
    if (!custom.detail) return
    listener(custom.detail)
  }
  window.addEventListener(EVENT_NAME, handler as EventListener)
  return () => window.removeEventListener(EVENT_NAME, handler as EventListener)
}
