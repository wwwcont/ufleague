import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EyeOff, Pencil, UserPlus, Users, X } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useMatches } from '../../hooks/data/useMatches'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { canManageTeam } from '../../domain/services/accessControl'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'
import type { PublicUserCard } from '../../domain/entities/types'
import { buildPlayerStatsMap } from '../../domain/services/teamPlayerStats'
import { notifyInfo, notifySuccess, toRussianMessage } from '../../lib/notifications'

export const TeamRosterPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)
  const { data: matches } = useMatches()
  const { session } = useSession()
  const { teamsRepository, usersRepository } = useRepositories()
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteCandidates, setInviteCandidates] = useState<PublicUserCard[]>([])
  const [selectedInviteUserId, setSelectedInviteUserId] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])

  useEffect(() => {
    if (!status) return
    const message = toRussianMessage(status)
    if (message.includes('Найдено') || message.includes('Пользователь найден')) {
      notifyInfo(message)
      return
    }
    notifySuccess(message)
  }, [status])

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const canManageCurrentTeam = canManageTeam(session, team)
  const effectiveHidden = new Set([
    ...(players?.filter((item) => item.isHidden).map((item) => item.id) ?? []),
    ...hiddenIds,
  ])

  const visiblePlayers = (() => {
    const source = (players ?? []).filter((item) => !removedIds.includes(item.id))
    const statsMap = buildPlayerStatsMap(source, matches ?? [])
    const withStats = source.map((item) => ({ ...item, stats: statsMap.get(item.id) ?? item.stats }))
    const captain = team.captainUserId
      ? (withStats.find((player) => player.userId === team.captainUserId) ?? withStats.find((player) => player.id === team.captainUserId) ?? null)
      : null
    const base = canManageCurrentTeam
      ? withStats
      : withStats.filter((item) => !effectiveHidden.has(item.id) || item.id === captain?.id)
    if (!captain) return base
    return [captain, ...base.filter((item) => item.id !== captain.id)]
  })()
  const captainPlayerId = team.captainUserId
    ? (visiblePlayers.find((player) => player.userId === team.captainUserId)?.id
      ?? visiblePlayers.find((player) => player.id === team.captainUserId)?.id
      ?? null)
    : null

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> Состав команды: {team.name}</h1>
          <Link to={`/teams/${team.id}`} className="text-xs text-accentYellow">К странице команды</Link>
        </div>

        {canManageCurrentTeam && (
          <div className="mb-3 rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="mb-2 text-xs text-textMuted">@юзер + пригласить</p>
            <div className="flex flex-wrap items-center gap-2">
              <input value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} placeholder="@telegram_username" className="min-w-[220px] flex-1 rounded-lg border border-borderSubtle bg-panelBg px-3 py-2 text-sm" />
              <button type="button" disabled={!inviteUsername.trim()} className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs font-semibold text-textPrimary disabled:opacity-50" onClick={async () => {
                try {
                  const normalized = inviteUsername.trim().replace(/^@/, '')
                  const exact = await usersRepository.findByTelegramUsername?.(normalized)
                  const list = await usersRepository.searchByTelegramUsername?.(normalized)
                  const merged = exact ? [exact, ...(list ?? []).filter((item) => item.id !== exact.id)] : (list ?? [])
                  setInviteCandidates(merged)
                  setSelectedInviteUserId(merged[0]?.id ?? '')
                  if (!merged.length) throw new Error('Пользователь не найден')
                  setStatus(merged.length > 1 ? `Найдено ${merged.length} пользователей. Выберите нужного и нажмите «Пригласить».` : 'Пользователь найден, можно приглашать')
                } catch (error) {
                  setStatus((error as Error).message)
                }
              }}>
                Найти
              </button>
              <button type="button" disabled={!selectedInviteUserId} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                try {
                  const found = inviteCandidates.find((item) => item.id === selectedInviteUserId)
                  if (!found) throw new Error('Выберите пользователя из списка')
                  if (found.teamId === team.id) {
                    setStatus('Пользователь уже состоит в этой команде')
                    return
                  }
                  await teamsRepository.captainInviteByUsername?.(team.id, found.telegramUsername ?? inviteUsername.replace(/^@/, ''))
                  setInviteUsername('')
                  setInviteCandidates([])
                  setSelectedInviteUserId('')
                  setStatus('Приглашение отправлено')
                } catch (error) {
                  setStatus((error as Error).message)
                }
              }}>
                <UserPlus size={12} /> Пригласить
              </button>
            </div>
            {inviteCandidates.length > 0 && (
              <div className="mt-2 rounded-lg border border-borderSubtle bg-panelBg p-2">
                <select value={selectedInviteUserId} onChange={(event) => setSelectedInviteUserId(event.target.value)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1 text-xs">
                  {inviteCandidates.map((item) => (
                    <option key={item.id} value={item.id}>{item.displayName}{item.telegramUsername ? ` (@${item.telegramUsername})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {visiblePlayers.length ? visiblePlayers.map((player) => {
            const isHidden = effectiveHidden.has(player.id)
            return (
              <div key={player.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <PlayerRow player={player} />
                    {player.id === captainPlayerId && <p className="mt-1 text-xs font-semibold text-accentYellow">Капитан команды</p>}
                    {isHidden && <p className="mt-1 text-xs text-textMuted">Скрыт из публичного состава</p>}
                  </div>
                  {canManageCurrentTeam && (
                    <div className="flex items-center gap-1">
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary" onClick={async () => {
                        try {
                          await teamsRepository.captainSetRosterVisibility?.(team.id, player.id, isHidden)
                          setHiddenIds((prev) => (isHidden ? prev.filter((id) => id !== player.id) : [...prev, player.id]))
                          setStatus(isHidden ? 'Игрок снова виден в составе' : 'Игрок скрыт из состава')
                        } catch (error) {
                          setStatus((error as Error).message)
                        }
                      }} aria-label="Скрыть">
                        <EyeOff size={12} />
                      </button>
                      <Link to={`/players/${player.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary" aria-label="Редактировать">
                        <Pencil size={12} />
                      </Link>
                      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 text-red-300" onClick={async () => {
                        if (!window.confirm('Удалить игрока из состава команды?')) return
                        try {
                          await teamsRepository.captainSetRosterVisibility?.(team.id, player.id, false)
                          setRemovedIds((prev) => [...prev, player.id])
                          setStatus('Игрок удален из состава команды')
                        } catch (error) {
                          setStatus((error as Error).message)
                        }
                      }} aria-label="Удалить">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          }) : <p className="text-sm text-textMuted">Состав пуст.</p>}
        </div>
        {status && <p className="mt-3 text-xs text-textMuted">{status}</p>}
      </section>
    </PageContainer>
  )
}
