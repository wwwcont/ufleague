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
      <section className="matte-panel px-4 py-3 text-sm text-textSecondary">
        <div className="flex items-center justify-between">
          <span>{formatKickoff(match.date, match.time)}</span>
          {match.status === 'live' && <span className="inline-flex items-center gap-1 text-statusLive"><span className="live-dot h-2 w-2 rounded-full bg-statusLive" />LIVE</span>}
          <span>{match.venue}</span>
        </div>
      </section>

      <section className="matte-panel relative min-h-[320px] overflow-hidden p-5">
        <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-start pl-3 opacity-20">
          <TeamAvatar team={home} size="xl" />
        </div>
        <div className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-end pr-3 opacity-20">
          <TeamAvatar team={away} size="xl" />
        </div>
        <div className="absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 bg-gradient-to-r from-app/0 via-app/95 to-app/0" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div className="self-end text-sm text-textMuted">{match.status === 'live' ? 'Идет ' : ''}{match.status === 'live' ? '67′' : 'Матч'}</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div>
              <Link to={`/teams/${home.id}`} className="text-4xl font-bold tracking-[0.03em] hover:text-accentYellow">{home.shortName}</Link>
              <p className="mt-1 text-sm text-textMuted">{home.name}</p>
            </div>
            <div className="text-5xl font-bold tabular-nums text-accentYellow">{match.score.home}:{match.score.away}</div>
            <div className="text-right">
              <Link to={`/teams/${away.id}`} className="text-4xl font-bold tracking-[0.03em] hover:text-accentYellow">{away.shortName}</Link>
              <p className="mt-1 text-sm text-textMuted">{away.name}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => setLikes((prev) => prev + 1)} className="rounded-xl bg-app/80 px-3 py-2 text-sm">👍 {likes}</button>
            <button onClick={() => setDislikes((prev) => prev + 1)} className="rounded-xl bg-app/80 px-3 py-2 text-sm">👎 {dislikes}</button>
          </div>
        </div>
      </section>

      <section className="matte-panel overflow-hidden text-sm">
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/5 px-4 py-3">
          <span className="text-left text-textMuted">{home.form.join(' ')}</span>
          <span className="text-textSecondary">Форма</span>
          <span className="text-right text-textMuted">{away.form.join(' ')}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/5 px-4 py-3">
          <span className="text-left text-textMuted">{teamStats.homeRecent.map((item) => item.score).join(', ') || '—'}</span>
          <span className="text-textSecondary">Матчи</span>
          <span className="text-right text-textMuted">{teamStats.awayRecent.map((item) => item.score).join(', ') || '—'}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] px-4 py-3">
          <span className="text-left text-textMuted">{home.statsSummary.goalsFor}</span>
          <span className="text-textSecondary">Тотал голов</span>
          <span className="text-right text-textMuted">{away.statsSummary.goalsFor}</span>
        </div>
      </section>

      <section className="matte-panel p-4">
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
      </section>
    </PageContainer>
  )
}
