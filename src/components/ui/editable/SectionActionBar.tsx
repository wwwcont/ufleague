import { Loader2 } from 'lucide-react'

interface SectionActionBarProps {
  isEditing: boolean
  isPending?: boolean
  statusMessage?: string | null
  statusTone?: 'idle' | 'success' | 'error'
  onSave: () => void | Promise<void>
  onCancel: () => void
}

export const SectionActionBar = ({
  isEditing,
  isPending = false,
  statusMessage,
  statusTone = 'idle',
  onSave,
  onCancel,
}: SectionActionBarProps) => {
  if (!isEditing && !statusMessage) return null

  const statusClass = statusTone === 'success'
    ? 'text-emerald-300'
    : statusTone === 'error'
      ? 'text-rose-300'
      : 'text-textMuted'

  return (
    <div className="mt-3 space-y-2">
      {isEditing && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-60"
          >
            {isPending && <Loader2 size={12} className="animate-spin" />}
            {isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-60"
          >
            Отмена
          </button>
        </div>
      )}
      {statusMessage && <p className={`text-xs ${statusClass}`}>{statusMessage}</p>}
    </div>
  )
}
