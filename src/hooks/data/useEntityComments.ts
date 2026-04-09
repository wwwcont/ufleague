import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CommentAuthorState, CommentEntityType, CommentNode, CommentReactionType } from '../../domain/entities/types'
import { useRepositories } from '../../app/providers/use-repositories'

const nowStamp = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

const updateCommentTree = (items: CommentNode[], commentId: string, updater: (comment: CommentNode) => CommentNode): CommentNode[] =>
  items.map((item) => {
    if (item.id === commentId) return updater(item)
    return { ...item, replies: updateCommentTree(item.replies, commentId, updater) }
  })

const removeFromTree = (items: CommentNode[], commentId: string): CommentNode[] =>
  items
    .filter((item) => item.id !== commentId)
    .map((item) => ({
      ...item,
      replies: removeFromTree(item.replies, commentId),
    }))

const findComment = (items: CommentNode[], commentId: string): CommentNode | null => {
  for (const item of items) {
    if (item.id === commentId) return item
    const nested = findComment(item.replies, commentId)
    if (nested) return nested
  }
  return null
}

const findThreadRootId = (items: CommentNode[], commentId: string): string | null => {
  for (const item of items) {
    if (item.id === commentId) return item.parentId ?? item.id
    const nested = findThreadRootId(item.replies, commentId)
    if (nested) return nested
  }
  return null
}

interface UseEntityCommentsResult {
  comments: CommentNode[]
  isLoading: boolean
  author: CommentAuthorState | null
  composerBlockedReason: string | null
  cooldownLeft: number
  activeReplyTo: { id: string; author: string } | null
  setActiveReplyTo: (reply: { id: string; author: string } | null) => void
  addComment: (text: string) => void
  addReply: (parentId: string, text: string) => void
  removeComment: (commentId: string) => void
  reactToComment: (commentId: string, reaction: Exclude<CommentReactionType, null>) => void
}

export const useEntityComments = (entityType: CommentEntityType, entityId?: string): UseEntityCommentsResult => {
  const { commentsRepository } = useRepositories()
  const [comments, setComments] = useState<CommentNode[]>([])
  const [author, setAuthor] = useState<CommentAuthorState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)
  const [nowTs, setNowTs] = useState(0)
  const [activeReplyTo, setActiveReplyTo] = useState<{ id: string; author: string } | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!entityId) {
        setComments([])
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      const [list, currentAuthor] = await Promise.all([
        commentsRepository.getComments(entityType, entityId),
        commentsRepository.getCurrentAuthor(),
      ])
      if (!mounted) return
      setComments(list)
      setAuthor(currentAuthor)
      setIsLoading(false)
    }

    void run()
    return () => {
      mounted = false
    }
  }, [commentsRepository, entityId, entityType])

  const cooldownLeft = useMemo(() => {
    if (!author || !lastSentAt || !author.isGuest) return 0
    const elapsed = Math.floor((nowTs - lastSentAt) / 1000)
    return Math.max(author.cooldownSeconds - elapsed, 0)
  }, [author, lastSentAt, nowTs])

  useEffect(() => {
    if (cooldownLeft <= 0) return
    const timer = window.setInterval(() => {
      setNowTs((prev) => prev + 1000)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownLeft])

  const composerBlockedReason = useMemo(() => {
    if (!author) return null
    if (!author.canComment) return author.blockedReason ?? 'Комментирование временно недоступно'
    if (cooldownLeft > 0) return `Гость может писать раз в 30 секунд. Подождите ${cooldownLeft} c.`
    return null
  }, [author, cooldownLeft])

  const appendComment = useCallback((text: string, parentId: string | null) => {
    if (!author || !entityId) return

    const targetComment = parentId ? findComment(comments, parentId) : null
    const threadRootId = parentId ? findThreadRootId(comments, parentId) : null

    const normalizedText = targetComment
      ? (text.trim().startsWith(`@${targetComment.authorName}`) ? text : `@${targetComment.authorName} ${text}`)
      : text

    const payload: CommentNode = {
      id: `local_${Date.now()}`,
      entityType,
      entityId,
      parentId: threadRootId,
      authorName: author.name,
      authorRole: author.role,
      isOwn: true,
      createdAt: nowStamp(),
      text: normalizedText,
      reactions: { likes: 0, dislikes: 0, userReaction: null },
      canReply: true,
      canDelete: true,
      replies: [],
    }

    setComments((prev) => {
      if (!threadRootId) return [...prev, payload]
      return updateCommentTree(prev, threadRootId, (comment) => ({ ...comment, replies: [...comment.replies, payload] }))
    })

    setLastSentAt(new Date().getTime())
    setNowTs(new Date().getTime())
    setActiveReplyTo(null)
  }, [author, comments, entityId, entityType])

  const addComment = useCallback((text: string) => appendComment(text, null), [appendComment])
  const addReply = useCallback((parentId: string, text: string) => appendComment(text, parentId), [appendComment])

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => removeFromTree(prev, commentId))
  }, [])

  const reactToComment = useCallback((commentId: string, reaction: Exclude<CommentReactionType, null>) => {
    const applyReaction = (comment: CommentNode) => {
      const current = comment.reactions.userReaction
      let likes = comment.reactions.likes
      let dislikes = comment.reactions.dislikes

      if (current === 'like') likes = Math.max(likes - 1, 0)
      if (current === 'dislike') dislikes = Math.max(dislikes - 1, 0)

      const nextReaction: CommentReactionType = current === reaction ? null : reaction

      if (nextReaction === 'like') likes += 1
      if (nextReaction === 'dislike') dislikes += 1

      return {
        ...comment,
        reactions: {
          likes,
          dislikes,
          userReaction: nextReaction,
        },
      }
    }

    setComments((prev) => updateCommentTree(prev, commentId, applyReaction))
  }, [])

  return {
    comments,
    isLoading,
    author,
    composerBlockedReason,
    cooldownLeft,
    activeReplyTo,
    setActiveReplyTo,
    addComment,
    addReply,
    removeComment,
    reactToComment,
  }
}
