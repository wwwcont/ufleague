import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CommentAuthorState, CommentEntityType, CommentNode, CommentReactionType } from '../../domain/entities/types'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'

const updateCommentTree = (items: CommentNode[], commentId: string, updater: (comment: CommentNode) => CommentNode): CommentNode[] =>
  items.map((item) => {
    if (item.id === commentId) return updater(item)
    return { ...item, replies: updateCommentTree(item.replies, commentId, updater) }
  })

const extractUiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Нужна активная session. Сначала выполните вход.'
    if (error.status === 403 && error.message.includes('restricted')) return 'Ваш аккаунт ограничен: комментирование недоступно.'
    if (error.status === 403) return 'Недостаточно прав для этого действия.'
    if (error.status === 429) return 'Слишком часто. Подождите немного и попробуйте снова.'
    return `Ошибка API (${error.status}): ${error.message}`
  }
  return 'Не удалось выполнить действие с комментариями.'
}

interface UseEntityCommentsResult {
  comments: CommentNode[]
  isLoading: boolean
  isSubmitting: boolean
  author: CommentAuthorState | null
  composerBlockedReason: string | null
  cooldownLeft: number
  feedbackMessage: string | null
  activeReplyTo: { id: string; author: string } | null
  setActiveReplyTo: (reply: { id: string; author: string } | null) => void
  addComment: (text: string) => Promise<void>
  addReply: (parentId: string, text: string) => Promise<void>
  removeComment: (commentId: string) => Promise<void>
  reactToComment: (commentId: string, reaction: Exclude<CommentReactionType, null>) => Promise<void>
  loadComments: () => Promise<void>
}

export const useEntityComments = (entityType: CommentEntityType, entityId?: string): UseEntityCommentsResult => {
  const { commentsRepository } = useRepositories()
  const [comments, setComments] = useState<CommentNode[]>([])
  const [author, setAuthor] = useState<CommentAuthorState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)
  const [nowTs, setNowTs] = useState(0)
  const [activeReplyTo, setActiveReplyTo] = useState<{ id: string; author: string } | null>(null)

  const load = useCallback(async () => {
    if (!entityId) {
      setComments([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setFeedbackMessage(null)
    try {
      const [list, currentAuthor] = await Promise.all([
        commentsRepository.getComments(entityType, entityId),
        commentsRepository.getCurrentAuthor(),
      ])
      setComments(list)
      setAuthor(currentAuthor)
    } catch (error) {
      setFeedbackMessage(extractUiError(error))
    } finally {
      setIsLoading(false)
    }
  }, [commentsRepository, entityId, entityType])

  useEffect(() => {
    void load()
  }, [load])

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
    if (cooldownLeft > 0) return `Новый комментарий можно отправить через ${cooldownLeft} c.`
    return null
  }, [author, cooldownLeft])

  const addComment = useCallback(async (text: string) => {
    if (!entityId) return
    setIsSubmitting(true)
    setFeedbackMessage(null)
    try {
      await commentsRepository.createComment(entityType, entityId, text)
      setLastSentAt(new Date().getTime())
      setNowTs(new Date().getTime())
      await load()
    } catch (error) {
      setFeedbackMessage(extractUiError(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [commentsRepository, entityId, entityType, load])

  const addReply = useCallback(async (parentId: string, text: string) => {
    setIsSubmitting(true)
    setFeedbackMessage(null)
    try {
      await commentsRepository.replyToComment(parentId, text)
      setLastSentAt(new Date().getTime())
      setNowTs(new Date().getTime())
      setActiveReplyTo(null)
      await load()
    } catch (error) {
      setFeedbackMessage(extractUiError(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [commentsRepository, load])

  const removeComment = useCallback(async (commentId: string) => {
    setIsSubmitting(true)
    setFeedbackMessage(null)
    try {
      await commentsRepository.deleteComment(commentId)
      setComments((prev) => prev.filter((item) => item.id !== commentId).map((item) => ({ ...item, replies: item.replies.filter((reply) => reply.id !== commentId) })))
      await load()
    } catch (error) {
      setFeedbackMessage(extractUiError(error))
    } finally {
      setIsSubmitting(false)
    }
  }, [commentsRepository, load])

  const reactToComment = useCallback(async (commentId: string, reaction: Exclude<CommentReactionType, null>) => {
    const before = comments
    setFeedbackMessage(null)

    const applyReaction = (comment: CommentNode) => {
      const current = comment.reactions.userReaction
      let likes = comment.reactions.likes
      let dislikes = comment.reactions.dislikes

      if (current === 'like') likes = Math.max(likes - 1, 0)
      if (current === 'dislike') dislikes = Math.max(dislikes - 1, 0)

      const nextReaction: CommentReactionType = current === reaction ? null : reaction
      if (nextReaction === 'like') likes += 1
      if (nextReaction === 'dislike') dislikes += 1

      return { ...comment, reactions: { likes, dislikes, userReaction: nextReaction } }
    }

    setComments((prev) => updateCommentTree(prev, commentId, applyReaction))

    try {
      await commentsRepository.setReaction(commentId, reaction)
    } catch (error) {
      setComments(before)
      setFeedbackMessage(extractUiError(error))
    }
  }, [comments, commentsRepository])

  return {
    comments,
    isLoading,
    isSubmitting,
    author,
    composerBlockedReason,
    cooldownLeft,
    feedbackMessage,
    activeReplyTo,
    setActiveReplyTo,
    addComment,
    addReply,
    removeComment,
    reactToComment,
    loadComments: load,
  }
}
