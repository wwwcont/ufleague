import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CommentNode } from '../../domain/entities/types'
import { CommentActions } from './CommentActions'
import { CommentReactionBar } from './CommentReactionBar'
import { CommentReplyList } from './CommentReplyList'
import { formatDateTimeMsk } from '../../lib/date-time'

interface CommentItemProps {
  comment: CommentNode
  onReply: (commentId: string, author: string) => void
  onEdit: (commentId: string, text: string) => void
  onDelete: (commentId: string) => void
  onReact: (commentId: string, reaction: 'like' | 'dislike') => void
  isThreadChild?: boolean
  showRoleBadge?: boolean
  showThread?: boolean
}

const MAX_TEXT = 180

export const CommentItem = ({ comment, onReply, onEdit, onDelete, onReact, isThreadChild = false, showRoleBadge = true, showThread = true }: CommentItemProps) => {
  const [expandedText, setExpandedText] = useState(false)
  const [collapsedThread, setCollapsedThread] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.text)

  const isLong = comment.text.length > MAX_TEXT
  const visibleText = useMemo(() => {
    if (!isLong || expandedText || isEditing) return comment.text
    return `${comment.text.slice(0, MAX_TEXT)}…`
  }, [comment.text, expandedText, isLong, isEditing])

  return (
    <li id={`comment-${comment.id}`} className="rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {comment.authorUserId ? (
            <Link to={`/users/${comment.authorUserId}`} className="font-semibold text-textPrimary underline-offset-2 hover:underline">
              {comment.authorName}
            </Link>
          ) : (
            <span className="font-semibold text-textPrimary">{comment.authorName}</span>
          )}
          {showRoleBadge && <span className="rounded-md border border-borderSubtle px-1.5 py-0.5 text-[10px] uppercase text-textMuted">{comment.authorRole}</span>}
          {comment.isOwn && <span className="text-[10px] text-accentYellow">мой комментарий</span>}
          {comment.editedAt && <span className="text-[10px] text-textMuted">изменен</span>}
        </div>
        <span className="text-textMuted">{formatDateTimeMsk(comment.createdAt)}</span>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-borderSubtle bg-panelBg px-3 py-2 text-sm text-textPrimary outline-none"
          />
          <div className="flex items-center justify-end gap-2 text-xs">
            <button type="button" onClick={() => { setIsEditing(false); setDraft(comment.text) }} className="rounded-lg border border-borderSubtle px-2 py-1">Отмена</button>
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={async () => {
                if (!draft.trim()) return
                await onEdit(comment.id, draft.trim())
                setIsEditing(false)
              }}
              className="rounded-lg bg-accentYellow px-2 py-1 font-semibold text-app disabled:opacity-50"
            >
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-textSecondary">{visibleText}</p>
          {isLong && (
            <button type="button" className="mt-1 text-xs text-accentYellow" onClick={() => setExpandedText((prev) => !prev)}>
              {expandedText ? 'Свернуть' : 'Показать полностью'}
            </button>
          )}
        </>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <CommentReactionBar reactions={comment.reactions} onReact={(reaction) => onReact(comment.id, reaction)} />
        <CommentActions
          canDelete={comment.canDelete}
          canEdit={comment.canEdit}
          onReply={() => onReply(comment.id, comment.authorName)}
          onEdit={() => setIsEditing(true)}
          onDelete={() => onDelete(comment.id)}
        />
      </div>

      {showThread && comment.replies.length > 0 && (
        <button type="button" onClick={() => setCollapsedThread((prev) => !prev)} className="mt-2 text-xs text-textMuted hover:text-textSecondary">
          {collapsedThread ? `Показать ветку (${comment.replies.length})` : 'Свернуть ветку'}
        </button>
      )}

      {showThread && !collapsedThread && (
        <CommentReplyList replies={comment.replies} onReply={onReply} onEdit={onEdit} onDelete={onDelete} onReact={onReact} />
      )}

      {isThreadChild && <div className="mt-1" />}
    </li>
  )
}
