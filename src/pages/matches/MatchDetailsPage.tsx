import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useMatchDetails } from '../../hooks/data/useMatchDetails'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { EmptyState } from '../../components/ui/EmptyState'
import { TeamAvatar } from '../../components/ui/TeamAvatar'

const formatKickoff = (date: string, time: string) => {
  const [year, month, day] = date.split('-')
  return `${day}.${month}.${year} ${time}`
}

interface CommentItem {
  id: string
  author: string
  text: string
  isOwn: boolean
  createdAt: string
}

export const MatchDetailsPage = () => {
  const { matchId } = useParams()
  const { data: match } = useMatchDetails(matchId)
  const { data: teams } = useTeams()
  const { data: allMatches } = useMatches()

  const [likes, setLikes] = useState(112)
  const [dislikes, setDislikes] = useState(8)
  const [expandedChat, setExpandedChat] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [commentSearch, setCommentSearch] = useState('')
  const [comments, setComments] = useState<CommentItem[]>([
    { id: 'c1', author: 'Fan_11', text: 'Отличный темп в первом тайме!', isOwn: false, createdAt: '10:15' },
    { id: 'c2', author: 'You', text: 'Жду замену в центре поля.', isOwn: true, createdAt: '10:21' },
    { id: 'c3', author: 'UFL_Viewer', text: 'Судья держит планку.', isOwn: false, createdAt: '10:27' },
    { id: 'c4', author: 'You', text: 'Гол назревает!', isOwn: true, createdAt: '10:31' },
    { id: 'c5', author: 'NorthSide', text: 'Сильная игра в обороне.', isOwn: false, createdAt: '10:39' },
    { id: 'c6', author: 'Watcher', text: 'Нужен прессинг выше.', isOwn: false, createdAt: '10:44' },
  ])

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]))
  const home = match ? teamMap[match.homeTeamId] : null
  const away = match ? teamMap[match.awayTeamId] : null

  const teamStats = useMemo(() => {
    if (!allMatches || !match) return { homeRecent: [], awayRecent: [] }

    const pickRecent = (teamId: string) =>
      allMatches
        .filter((item) => item.homeTeamId === teamId || item.awayTeamId === teamId)
        .slice(0, 3)
        .map((item) => ({ id: item.id, score: `${item.score.home}:${item.score.away}` }))

    return {
      homeRecent: pickRecent(match.homeTeamId),
      awayRecent: pickRecent(match.awayTeamId),
    }
  }, [allMatches, match])

  if (!match || !teams || !home || !away) return <PageContainer><EmptyState title="Матч не найден" /></PageContainer>

  const visibleComments = expandedChat
    ? comments.filter((comment) => `${comment.author} ${comment.text}`.toLowerCase().includes(commentSearch.toLowerCase()))
    : comments.slice(-5)

  return (
    <PageContainer>
      <div className="-mx-4 flex items-center justify-between bg-elevated/80 px-4 py-2 text-sm text-textSecondary md:-mx-6 md:px-6">
        <span>{formatKickoff(match.date, match.time)}</span>
        {match.status === 'live' && <span className="inline-flex items-center gap-1 text-statusLive"><span className="live-dot h-2 w-2 rounded-full bg-statusLive" />LIVE</span>}
        <span>{match.venue}</span>
      </div>

      <section className="matte-panel overflow-hidden p-5">
        <div className="relative rounded-[18px] bg-app/85 px-4 py-6">
          <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-start pl-3 opacity-20">
            <TeamAvatar team={home} size="xl" />
          </div>
          <div className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-end pr-3 opacity-20">
            <TeamAvatar team={away} size="xl" />
          </div>
          <div className="absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 bg-gradient-to-r from-app/0 via-app/95 to-app/0" />

          <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-left">
              <Link to={`/teams/${home.id}`} className="text-lg font-semibold hover:text-accentYellow">{home.name}</Link>
            </div>
            <div className="text-4xl font-bold tabular-nums text-accentYellow">{match.score.home}:{match.score.away}</div>
            <div className="text-right">
              <Link to={`/teams/${away.id}`} className="text-lg font-semibold hover:text-accentYellow">{away.name}</Link>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-app/80 p-3">
            <p className="font-semibold">{home.shortName}</p>
            <p className="mt-1 text-textMuted">Форма: {home.form.join(' ')}</p>
            <p className="mt-1 text-textMuted">Последние матчи: {teamStats.homeRecent.map((item) => item.score).join(', ') || '—'}</p>
            <p className="mt-1 text-textMuted">Тотал голов: {home.statsSummary.goalsFor}</p>
          </div>
          <div className="rounded-xl bg-app/80 p-3 text-right">
            <p className="font-semibold">{away.shortName}</p>
            <p className="mt-1 text-textMuted">Форма: {away.form.join(' ')}</p>
            <p className="mt-1 text-textMuted">Последние матчи: {teamStats.awayRecent.map((item) => item.score).join(', ') || '—'}</p>
            <p className="mt-1 text-textMuted">Тотал голов: {away.statsSummary.goalsFor}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => setLikes((prev) => prev + 1)} className="px-2 py-1 text-sm">👍 {likes}</button>
          <button onClick={() => setDislikes((prev) => prev + 1)} className="px-2 py-1 text-sm">👎 {dislikes}</button>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-base font-semibold">Комментарии</p>
            <button onClick={() => setExpandedChat((prev) => !prev)} className="text-sm text-accentYellow">{expandedChat ? 'Свернуть' : 'Показать все'}</button>
          </div>

          {expandedChat && (
            <input
              value={commentSearch}
              onChange={(event) => setCommentSearch(event.target.value)}
              placeholder="Поиск по комментариям"
              className="mb-2 h-10 w-full rounded-xl bg-app/80 px-3 text-sm outline-none"
            />
          )}

          <div className="space-y-2">
            {visibleComments.map((comment) => (
              <div key={comment.id} className="rounded-xl bg-app/80 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{comment.author}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-textMuted">{comment.createdAt}</span>
                    <button onClick={() => setReplyTo(comment.author)} className="text-xs text-accentYellow">Ответить</button>
                    {comment.isOwn && <button onClick={() => setComments((prev) => prev.filter((item) => item.id !== comment.id))} className="text-xs text-accentYellow">Удалить</button>}
                  </div>
                </div>
                <p className="mt-1 text-sm text-textSecondary">{comment.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={newComment}
              onChange={(event) => setNewComment(event.target.value)}
              placeholder={replyTo ? `Ответ для ${replyTo}` : 'Написать комментарий'}
              className="h-10 w-full rounded-xl bg-app/80 px-3 text-sm outline-none"
            />
            <button
              onClick={() => {
                if (!newComment.trim()) return
                setComments((prev) => [...prev, { id: `c_${Date.now()}`, author: 'You', text: `${replyTo ? `@${replyTo} ` : ''}${newComment.trim()}`, isOwn: true, createdAt: 'сейчас' }])
                setNewComment('')
                setReplyTo(null)
              }}
              className="rounded-xl bg-accentYellow px-3 text-sm font-semibold text-app"
            >
              Отправить
            </button>
          </div>
        </div>
      </section>
    </PageContainer>
  )
}
