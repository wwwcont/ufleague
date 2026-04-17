import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import type { CommentEntityType } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { CommentsSection } from '../../components/comments'
import { EmptyState } from '../../components/ui/EmptyState'

const allowedTypes: CommentEntityType[] = ['match', 'team', 'player', 'event']

export const CommentsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { entityType, entityId } = useParams()

  useEffect(() => {
    const commentId = location.hash.replace('#comment-', '')
    if (!commentId) return
    window.setTimeout(() => {
      const node = document.getElementById(`comment-${commentId}`)
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [location.hash, entityId, entityType])

  if (!entityType || !entityId || !allowedTypes.includes(entityType as CommentEntityType)) {
    return <PageContainer><EmptyState title="Комментарии не найдены" /></PageContainer>
  }

  return (
    <PageContainer>
      <button type="button" onClick={() => navigate(-1)} className="w-fit text-sm text-accentYellow hover:underline">← Назад</button>
      <CommentsSection entityType={entityType as CommentEntityType} entityId={entityId} title="Все комментарии" collapsed={false} />
    </PageContainer>
  )
}
