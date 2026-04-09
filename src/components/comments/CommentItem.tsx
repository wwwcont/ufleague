import type { CommentNode } from '../../domain/entities/types'
import { CommentActions } from './CommentActions'
import { CommentReactionBar } from './CommentReactionBar'
import { CommentReplyList } from './CommentReplyList'

interface CommentItemProps {
  comment: CommentNode
  onReply: (commentId: string, author: string) => void
  onDelete: (commentId: string) => void
  onReact: (commentId: string, reaction: 'like' | 'dislike') => void
}

export const CommentItem = ({ comment, onReply, onDelete, onReact }: CommentItemProps) => (
  <li className="rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3">
    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-textPrimary">{comment.authorName}</span>
        <span className="rounded-md border border-borderSubtle px-1.5 py-0.5 text-[10px] uppercase text-textMuted">{comment.authorRole}</span>
        {comment.isOwn && <span className="text-[10px] text-accentYellow">мой комментарий</span>}
      </div>
      <span className="text-textMuted">{comment.createdAt}</span>
    </div>

    <p className="text-sm text-textSecondary">{comment.text}</p>

    <div className="mt-2 flex items-center justify-between gap-2">
      <CommentReactionBar reactions={comment.reactions} onReact={(reaction) => onReact(comment.id, reaction)} />
      <CommentActions
        canDelete={comment.canDelete}
        onReply={() => onReply(comment.id, comment.authorName)}
        onDelete={() => onDelete(comment.id)}
      />
    </div>

    <CommentReplyList replies={comment.replies} onReply={onReply} onDelete={onDelete} onReact={onReact} />
  </li>
)
