import { Link, useNavigate } from 'react-router-dom'
import { Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import type { UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'

const rolePreset: Array<{ role: UserRole; label: string; description: string }> = [
  { role: 'guest', label: 'Гость', description: 'Базовый доступ и публичная активность' },
  { role: 'player', label: 'Игрок', description: 'Профиль игрока и связь с командой' },
  { role: 'captain', label: 'Капитан', description: 'Управление командными блоками' },
  { role: 'admin', label: 'Админ', description: 'Операции турнира и модерация' },
  { role: 'superadmin', label: 'Суперадмин', description: 'RBAC и глобальные настройки' },
]

export const LoginPage = () => {
  const { session, loginAsRole } = useSession()
  const navigate = useNavigate()

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-xl font-bold text-textPrimary">Unified login entry</h2>
        <p className="mt-2 text-sm text-textSecondary">На следующем этапе вход и регистрация будут объединены через Telegram bot auth flow.</p>
        <div className="mt-3 rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-sm text-textSecondary">
          <p className="flex items-center gap-2"><MessageCircle size={14} className="text-accentYellow" /> Telegram auth: frontend-ready placeholder.</p>
          <p className="mt-1 flex items-center gap-2"><ShieldCheck size={14} className="text-accentYellow" /> Session + role-aware cabinet уже поддерживаются mock-режимом.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <p className="mb-2 text-sm text-textMuted">Текущая роль: <span className="text-textPrimary">{session.user.role}</span></p>
        <div className="space-y-2">
          {rolePreset.map((preset) => (
            <button
              key={preset.role}
              type="button"
              onClick={async () => {
                await loginAsRole(preset.role)
                navigate('/profile')
              }}
              className="w-full rounded-xl border border-borderSubtle bg-mutedBg px-3 py-2 text-left transition hover:border-borderStrong"
            >
              <p className="text-sm font-semibold text-textPrimary">{preset.label}</p>
              <p className="text-xs text-textMuted">{preset.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary shadow-soft">
        <p className="flex items-center gap-2"><Lock size={14} className="text-accentYellow" /> Реальный OAuth/Telegram handshake пока не подключен.</p>
        <Link to="/profile" className="mt-3 inline-flex rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">Открыть кабинет</Link>
      </section>
    </PageContainer>
  )
}
