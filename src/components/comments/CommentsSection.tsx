import { MessageSquare } from 'lucide-react'
import type { CommentEntityType } from '../../domain/entities/types'
import { useEntityComments } from '../../hooks/data/useEntityComments'
import { CommentComposer } from './CommentComposer'
import { CommentList } from './CommentList'

interface CommentsSectionProps {
  entityType: CommentEntityType
  entityId: string
  title?: string
}

export const CommentsSection = ({ entityType, entityId, title = 'Комментарии' }: CommentsSectionProps) => {
  const {
    comments,
    author,
    isLoading,
    composerBlockedReason,
    activeReplyTo,
    setActiveReplyTo,
    addComment,
    addReply,
    removeComment,
    reactToComment,
  } = useEntityComments(entityType, entityId)

  return (
    <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><MessageSquare size={16} className="text-accentYellow" /> {title}</h2>
        {author && <span className="rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs text-textMuted">role: {author.role}</span>}
      </div>

      <div className="mb-3">
        <CommentComposer
          blockedReason={composerBlockedReason}
          replyTo={activeReplyTo}
          onCancelReply={() => setActiveReplyTo(null)}
          onSubmit={(text, replyToId) => {
            if (replyToId) addReply(replyToId, text)
            else addComment(text)
          }}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-textMuted">Загрузка комментариев...</p>
      ) : (
        <CommentList
          comments={comments}
          onReply={(commentId, authorName) => setActiveReplyTo({ id: commentId, author: authorName })}
          onDelete={removeComment}
          onReact={reactToComment}
        />
      )}
    </section>
  )
}
