interface CommentActionsProps {
  canDelete: boolean
  canEdit: boolean
  showModeration?: boolean
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
}

export const CommentActions = ({ canDelete, canEdit, showModeration = false, onReply, onEdit, onDelete }: CommentActionsProps) => (
  <div className="flex items-center gap-2 text-xs text-textMuted">
    <button type="button" onClick={onReply} className="rounded-lg border border-borderSubtle px-2 py-1 hover:border-borderStrong">
      Ответить
    </button>
    {canEdit && (
      <button type="button" onClick={onEdit} className="rounded-lg border border-borderSubtle px-2 py-1 hover:border-borderStrong">
        Редактировать
      </button>
    )}
    {canDelete && (
      <button type="button" onClick={onDelete} className="rounded-lg border border-borderSubtle px-2 py-1 hover:border-red-400 hover:text-red-400">
        {showModeration ? 'Модерировать' : 'Удалить'}
      </button>
    )}
  </div>
)
