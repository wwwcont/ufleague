import type { MouseEvent } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { useEntityReactions } from '../../hooks/app/useEntityReactions'
import { useSession } from '../../app/providers/use-session'

export const EntityReactions = ({ entityKey, compact = false, interactive = true }: { entityKey: string; compact?: boolean; interactive?: boolean }) => {
  const { session } = useSession()
  const { likes, dislikes, userReaction, react } = useEntityReactions(entityKey)
  const cls = compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
  const baseClass = `${cls} inline-flex items-center gap-1 rounded-lg bg-panelSoft`
  const canReact = interactive && session.isAuthenticated

  const onReact = (reaction: 'like' | 'dislike') => (event: MouseEvent) => {
    event.stopPropagation()
    if (!canReact) return
    react(reaction)
  }

  return (
    <div className="flex items-center gap-1.5 text-textMuted">
      <button type="button" onClick={onReact('like')} className={`${baseClass} ${userReaction === 'like' ? 'text-accentYellow' : 'hover:text-textPrimary'} ${canReact ? '' : 'cursor-default hover:text-textMuted'}`} aria-label="Лайки матча" title={canReact ? 'Поставить лайк' : 'Лайки'}>
        <ThumbsUp size={12} /> {likes}
      </button>
      <button type="button" onClick={onReact('dislike')} className={`${baseClass} ${userReaction === 'dislike' ? 'text-red-400' : 'hover:text-textPrimary'} ${canReact ? '' : 'cursor-default hover:text-textMuted'}`} aria-label="Дизлайки матча" title={canReact ? 'Поставить дизлайк' : 'Дизлайки'}>
        <ThumbsDown size={12} /> {dislikes}
      </button>
    </div>
  )
}
