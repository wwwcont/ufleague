import { useState } from 'react'
import { Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'

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
        <h2 className="text-xl font-bold text-textPrimary">Вход в UFL через Telegram</h2>
        <p className="mt-2 text-sm text-textSecondary">Вход выполняется по одноразовому коду из Telegram.</p>

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
                const msg = err instanceof Error ? err.message : 'unknown error'
                setError(`Не удалось инициировать Telegram login: ${msg}`)
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
            <p className="text-xs text-textMuted">Введите код подтверждения:</p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Введите код из Telegram"
              className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                setError(null)
                try {
                  await completeTelegramLoginWithCode(requestId, code)
                  window.sessionStorage.removeItem('tg_login_request_id')
                  window.sessionStorage.removeItem('tg_login_expires_at')
                  navigate('/profile')
                } catch (err) {
                  const msg = err instanceof Error ? err.message : 'unknown error'
                  setError(`Не удалось завершить вход: ${msg}`)
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
        <p className="flex items-center gap-2"><MessageCircle size={14} className="text-accentYellow" /> После старта входа открывается Telegram-бот, где вы получаете одноразовый код.</p>
        <p className="mt-1 flex items-center gap-2"><ShieldCheck size={14} className="text-accentYellow" /> Код подтверждается на сервере, после чего создаётся защищённая сессия.</p>
        <p className="mt-1 flex items-center gap-2"><Lock size={14} className="text-accentYellow" /> Статус входа автоматически восстанавливается при обновлении страницы.</p>
      </section>
    </PageContainer>
  )
}
