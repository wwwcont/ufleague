import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { notifyError, notifySuccess } from '../../lib/notifications'

const devAccounts = [
  { code: 'UFL-SUPERADMIN-2026', label: 'Суперадмин' },
  { code: 'UFL-ADMIN-2026', label: 'Админ' },
  { code: 'UFL-CAPTAIN-2026', label: 'Капитан' },
  { code: 'UFL-GUEST-2026', label: 'Гость' },
]

export const LoginPage = () => {
  const { isLoading, startTelegramLogin, completeTelegramLoginWithCode } = useSession()
  const persistedRequestId = window.sessionStorage.getItem('tg_login_request_id') ?? ''
  const [step, setStep] = useState<'start' | 'code'>(persistedRequestId ? 'code' : 'start')
  const [requestId, setRequestId] = useState(persistedRequestId)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const openTelegramAuth = (authUrl: string) => {
    const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean }
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      standaloneNavigator.standalone === true

    if (isStandalone) {
      const popup = window.open(authUrl, '_blank', 'noopener,noreferrer')
      if (popup) return
    }

    window.location.assign(authUrl)
  }

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-xl font-bold text-textPrimary">Вход в UFL</h2>
        <p className="mt-2 text-sm text-textSecondary">Войдите через Telegram, чтобы продолжить.</p>

        {step === 'start' && (
          <button
            type="button"
            onClick={async () => {
              setError(null)
              try {
                const login = await startTelegramLogin()
                setRequestId(login.requestId)
                window.sessionStorage.setItem('tg_login_request_id', login.requestId)
                window.sessionStorage.setItem('tg_login_expires_at', login.expiresAt)
                setStep('code')
                openTelegramAuth(login.authUrl)
              } catch (err) {
                const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
                const text = `Не удалось начать вход: ${msg}`
                setError(text)
                notifyError(text)
              }
            }}
            disabled={isLoading}
            className="mt-4 inline-flex rounded-lg bg-accentYellow px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app disabled:opacity-60"
          >
            Войти через Telegram
          </button>
        )}

        {step === 'code' && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => {
                setStep('start')
                setRequestId('')
                setCode('')
                setError(null)
                window.sessionStorage.removeItem('tg_login_request_id')
                window.sessionStorage.removeItem('tg_login_expires_at')
              }}
              className="inline-flex rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary"
            >
              ← Назад
            </button>
            <p className="text-xs text-textMuted">Введите код входа:</p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Введите код"
              className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary outline-none"
            />
            <div className="flex flex-wrap gap-2">
              {devAccounts.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setCode(item.code)}
                  className="rounded-lg border border-borderSubtle px-2 py-1 text-[11px] text-textSecondary"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                setError(null)
                try {
                  await completeTelegramLoginWithCode(requestId, code)
                  window.sessionStorage.removeItem('tg_login_request_id')
                  window.sessionStorage.removeItem('tg_login_expires_at')
                  notifySuccess('Вход выполнен успешно')
                  navigate('/profile')
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
                  const text = `Не удалось завершить вход: ${msg}`
                  setError(text)
                  notifyError(text)
                }
              }}
              disabled={isLoading || !code.trim()}
              className="inline-flex rounded-lg bg-accentYellow px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app disabled:opacity-60"
            >
              Подтвердить код
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary shadow-soft">
        <p>Откроется Telegram — подтвердите вход и вернитесь на сайт.</p>
        <p className="mt-1">Если код не пришёл, начните вход заново.</p>
      </section>
    </PageContainer>
  )
}
