import type { CommentNode } from '../../domain/entities/types'
import { CommentEmptyState } from './CommentEmptyState'
import { CommentItem } from './CommentItem'

interface CommentListProps {
  comments: CommentNode[]
  onReply: (commentId: string, author: string) => void
  onDelete: (commentId: string) => void
  onReact: (commentId: string, reaction: 'like' | 'dislike') => void
  showRoleBadge?: boolean
  showThread?: boolean
}

export const CommentList = ({ comments, onReply, onDelete, onReact, showRoleBadge = true, showThread = true }: CommentListProps) => {
  if (comments.length === 0) return <CommentEmptyState />

  return (
    <ul className="space-y-2">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} onReply={onReply} onDelete={onDelete} onReact={onReact} showRoleBadge={showRoleBadge} showThread={showThread} />
      ))}
    </ul>
  )
}
