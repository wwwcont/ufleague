import { useState } from 'react'
import { Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import type { UserRole } from '../../domain/entities/types'

export const LoginPage = () => {
  const { isLoading, loginAsDevRole } = useSession()
  const [selectedRole, setSelectedRole] = useState<UserRole>('player')
  const [error, setError] = useState<string | null>(null)
  const expiresAt: string | null = null
  const navigate = useNavigate()

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-xl font-bold text-textPrimary">Вход в UFL через Telegram (dev fallback v2)</h2>
        <p className="mt-2 text-sm text-textSecondary">Интеграция Telegram bot еще не подключена. Этот поток будет активирован следующим этапом.</p>
        <button
          type="button"
          onClick={() => setError('Telegram login пока отключен. Используйте тестовые кнопки входа по ролям ниже.')}
          disabled={isLoading}
          className="mt-4 inline-flex rounded-lg bg-accentYellow px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app disabled:opacity-60"
        >
          Войти через Telegram
        </button>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-textPrimary">Тестовый вход (обход Telegram)</h3>
        <p className="mt-1 text-xs text-textSecondary">Использует тестовые учетные записи в БД до подключения реального бота.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['player', 'captain', 'admin', 'superadmin'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={async () => {
                setSelectedRole(role)
                setError(null)
                try {
                  await loginAsDevRole(role)
                  navigate('/profile')
                } catch {
                  setError(`Не удалось выполнить тестовый вход под ролью ${role}.`)
                }
              }}
              disabled={isLoading}
              className={`rounded-lg border px-3 py-2 text-xs uppercase ${selectedRole === role ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textSecondary'} disabled:opacity-60`}
            >
              Войти как {role}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary shadow-soft" data-expiry-placeholder={expiresAt ?? ''}>
        <p className="flex items-center gap-2"><MessageCircle size={14} className="text-accentYellow" /> Telegram bot auth запланирован, но временно отключен в UI.</p>
        <p className="mt-1 flex items-center gap-2"><ShieldCheck size={14} className="text-accentYellow" /> Тестовый вход создает реальную backend session cookie.</p>
        <p className="mt-1 flex items-center gap-2"><Lock size={14} className="text-accentYellow" /> Доступ и функциональность страниц зависят от выбранной роли.</p>
      </section>
    </PageContainer>
  )
}
