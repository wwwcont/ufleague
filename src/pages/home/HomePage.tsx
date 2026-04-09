import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { MatchCard } from '../../components/data-display/MatchCard'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { SectionHeader } from '../../components/ui/SectionHeader'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'

const adminNews = [
  { id: 'n1', title: 'Обновлено расписание плей-офф', time: 'Сегодня' },
  { id: 'n2', title: 'Открыта аккредитация на финал', time: 'Вчера' },
  { id: 'n3', title: 'Добавлен новый формат статистики игроков', time: '2 дня назад' },
]

export const HomePage = () => {
  const { data: matchList } = useMatches()
  const { data: teams } = useTeams()
  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const liveAndUpcoming = (matchList ?? []).filter((m) => m.status === 'live' || m.status === 'scheduled').slice(0, 5)

  return (
    <PageContainer>
      <Link to="/search" className="matte-panel mt-1 flex items-center gap-2 px-4 py-2.5 text-sm text-textSecondary hover:text-textPrimary" aria-label="Открыть поиск">
        <Search size={15} className="text-accentYellow" />
        <span className="typing-cursor text-base leading-none" aria-hidden="true">|</span>
      </Link>

      <h2 className="mt-3 text-2xl font-bold uppercase tracking-[0.08em]">UNITED FOOLBALL LEAGUE</h2>

      <SectionHeader title="События / Новости" action={<button className="text-sm text-accentYellow">ВСЕ</button>} />
      <div className="space-y-2">
        {adminNews.map((item) => (
          <article key={item.id} className="matte-panel px-4 py-3">
            <p className="text-base text-textPrimary">{item.title}</p>
            <p className="mt-1 text-sm text-textMuted">{item.time}</p>
          </article>
        ))}
      </div>

      <SectionHeader title="LIVE / Предстоящие" action={<Link to="/matches" className="text-sm text-accentYellow">ВСЕ</Link>} />
      {liveAndUpcoming.length === 0 || !teams ? (
        <EmptyState title="Матчи не найдены" />
      ) : (
        <div className="space-y-2">
          {liveAndUpcoming.map((match) => (
            <MatchCard key={match.id} match={match} home={teamMap[match.homeTeamId]} away={teamMap[match.awayTeamId]} />
          ))}
        </div>
      )}
    </PageContainer>
  )
}
