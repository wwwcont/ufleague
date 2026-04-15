import { useState } from 'react'
import { Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'

const devAccounts = [
  { code: 'UFL-SUPERADMIN-2026', label: 'Superadmin (seeded)' },
  { code: 'UFL-ADMIN-2026', label: 'Admin (seeded)' },
  { code: 'UFL-CAPTAIN-2026', label: 'Captain Alpha (seeded)' },
  { code: 'UFL-PLAYER-2026', label: 'Player Test (seeded)' },
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
        <h2 className="text-xl font-bold text-textPrimary">Вход в UFL через Telegram</h2>
        <p className="mt-2 text-sm text-textSecondary">Dev-safe login flow: backend проверяет code и создает реальную session cookie.</p>

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
                setCode('')
                setError(null)
                setRequestId('')
                window.sessionStorage.removeItem('tg_login_request_id')
                window.sessionStorage.removeItem('tg_login_expires_at')
              }}
              className="inline-flex rounded-lg border border-borderSubtle px-3 py-1.5 text-xs font-semibold text-textSecondary"
            >
              ← Назад
            </button>
            <p className="text-xs text-textMuted">Введите mock code для seeded dev account:</p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="0000 или UFL-SUPERADMIN-2026"
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
        <p className="flex items-center gap-2"><MessageCircle size={14} className="text-accentYellow" /> После старта login пользователь сразу редиректится в Telegram бота и получает одноразовый 4-значный код (TTL 30 минут).</p>
        <p className="mt-1 flex items-center gap-2"><ShieldCheck size={14} className="text-accentYellow" /> Логин проходит только через backend endpoint и session cookie.</p>
        <p className="mt-1 flex items-center gap-2"><Lock size={14} className="text-accentYellow" /> После reload/auth refresh источник истины — только /api/auth/me.</p>
      </section>
    </PageContainer>
  )
}
