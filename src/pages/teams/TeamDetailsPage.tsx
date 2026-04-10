import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { ShieldCheck, Trophy, Users, Wrench } from 'lucide-react'
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
  const { teamsRepository, eventsRepository } = useRepositories()

  const [inviteUsername, setInviteUsername] = useState('')
  const [socialTelegram, setSocialTelegram] = useState('https://t.me/ufleague')
  const [transferCaptainId, setTransferCaptainId] = useState('')
  const [rosterPlayerId, setRosterPlayerId] = useState('')
  const [rosterVisible, setRosterVisible] = useState(true)
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 403) return 'Действие запрещено для вашей роли (403).'
      if (error.status === 429) return 'Слишком частые запросы (429). Повторите позже.'
      return `Ошибка API ${error.status}: ${error.message}`
    }
    return error instanceof Error ? error.message : 'Не удалось выполнить действие'
  }

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const standing = standings?.find((row) => row.teamId === team.id)
  const teamMatches = (matches ?? []).filter((match) => match.homeTeamId === team.id || match.awayTeamId === team.id).slice(0, 4)
  const teamMap = Object.fromEntries((teams ?? []).map((item) => [item.id, item]))
  const isCaptain = session.user.role === 'captain'
  const isAdmin = session.user.role === 'admin' || session.user.role === 'superadmin'

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <TeamAvatar team={team} size="xl" fallbackLogoUrl={tournament.logoUrl} className="border border-borderStrong bg-panelSoft p-2" />
            <div>
              <h1 className="text-2xl font-bold text-textPrimary">{team.name}</h1>
              <p className="text-sm text-textSecondary">{team.city}</p>
              <p className="mt-1 text-xs text-textMuted">Клуб с акцентом на интенсивный прессинг и быстрые вертикальные атаки.</p>
            </div>
          </div>
          {(isCaptain || isAdmin) && <div className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textMuted">role actions enabled</div>}
        </div>

        <div className="border-t border-borderSubtle pt-2">
          <SocialLinks compact links={{ telegram: socialTelegram }} />
        </div>
      </section>

      {(isCaptain || isAdmin) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Wrench size={16} className="text-accentYellow" /> Team role actions</h2>
          <div className="space-y-2 text-xs text-textSecondary">
            {isCaptain && (
              <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 space-y-2">
                <p className="font-semibold text-textPrimary">Captain tools</p>
                <div className="flex gap-2">
                  <input value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder="username для invite" className="flex-1 rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
                  <button
                    type="button"
                    className="rounded-lg bg-accentYellow px-2 py-1 font-semibold text-app"
                    onClick={async () => {
                      try { await teamsRepository.captainInviteByUsername?.(team.id, inviteUsername); setActionStatus('Invite отправлен') } catch (error) { setActionStatus(actionError(error)) }
                    }}
                  >Invite</button>
                </div>
                <div className="flex gap-2">
                  <input value={socialTelegram} onChange={(e) => setSocialTelegram(e.target.value)} placeholder="telegram link" className="flex-1 rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
                  <button
                    type="button"
                    className="rounded-lg border border-borderSubtle px-2 py-1"
                    onClick={async () => {
                      try { await teamsRepository.captainUpdateSocials?.(team.id, { telegram: socialTelegram }); setActionStatus('Соцсети обновлены') } catch (error) { setActionStatus(actionError(error)) }
                    }}
                  >Update socials</button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select value={rosterPlayerId} onChange={(e) => setRosterPlayerId(e.target.value)} className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">
                    <option value="">Игрок для roster visibility</option>
                    {(players ?? []).map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                  </select>
                  <label className="flex items-center gap-2 rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">
                    <input checked={rosterVisible} onChange={(e) => setRosterVisible(e.target.checked)} type="checkbox" />
                    visible
                  </label>
                  <button
                    type="button"
                    className="rounded-lg border border-borderSubtle px-2 py-1"
                    onClick={async () => {
                      try {
                        if (!rosterPlayerId) throw new Error('Выберите игрока')
                        await teamsRepository.captainSetRosterVisibility?.(team.id, rosterPlayerId, rosterVisible)
                        setActionStatus('Visibility ростера обновлена')
                      } catch (error) {
                        setActionStatus(actionError(error))
                      }
                    }}
                  >Apply roster visibility</button>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-borderSubtle px-2 py-1"
                  onClick={async () => {
                    try { await eventsRepository.createEventForScope?.({ scopeType: 'team', scopeId: team.id, title: `Update ${team.name}`, body: 'Team event created from Team details.' }); setActionStatus('Team event создан') } catch (error) { setActionStatus(actionError(error)) }
                  }}
                >Add team event</button>
              </div>
            )}

            {isAdmin && (
              <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 space-y-2">
                <p className="font-semibold text-textPrimary">Admin / Superadmin tools</p>
                <div className="flex gap-2">
                  <input value={transferCaptainId} onChange={(e) => setTransferCaptainId(e.target.value)} placeholder="new captain user id" className="flex-1 rounded-lg border border-borderSubtle bg-panelBg px-2 py-1" />
                  <button
                    type="button"
                    className="rounded-lg bg-accentYellow px-2 py-1 font-semibold text-app"
                    onClick={async () => {
                      try { await teamsRepository.adminTransferCaptain?.(team.id, transferCaptainId); setActionStatus('Капитан переведен') } catch (error) { setActionStatus(actionError(error)) }
                    }}
                  >Transfer captain</button>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-borderSubtle px-2 py-1"
                    onClick={async () => {
                      try { await teamsRepository.updateTeam?.(team.id, { name: `${team.name}*` }); setActionStatus('Team updated') } catch (error) { setActionStatus(actionError(error)) }
                    }}
                >Edit team (demo patch)</button>
                {session.user.role === 'superadmin' && <p className="text-[11px] text-accentYellow">Superadmin note: role/permission actions доступны в cabinet.</p>}
              </div>
            )}
            {actionStatus && <p className="rounded-lg border border-borderSubtle bg-panelBg px-2 py-1">{actionStatus}</p>}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-textPrimary"><Trophy size={16} className="text-accentYellow" /> Quick team stats</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Позиция:</span> <span className="font-semibold text-textPrimary">#{standing?.position ?? '—'}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Очки:</span> <span className="font-semibold text-accentYellow">{standing?.points ?? team.statsSummary.points}</span></div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Матчи:</span> {team.statsSummary.played}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Форма:</span> {team.form.map((item) => formLabel[item] ?? item).join(' ')}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Голы:</span> {team.statsSummary.goalsFor}:{team.statsSummary.goalsAgainst}</div>
        </div>
      </section>

      <EventFeedSection title="Team events / updates" events={teamFeed ?? []} layout="timeline" messageWhenEmpty="События команды пока не добавлены." />

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> Main squad / roster</h2>
          <Link to="/players" className="text-xs text-accentYellow hover:underline">Все игроки</Link>
        </div>

        <div className="space-y-2">
          {players?.length ? players.map((player) => <PlayerRow key={player.id} player={player} />) : <p className="text-sm text-textMuted">Состав пока не загружен.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 text-base font-semibold text-textPrimary">Recent matches</h2>
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

      <CommentsSection entityType="team" entityId={team.id} title="Team comments" />
      {(isCaptain || isAdmin) && <p className="text-xs text-textMuted flex items-center gap-1"><ShieldCheck size={12} className="text-accentYellow" /> Backend access rules still enforced (403/validation surfaced as status text).</p>}
    </PageContainer>
  )
}
