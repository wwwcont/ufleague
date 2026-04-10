import { useState } from 'react'
import { Send } from 'lucide-react'

interface CommentComposerProps {
  blockedReason: string | null
  statusMessage?: string | null
  isSubmitting?: boolean
  replyTo: { id: string; author: string } | null
  onCancelReply: () => void
  onSubmit: (text: string, replyToId: string | null) => Promise<void>
}

export const CommentComposer = ({ blockedReason, statusMessage, isSubmitting = false, replyTo, onCancelReply, onSubmit }: CommentComposerProps) => {
  const [value, setValue] = useState('')

  return (
    <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-borderSubtle bg-panelSoft px-2 py-1 text-xs text-textSecondary">
          <span>Ответ для @{replyTo.author}</span>
          <button type="button" onClick={onCancelReply} className="text-textMuted hover:text-textPrimary">Отмена</button>
        </div>
      )}

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Написать комментарий..."
        className="min-h-20 w-full rounded-lg border border-borderSubtle bg-panelBg px-3 py-2 text-sm text-textPrimary outline-none"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-textMuted">
          {blockedReason ?? statusMessage ?? 'Гость: reply/delete own comment/like-dislike доступны при активной session.'}
        </p>
        <button
          type="button"
          disabled={Boolean(blockedReason) || !value.trim() || isSubmitting}
          onClick={async () => {
            if (!value.trim() || blockedReason) return
            await onSubmit(value.trim(), replyTo?.id ?? null)
            setValue('')
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={12} /> {isSubmitting ? 'Отправка...' : 'Отправить'}
        </button>
      </div>
    </div>
  )
}
