import { ThumbsDown, ThumbsUp } from 'lucide-react'
import type { CommentReactions } from '../../domain/entities/types'

interface CommentReactionBarProps {
  reactions: CommentReactions
  onReact: (reaction: 'like' | 'dislike') => void
}

export const CommentReactionBar = ({ reactions, onReact }: CommentReactionBarProps) => (
  <div className="flex items-center gap-2 text-xs">
    <button
      type="button"
      onClick={() => onReact('like')}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${reactions.userReaction === 'like' ? 'border-accentYellow text-accentYellow' : 'border-borderSubtle text-textMuted hover:border-borderStrong'}`}
    >
      <ThumbsUp size={12} /> {reactions.likes}
    </button>
    <button
      type="button"
      onClick={() => onReact('dislike')}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 ${reactions.userReaction === 'dislike' ? 'border-red-400 text-red-400' : 'border-borderSubtle text-textMuted hover:border-borderStrong'}`}
    >
      <ThumbsDown size={12} /> {reactions.dislikes}
    </button>
  </div>
)
