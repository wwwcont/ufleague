import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EyeOff, Pencil, UserPlus, Users, X } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { usePlayers } from '../../hooks/data/usePlayers'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { canManageTeam } from '../../domain/services/accessControl'
import { PlayerRow } from '../../components/data-display/PlayerRow'
import { EmptyState } from '../../components/ui/EmptyState'

export const TeamRosterPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)
  const { session } = useSession()
  const { teamsRepository, playersRepository, usersRepository } = useRepositories()
  const [inviteUsername, setInviteUsername] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])

  if (!team) return <PageContainer><EmptyState title="Команда не найдена" /></PageContainer>

  const canManageCurrentTeam = canManageTeam(session, team)
  const effectiveHidden = new Set([
    ...(players?.filter((item) => item.isHidden).map((item) => item.id) ?? []),
    ...hiddenIds,
  ])

  const visiblePlayers = (() => {
    const source = (players ?? []).filter((item) => !removedIds.includes(item.id))
    if (canManageCurrentTeam) return source
    return source.filter((item) => !effectiveHidden.has(item.id))
  })()

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
              <button type="button" disabled={!inviteUsername.trim().startsWith('@')} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                try {
                  const found = await usersRepository.findByTelegramUsername?.(inviteUsername)
                  if (!found) throw new Error('Пользователь не найден')
                  await teamsRepository.captainInviteByUsername?.(team.id, found.telegramUsername ?? inviteUsername.replace(/^@/, ''))
                  await playersRepository.createPlayer?.({ userId: found.id, teamId: team.id, fullName: found.displayName, position: 'MF', shirtNumber: 0 })
                  setInviteUsername('')
                  setStatus('Игрок приглашен в команду')
                } catch (error) {
                  setStatus((error as Error).message)
                }
              }}>
                <UserPlus size={12} /> Пригласить
              </button>
            </div>
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
