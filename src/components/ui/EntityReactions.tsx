import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEntityReactions } from '../../hooks/app/useEntityReactions'

export const EntityReactions = ({ entityKey, compact = false }: { entityKey: string; compact?: boolean }) => {
  const { likes, dislikes, userReaction, react } = useEntityReactions(entityKey)
  const cls = compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'

  return (
    <div className="flex items-center gap-1.5 text-textMuted">
      <button type="button" onClick={() => react('like')} className={`${cls} inline-flex items-center gap-1 rounded-lg bg-panelSoft ${userReaction === 'like' ? 'text-accentYellow' : 'hover:text-textPrimary'}`}>
        <ThumbsUp size={12} /> {likes}
      </button>
      <button type="button" onClick={() => react('dislike')} className={`${cls} inline-flex items-center gap-1 rounded-lg bg-panelSoft ${userReaction === 'dislike' ? 'text-red-400' : 'hover:text-textPrimary'}`}>
        <ThumbsDown size={12} /> {dislikes}
      </button>
    </div>
  )
}
