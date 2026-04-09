import { Link } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useEvents } from '../../hooks/data/useEvents'

export const EventsPage = () => {
  const { data } = useEvents()

  return (
    <PageContainer>
      <SectionHeader title="События" />
      <div className="space-y-2">
        {data.map((event) => (
          <Link key={event.id} to={`/events/${event.id}`} className="matte-panel block p-4">
            <p className="text-lg font-semibold">{event.title}</p>
            <p className="mt-1 text-sm text-textMuted">{event.date} • {event.author}</p>
          </Link>
        ))}
      </div>
    </PageContainer>
  )
}
