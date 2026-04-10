import { useState } from 'react'
import { ExternalLink, Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import type { UserRole } from '../../domain/entities/types'

type LoginStep = 'entry' | 'code'

export const LoginPage = () => {
  const { isLoading, startTelegramLogin, completeTelegramLoginWithCode } = useSession()
  const [step, setStep] = useState<LoginStep>('entry')
  const [code, setCode] = useState('')
  const [botUrl, setBotUrl] = useState('https://t.me/ufleague_auth_bot')
  const [requestId, setRequestId] = useState('')
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<UserRole>('player')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const isExpired = Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now())

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-xl font-bold text-textPrimary">Вход в UFL через Telegram</h2>
        <p className="mt-2 text-sm text-textSecondary">Авторизация выполняется через backend session cookie и проверяется через /api/auth/me.</p>

        {step === 'entry' ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={async () => {
                setError(null)
                try {
                  const data = await startTelegramLogin(selectedRole)
                  setBotUrl(data.authUrl)
                  setRequestId(data.requestId)
                  setExpiresAt(data.expiresAt)
                  setStep('code')
                } catch {
                  setError('Не удалось запустить вход через Telegram. Попробуйте еще раз.')
                }
              }}
              disabled={isLoading}
              className="inline-flex rounded-lg bg-accentYellow px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app disabled:opacity-60"
            >
              Войти через Telegram
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              {(['player', 'captain', 'admin', 'superadmin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`rounded-lg border px-3 py-1 text-xs uppercase ${selectedRole === role ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textSecondary'}`}
                >
                  {role}
                </button>
              ))}
            </div>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-sm text-textSecondary">
              <p>1) Перейдите в Telegram</p>
              <p>2) Откройте бота авторизации</p>
              <p>3) Получите код входа и введите его ниже</p>
            </div>

            <a
              href={botUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary hover:border-borderStrong"
            >
              Открыть бота <ExternalLink size={12} />
            </a>

            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault()
                setError(null)
                if (isExpired) {
                  setError('Сессия входа истекла. Запустите вход заново.')
                  return
                }
                try {
                  await completeTelegramLoginWithCode(requestId, code)
                  navigate('/profile')
                } catch {
                  setError('Неверный или просроченный код входа. Попробуйте снова.')
                }
              }}
            >
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Введите код из Telegram"
                className="w-full rounded-xl border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary outline-none focus:border-borderStrong"
              />
              {expiresAt && <p className="text-xs text-textSecondary">Код действует до: {new Date(expiresAt).toLocaleTimeString()}</p>}
              {isExpired && <p className="text-xs text-rose-300">Срок действия сессии входа истек.</p>}
              {error && <p className="text-xs text-rose-300">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading || !code.trim()}
                  className="inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app disabled:opacity-60"
                >
                  {isLoading ? 'Проверяем...' : 'Подтвердить код'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCode('')
                    setError(null)
                    setStep('entry')
                  }}
                  className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary"
                >
                  Назад
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary shadow-soft">
        <p className="flex items-center gap-2"><MessageCircle size={14} className="text-accentYellow" /> Telegram login flow реализован как dev mock adapter.</p>
        <p className="mt-1 flex items-center gap-2"><ShieldCheck size={14} className="text-accentYellow" /> После успешного входа backend устанавливает реальную session cookie.</p>
        <p className="mt-1 flex items-center gap-2"><Lock size={14} className="text-accentYellow" /> Реальный bot handshake будет подключен следующим этапом без смены UX-структуры экрана.</p>
      </section>
    </PageContainer>
  )
}
