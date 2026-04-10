import { useNavigate, useParams } from 'react-router-dom'
import type { CommentEntityType } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { CommentsSection } from '../../components/comments'
import { EmptyState } from '../../components/ui/EmptyState'

const allowedTypes: CommentEntityType[] = ['match', 'team', 'player', 'event']

export const CommentsPage = () => {
  const navigate = useNavigate()
  const { entityType, entityId } = useParams()
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
