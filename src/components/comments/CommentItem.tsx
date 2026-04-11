import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CommentNode } from '../../domain/entities/types'
import { CommentActions } from './CommentActions'
import { CommentReactionBar } from './CommentReactionBar'
import { CommentReplyList } from './CommentReplyList'

interface CommentItemProps {
  comment: CommentNode
  onReply: (commentId: string, author: string) => void
  onDelete: (commentId: string) => void
  onReact: (commentId: string, reaction: 'like' | 'dislike') => void
  isThreadChild?: boolean
}

const MAX_TEXT = 180

export const CommentItem = ({ comment, onReply, onDelete, onReact, isThreadChild = false }: CommentItemProps) => {
  const [expandedText, setExpandedText] = useState(false)
  const [collapsedThread, setCollapsedThread] = useState(false)

  const isLong = comment.text.length > MAX_TEXT
  const visibleText = useMemo(() => {
    if (!isLong || expandedText) return comment.text
    return `${comment.text.slice(0, MAX_TEXT)}…`
  }, [comment.text, expandedText, isLong])

  return (
    <li className="rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {comment.authorUserId ? (
            <Link to={`/users/${comment.authorUserId}`} className="font-semibold text-textPrimary underline-offset-2 hover:underline">
              {comment.authorName}
            </Link>
          ) : (
            <span className="font-semibold text-textPrimary">{comment.authorName}</span>
          )}
          <span className="rounded-md border border-borderSubtle px-1.5 py-0.5 text-[10px] uppercase text-textMuted">{comment.authorRole}</span>
          {comment.isOwn && <span className="text-[10px] text-accentYellow">мой комментарий</span>}
        </div>
        <span className="text-textMuted">{comment.createdAt}</span>
      </div>

      <p className="text-sm text-textSecondary">{visibleText}</p>
      {isLong && (
        <button type="button" className="mt-1 text-xs text-accentYellow" onClick={() => setExpandedText((prev) => !prev)}>
          {expandedText ? 'Свернуть' : 'Показать полностью'}
        </button>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <CommentReactionBar reactions={comment.reactions} onReact={(reaction) => onReact(comment.id, reaction)} />
        <CommentActions
          canDelete={comment.canDelete}
          showModeration={comment.canDelete && !comment.isOwn}
          onReply={() => onReply(comment.id, comment.authorName)}
          onDelete={() => onDelete(comment.id)}
        />
      </div>

      {!isThreadChild && comment.replies.length > 0 && (
        <button type="button" onClick={() => setCollapsedThread((prev) => !prev)} className="mt-2 text-xs text-textMuted hover:text-textSecondary">
          {collapsedThread ? `Показать ветку (${comment.replies.length})` : 'Свернуть ветку'}
        </button>
      )}

      {!isThreadChild && !collapsedThread && <CommentReplyList replies={comment.replies} onReply={onReply} onDelete={onDelete} onReact={onReact} />}
    </li>
  )
}
