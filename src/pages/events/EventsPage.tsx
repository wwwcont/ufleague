import { Link } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useEvents } from '../../hooks/data/useEvents'
import { EventFeedSection } from '../../components/events'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export const EventsPage = () => {
  const { data, isLoading, error } = useEvents()

  return (
    <PageContainer>
      <SectionHeader title="События турнира" action={<Link to="/" className="text-sm text-accentYellow">На главную</Link>} />
      {isLoading && <LoadingState title="Загружаем ленту событий" />}
      {error && <ErrorState title="Ошибка ленты" subtitle="Не удалось загрузить события" />}
      {!isLoading && !error && <EventFeedSection title="Public event timeline" layout="timeline" events={data ?? []} messageWhenEmpty="Событий пока нет." />}
    </PageContainer>
  )
}
