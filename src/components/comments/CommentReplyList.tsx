import type { CommentNode } from '../../domain/entities/types'
import { CommentItem } from './CommentItem'

interface CommentReplyListProps {
  replies: CommentNode[]
  onReply: (commentId: string, author: string) => void
  onEdit: (commentId: string, text: string) => void
  onDelete: (commentId: string) => void
  onReact: (commentId: string, reaction: 'like' | 'dislike') => void
}

export const CommentReplyList = ({ replies, onReply, onEdit, onDelete, onReact }: CommentReplyListProps) => {
  if (replies.length === 0) return null

  return (
    <ul className="mt-2 space-y-2 border-l border-borderSubtle pl-3">
      {replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onReact={onReact}
          isThreadChild
        />
      ))}
    </ul>
  )
}
