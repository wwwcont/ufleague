import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CalendarClock, ShieldCheck, Trophy, Users, Wrench } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useEvents } from '../../hooks/data/useEvents'
import { useStandings } from '../../hooks/data/useStandings'
import { useMatches } from '../../hooks/data/useMatches'
import { useTeams } from '../../hooks/data/useTeams'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { TeamAvatar } from '../../components/ui/TeamAvatar'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { tournament } from '../../mocks/data/tournament'
import { CommentsSection } from '../../components/comments'
import { EventFeedSection } from '../../components/events'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { canManageTeam } from '../../domain/services/accessControl'
import { ApiError } from '../../infrastructure/api/repositories'

const formLabel: Record<string, string> = { W: 'В', D: 'Н', L: 'П' }

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)
  const { data: teamFeed } = useEvents({ entityType: 'team', entityId: teamId, limit: 4 })
  const { data: standings } = useStandings()
  const { data: matches } = useMatches()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { teamsRepository, uploadsRepository } = useRepositories()
  const [editableName, setEditableName] = useState('')
  const [editableSlogan, setEditableSlogan] = useState('')
  const [editableDescription, setEditableDescription] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [manageStatus, setManageStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!team) return
    setEditableName(team.name)
    setEditableSlogan(team.slogan ?? '')
    setEditableDescription(team.description ?? '')
  }, [team])

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const standing = standings?.find((row) => row.teamId === team.id)
  const allTeamMatches = (matches ?? []).filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id)
  const teamMatches = allTeamMatches.slice(0, 3)
  const hasMoreMatches = allTeamMatches.length > 3
  const teamMap = Object.fromEntries((teams ?? []).map((item) => [item.id, item]))

  const liveMatch = allTeamMatches.find((match) => match.status === 'live' || match.status === 'half_time')
  const nextMatch = allTeamMatches
    .filter((match) => match.status === 'scheduled')
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0]

  const tourStatus = liveMatch
    ? `LIVE • ${liveMatch.round}`
    : nextMatch
      ? `Следующий • ${nextMatch.round}`
      : 'ВЫБЫЛА'
  const canManageCurrentTeam = canManageTeam(session, team)
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) return `Ошибка API ${error.status}: ${error.message}`
    return error instanceof Error ? error.message : 'Не удалось сохранить'
  }

  return (
    <PageContainer>
      <section className="relative overflow-hidden rounded-2xl border border-borderStrong bg-panelBg p-5 shadow-matte">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/75" />
          {team.logoUrl && <img src={team.logoUrl} alt="" className="h-full w-full scale-[1.45] object-cover blur-2xl opacity-35" />}
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-4">
            <TeamAvatar team={team} size="xl" fallbackLogoUrl={tournament.logoUrl} className="h-20 w-20 border border-borderStrong bg-panelSoft p-2" />
            <div>
              <h1 className="text-3xl font-bold text-textPrimary">{team.name}</h1>
              {team.slogan && <p className="mt-1 text-sm text-textSecondary">{team.slogan}</p>}
            </div>
          </div>

          {team.description && <p className="max-w-3xl text-sm leading-relaxed text-textSecondary">{team.description}</p>}

          <SocialLinks
            compact
            links={{ telegram: team.socials?.telegram, vk: team.socials?.vk, instagram: team.socials?.instagram }}
            custom={team.socials?.custom}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Trophy size={16} className="text-accentYellow" /> ИНФОРМАЦИЯ</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Позиция:</span> <span className="font-semibold text-textPrimary">#{standing?.position ?? '—'}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Очки:</span> <span className="font-semibold text-accentYellow">{standing?.points ?? team.statsSummary.points}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Матчи:</span> {team.statsSummary.played}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Форма:</span> {team.form.map((item) => formLabel[item] ?? item).join(' ')}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Голы:</span> {team.statsSummary.goalsFor}:{team.statsSummary.goalsAgainst}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">ТУР:</span> {tourStatus}</div>
        </div>
      </section>

      {canManageCurrentTeam && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={15} className="text-accentYellow" /> Редактировать команду</h2>
          <div className="grid gap-2">
            <input value={editableName} onChange={(event) => setEditableName(event.target.value)} placeholder="Название команды" className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
            <input value={editableSlogan} onChange={(event) => setEditableSlogan(event.target.value)} placeholder="Лозунг (необязательно)" className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
            <textarea value={editableDescription} onChange={(event) => setEditableDescription(event.target.value)} placeholder="Описание команды (необязательно)" className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
            <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs" />
            <button
              type="button"
              className="w-fit rounded-lg bg-accentYellow px-3 py-2 text-sm font-semibold text-app"
              onClick={async () => {
                try {
                  const logoUrl = logoFile ? (await uploadsRepository.uploadImage(logoFile)).url : undefined
                  await teamsRepository.updateTeam?.(team.id, { name: editableName, city: editableDescription, logoUrl })
                  setManageStatus('Изменения сохранены')
                } catch (error) {
                  setManageStatus(actionError(error))
                }
              }}
            >
              Сохранить
            </button>
            {manageStatus && <p className="text-xs text-textMuted">{manageStatus}</p>}
          </div>
        </section>
      )}

      <EventFeedSection title="События команды" events={teamFeed ?? []} layout="timeline" messageWhenEmpty="События команды пока не добавлены." />

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> СОСТАВ</h2>
          <Link to="/players" className="text-xs text-accentYellow hover:underline">ВСЕ</Link>
        </div>
        <div className="space-y-2">
          {players?.length ? players.map((player) => <PlayerRow key={player.id} player={player} />) : <p className="text-sm text-textMuted">Состав пока не загружен.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><CalendarClock size={16} className="text-accentYellow" /> Последние матчи</h2>
          {hasMoreMatches && <Link to="/matches" className="text-xs text-accentYellow hover:underline">ВСЕ</Link>}
        </div>
        <div className="space-y-2">
          {teamMatches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-3 py-6 text-center text-sm text-textMuted">Недавние матчи отсутствуют.</p>
          ) : (
            teamMatches.map((match) => {
              const opponentId = match.homeTeamId === team.id ? match.awayTeamId : match.homeTeamId
              const opponent = teamMap[opponentId]
              const isHome = match.homeTeamId === team.id
              const teamScore = isHome ? match.score.home : match.score.away
              const opponentScore = isHome ? match.score.away : match.score.home

              return (
                <Link key={match.id} to={`/matches/${match.id}`} className="flex items-center justify-between rounded-xl border border-borderSubtle bg-mutedBg px-3 py-3 transition hover:border-borderStrong">
                  <div className="flex min-w-0 items-center gap-2">
                    {opponent && <TeamAvatar team={opponent} size="md" fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-1" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-textPrimary">vs {opponent?.name ?? 'Соперник'}</p>
                      <p className="text-xs text-textMuted">{match.round} · {match.date}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold tabular-nums text-textPrimary">{teamScore}<span className="mx-1 text-accentYellow">:</span>{opponentScore}</p>
                </Link>
              )
            })
          )}
        </div>
      </section>

      <CommentsSection entityType="team" entityId={team.id} title="Комментарии" />
      <p className="text-xs text-textMuted flex items-center gap-1"><ShieldCheck size={12} className="text-accentYellow" /> События команды создаются капитанами/админами через события и ЛК.</p>
    </PageContainer>
  )
}
