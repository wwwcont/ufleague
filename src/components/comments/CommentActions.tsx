interface CommentActionsProps {
  canDelete: boolean
  showModeration?: boolean
  onReply: () => void
  onDelete: () => void
}

export const CommentActions = ({ canDelete, showModeration = false, onReply, onDelete }: CommentActionsProps) => (
  <div className="flex items-center gap-2 text-xs text-textMuted">
    <button type="button" onClick={onReply} className="rounded-lg border border-borderSubtle px-2 py-1 hover:border-borderStrong">
      Ответить
    </button>
    {canDelete && (
      <button type="button" onClick={onDelete} className="rounded-lg border border-borderSubtle px-2 py-1 hover:border-red-400 hover:text-red-400">
        {showModeration ? 'Модерировать' : 'Удалить'}
      </button>
    )}
  </div>
)
