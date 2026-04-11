import { MessageSquare } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CommentEntityType } from '../../domain/entities/types'
import { useEntityComments } from '../../hooks/data/useEntityComments'
import { CommentComposer } from './CommentComposer'
import { CommentList } from './CommentList'

interface CommentsSectionProps {
  entityType: CommentEntityType
  entityId: string
  title?: string
  collapsed?: boolean
}

export const CommentsSection = ({ entityType, entityId, title = 'Комментарии', collapsed = true }: CommentsSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(!collapsed)
  const {
    comments,
    author,
    isLoading,
    isSubmitting,
    composerBlockedReason,
    feedbackMessage,
    activeReplyTo,
    setActiveReplyTo,
    addComment,
    addReply,
    removeComment,
    reactToComment,
    loadComments,
  } = useEntityComments(entityType, entityId)
  const previewComments = useMemo(() => {
    const flat: typeof comments = []
    const walk = (nodes: typeof comments) => {
      nodes.forEach((node) => {
        flat.push({ ...node, replies: [] })
        if (node.replies.length) walk(node.replies)
      })
    }
    walk(comments)
    return flat.slice(-3)
  }, [comments])
  const visibleComments = isExpanded ? comments : previewComments

  return (
    <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><MessageSquare size={16} className="text-accentYellow" /> {title}</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { void loadComments() }} className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textMuted">Обновить</button>
        </div>
      </div>
      {author?.blockedReason && (
        <p className="mb-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200">
          Комментирование ограничено: {author.blockedReason ?? 'ограничение аккаунта'}.
        </p>
      )}

      <div className="mb-3">
        <CommentComposer
          blockedReason={composerBlockedReason}
          statusMessage={feedbackMessage}
          isSubmitting={isSubmitting}
          replyTo={activeReplyTo}
          onCancelReply={() => setActiveReplyTo(null)}
          onSubmit={async (text, replyToId) => {
            if (replyToId) await addReply(replyToId, text)
            else await addComment(text)
          }}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-textMuted">Загрузка комментариев...</p>
      ) : (
        <CommentList
          comments={visibleComments}
          onReply={(commentId, authorName) => setActiveReplyTo({ id: commentId, author: authorName })}
          onDelete={(commentId) => { void removeComment(commentId) }}
          onReact={(commentId, reaction) => { void reactToComment(commentId, reaction) }}
          showRoleBadge={isExpanded}
          showThread={isExpanded}
        />
      )}
      {collapsed && comments.length > 3 && (
        <div className="mt-3 text-right">
          <button type="button" className="text-sm text-accentYellow hover:underline" onClick={() => setIsExpanded((prev) => !prev)}>
            {isExpanded ? 'Свернуть' : `Развернуть (${comments.length})`}
          </button>
        </div>
      )}
    </section>
  )
}
