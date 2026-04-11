import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Match, UserRole } from '../../domain/entities/types'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'

const roleRank: Record<UserRole, number> = {
  guest: 0,
  player: 1,
  captain: 2,
  admin: 3,
  superadmin: 4,
}

const sectionRoles: Record<string, UserRole> = {
  profile: 'guest',
  edit: 'guest',
  activity: 'guest',
  reactions: 'guest',
  permissions: 'guest',
  'player-profile': 'player',
  'player-media': 'player',
  team: 'player',
  'team-events': 'captain',
  invites: 'captain',
  'team-socials': 'captain',
  roster: 'captain',
  moderation: 'admin',
  'comment-blocks': 'admin',
  tournament: 'captain',
  roles: 'superadmin',
  rbac: 'superadmin',
  restrictions: 'superadmin',
  settings: 'guest',
}

const parseCSV = (raw: string) => raw.split(',').map((item) => item.trim()).filter(Boolean)

const statusTone = (status: string) => status.startsWith('ok:') ? 'text-emerald-300' : 'text-rose-300'

export const CabinetSectionPage = () => {
  const { section } = useParams()
  const { session } = useSession()
  const { cabinetRepository, teamsRepository, playersRepository, matchesRepository, eventsRepository } = useRepositories()

  const [status, setStatus] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [socialsRaw, setSocialsRaw] = useState('')

  const [teamId, setTeamId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [eventId, setEventId] = useState('')
  const [username, setUsername] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [visible, setVisible] = useState(true)
  const [teamSocialsRaw, setTeamSocialsRaw] = useState('telegram=https://t.me/')

  const [commentId, setCommentId] = useState('')
  const [blockedUserId, setBlockedUserId] = useState('')
  const [permanent, setPermanent] = useState(false)
  const [untilUnix, setUntilUnix] = useState('0')
  const [reason, setReason] = useState('')

  const [targetUserId, setTargetUserId] = useState('')
  const [rolesRaw, setRolesRaw] = useState('player')
  const [permissionsRaw, setPermissionsRaw] = useState('comments:moderate')
  const [restrictionsRaw, setRestrictionsRaw] = useState('comments:banned')
  const [settingKey, setSettingKey] = useState('ui.flags')
  const [settingValueRaw, setSettingValueRaw] = useState('{"newCabinet":true}')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSlug, setNewTeamSlug] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerPosition, setNewPlayerPosition] = useState('MF')
  const [newPlayerNumber, setNewPlayerNumber] = useState('10')
  const [matchHomeTeamId, setMatchHomeTeamId] = useState('')
  const [matchAwayTeamId, setMatchAwayTeamId] = useState('')
  const [matchStartAt, setMatchStartAt] = useState('')
  const [matchStatus, setMatchStatus] = useState<Match['status']>('scheduled')
  const [matchVenue, setMatchVenue] = useState('')

  const minRole = section ? sectionRoles[section] : null
  const allowed = minRole ? roleRank[session.user.role] >= roleRank[minRole] : false
  const isAdminScope = roleRank[session.user.role] >= roleRank.admin

  const socials = useMemo(() => Object.fromEntries(parseCSV(socialsRaw).map((line) => {
    const idx = line.indexOf('=')
    if (idx < 0) return [line, '']
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  }).filter(([key]) => key)), [socialsRaw])

  const teamSocials = useMemo(() => Object.fromEntries(parseCSV(teamSocialsRaw).map((line) => {
    const idx = line.indexOf('=')
    if (idx < 0) return [line, '']
    return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
  }).filter(([key]) => key)), [teamSocialsRaw])

  if (!section || !minRole) {
    return (
      <PageContainer>
        <section className="matte-panel p-4">
          <h2 className="text-lg font-semibold">Раздел не найден</h2>
          <p className="mt-1 text-sm text-textMuted">Проверьте ссылку или вернитесь в кабинет.</p>
          <Link to="/profile" className="mt-3 inline-flex text-sm text-accentYellow">Вернуться в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  if (!allowed) {
    return (
      <PageContainer>
        <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
          <h2 className="text-lg font-semibold text-textPrimary">{section}</h2>
          <div className="mt-3 rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="flex items-center gap-2"><AlertTriangle size={14} className="text-accentYellow" /> Недостаточно прав для этого раздела.</p>
            <p className="mt-1 text-xs text-textMuted">Минимальная роль: {minRole}. Текущая роль: {session.user.role}.</p>
          </div>
          <Link to="/profile" className="mt-4 inline-flex text-sm text-accentYellow">← Назад в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-lg font-semibold text-textPrimary">{section}</h2>
        <p className="mt-1 text-sm text-textSecondary">Раздел подключен к backend action handlers.</p>
      </section>

      {section === 'activity' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="font-semibold text-textPrimary">Комментарии и реакции</p>
            <p className="mt-1">Откройте comments у любой сущности (team/player/match/event), чтобы создать comment, reply, like/dislike и проверить ограничения 403/429.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/events" className="rounded-lg border border-borderSubtle px-3 py-2">К событиям</Link>
            <Link to="/teams" className="rounded-lg border border-borderSubtle px-3 py-2">К командам</Link>
            <Link to="/matches" className="rounded-lg border border-borderSubtle px-3 py-2">К матчам</Link>
          </div>
        </section>
      )}

      {(section === 'profile' || section === 'edit') && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <p className="text-xs text-textMuted">Редактирование базового профиля пользователя.</p>
          <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs" onClick={async () => {
            try {
              const profile = await cabinetRepository.getMyProfile()
              setDisplayName(profile.displayName)
              setBio(profile.bio)
              setAvatarUrl(profile.avatarUrl)
              setSocialsRaw(Object.entries(profile.socials).map(([k, v]) => `${k}=${v}`).join(', '))
              setStatus('ok: profile loaded')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Load profile</button>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="display name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="avatar url" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="bio" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={socialsRaw} onChange={(e) => setSocialsRaw(e.target.value)} placeholder="telegram=https://... , instagram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" disabled={roleRank[session.user.role] < roleRank.superadmin} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
            try {
              await cabinetRepository.updateMyProfile({ displayName, bio, avatarUrl, socials })
              setStatus('ok: profile updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Save profile</button>
        </section>
      )}

      {section === 'team' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-sm text-textSecondary">
            <p className="font-semibold text-textPrimary">Team workspace</p>
            <p className="mt-1">Captain/Admin/Superadmin инструменты вынесены прямо в team detail page, здесь — быстрый переход и общие операции.</p>
          </div>
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to={teamId ? `/teams/${teamId}` : '/teams'} className="rounded-lg border border-borderSubtle px-3 py-2">Открыть team context</Link>
            <Link to="/teams" className="rounded-lg border border-borderSubtle px-3 py-2">Список команд</Link>
          </div>
        </section>
      )}

      {section === 'permissions' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3 text-sm">
            <p className="font-semibold text-textPrimary">Доступы текущей роли</p>
            <p className="mt-1 text-textSecondary">Role: <span className="text-textPrimary">{session.user.role}</span></p>
            <p className="mt-1 text-textSecondary">Permissions count: <span className="text-textPrimary">{session.permissions.length}</span></p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <Link to="/teams" className="rounded-lg border border-borderSubtle px-3 py-2">Team actions</Link>
            <Link to="/players" className="rounded-lg border border-borderSubtle px-3 py-2">Player actions</Link>
            <Link to="/matches" className="rounded-lg border border-borderSubtle px-3 py-2">Match actions</Link>
            <Link to="/events" className="rounded-lg border border-borderSubtle px-3 py-2">Events/comments</Link>
          </div>
        </section>
      )}

      {section === 'profile-legacy' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs" onClick={async () => {
            try {
              const profile = await cabinetRepository.getMyProfile()
              setDisplayName(profile.displayName)
              setBio(profile.bio)
              setAvatarUrl(profile.avatarUrl)
              setSocialsRaw(Object.entries(profile.socials).map(([k, v]) => `${k}=${v}`).join(', '))
              setStatus('ok: profile loaded')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Load profile</button>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="display name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="avatar url" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="bio" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={socialsRaw} onChange={(e) => setSocialsRaw(e.target.value)} placeholder="telegram=https://... , instagram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.updateMyProfile({ displayName, bio, avatarUrl, socials })
              setStatus('ok: profile updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Save profile</button>
        </section>
      )}

      {section === 'invites' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Telegram username (без @)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await teamsRepository.captainInviteByUsername?.(teamId, username)
              setStatus('ok: invite sent')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Send invite</button>
        </section>
      )}

      {section === 'team-socials' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={teamSocialsRaw} onChange={(e) => setTeamSocialsRaw(e.target.value)} placeholder="telegram=https://..." className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await teamsRepository.captainUpdateSocials?.(teamId, teamSocials)
              setStatus('ok: team socials updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Update socials</button>
        </section>
      )}

      {section === 'roster' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={playerId} onChange={(e) => setPlayerId(e.target.value)} placeholder="ID игрока (например: 34)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <label className="text-xs text-textSecondary flex items-center gap-2"><input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} /> visible in roster</label>
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await teamsRepository.captainSetRosterVisibility?.(teamId, playerId, visible)
              setStatus('ok: roster visibility updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Apply roster visibility</button>
        </section>
      )}

      {section === 'team-events' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="ID события для изменения/удаления" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="event title" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="event body" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                await cabinetRepository.createTeamEvent({ teamId, title, body })
                setStatus('ok: team event created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create team event</button>
            <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={async () => {
              try {
                await eventsRepository.updateEventForScope?.({ eventId, scopeType: 'team', scopeId: teamId, title, body })
                setStatus('ok: team event updated')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Update event</button>
            <button type="button" className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary" onClick={async () => {
              try {
                await eventsRepository.deleteEvent?.(eventId)
                setStatus('ok: event deleted')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Delete event</button>
          </div>
        </section>
      )}

      {section === 'tournament' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-3">
          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs text-textMuted">Create team</p>
            <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="team name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newTeamSlug} onChange={(e) => setNewTeamSlug(e.target.value)} placeholder="team slug" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} placeholder="team description" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                await teamsRepository.createTeam?.({ name: newTeamName, slug: newTeamSlug, description: newTeamDescription })
                setStatus('ok: team created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create team</button>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs text-textMuted">Create player</p>
            <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ID команды (например: 12)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} placeholder="full name" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerPosition} onChange={(e) => setNewPlayerPosition(e.target.value)} placeholder="position" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={newPlayerNumber} onChange={(e) => setNewPlayerNumber(e.target.value)} placeholder="shirt number" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
              try {
                await playersRepository.createPlayer?.({ teamId, fullName: newPlayerName, position: newPlayerPosition, shirtNumber: Number(newPlayerNumber) || 0 })
                setStatus('ok: player created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create player</button>
          </div>

          <div className="space-y-2 rounded-lg border border-borderSubtle p-3">
            <p className="text-xs text-textMuted">Create match</p>
            <input value={matchHomeTeamId} onChange={(e) => setMatchHomeTeamId(e.target.value)} placeholder="ID домашней команды" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchAwayTeamId} onChange={(e) => setMatchAwayTeamId(e.target.value)} placeholder="ID гостевой команды" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchStartAt} onChange={(e) => setMatchStartAt(e.target.value)} placeholder="Дата и время старта (RFC3339)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchStatus} onChange={(e) => setMatchStatus(e.target.value as typeof matchStatus)} placeholder="status" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <input value={matchVenue} onChange={(e) => setMatchVenue(e.target.value)} placeholder="venue" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
            <button type="button" disabled={!isAdminScope} className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
              try {
                await matchesRepository.createMatch?.({ homeTeamId: matchHomeTeamId, awayTeamId: matchAwayTeamId, startAt: matchStartAt, status: matchStatus, venue: matchVenue })
                setStatus('ok: match created')
              } catch (error) {
                setStatus(`error: ${(error as Error).message}`)
              }
            }}>Create match</button>
            {!isAdminScope && <p className="text-[11px] text-textMuted">Создание матчей доступно только admin/superadmin.</p>}
          </div>
        </section>
      )}

      {section === 'moderation' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={commentId} onChange={(e) => setCommentId(e.target.value)} placeholder="comment id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.adminModerateComment(commentId)
              setStatus('ok: comment moderated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Moderate delete</button>
        </section>
      )}

      {section === 'comment-blocks' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={blockedUserId} onChange={(e) => setBlockedUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <label className="text-xs text-textSecondary flex items-center gap-2"><input type="checkbox" checked={permanent} onChange={(e) => setPermanent(e.target.checked)} /> permanent</label>
          <input value={untilUnix} onChange={(e) => setUntilUnix(e.target.value)} placeholder="until unix" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина ограничения" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.adminBlockComments({ userId: blockedUserId, permanent, untilUnix: Number(untilUnix) || 0, reason })
              setStatus('ok: comments blocked')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Apply block</button>
        </section>
      )}

      {section === 'roles' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={rolesRaw} onChange={(e) => setRolesRaw(e.target.value)} placeholder="captain,admin" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminAssignRoles({ userId: targetUserId, roles: parseCSV(rolesRaw) as UserRole[] })
              setStatus('ok: roles assigned')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Assign roles</button>
        </section>
      )}

      {section === 'rbac' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={permissionsRaw} onChange={(e) => setPermissionsRaw(e.target.value)} placeholder="perm1,perm2" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminAssignPermissions({ userId: targetUserId, permissions: parseCSV(permissionsRaw) })
              setStatus('ok: permissions assigned')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Assign permissions</button>
        </section>
      )}

      {section === 'restrictions' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="user id" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <input value={restrictionsRaw} onChange={(e) => setRestrictionsRaw(e.target.value)} placeholder="restriction1,restriction2" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminAssignRestrictions({ userId: targetUserId, restrictions: parseCSV(restrictionsRaw) })
              setStatus('ok: restrictions assigned')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Assign restrictions</button>
        </section>
      )}

      {section === 'settings' && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 space-y-2">
          {roleRank[session.user.role] < roleRank.superadmin && (
            <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg p-3 text-xs text-textSecondary">
              Personal settings mode: глобальные platform settings доступны только superadmin.
            </div>
          )}
          <input value={settingKey} onChange={(e) => setSettingKey(e.target.value)} placeholder="setting key" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <textarea value={settingValueRaw} onChange={(e) => setSettingValueRaw(e.target.value)} placeholder='{"key":"value"}' className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-2 py-1" />
          <button type="button" className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app" onClick={async () => {
            try {
              await cabinetRepository.superadminSetGlobalSetting({ key: settingKey, value: JSON.parse(settingValueRaw) as Record<string, unknown> })
              setStatus('ok: setting updated')
            } catch (error) {
              setStatus(`error: ${(error as Error).message}`)
            }
          }}>Update setting</button>
        </section>
      )}

      {status && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm">
          <p className={`flex items-center gap-2 ${statusTone(status)}`}><CheckCircle2 size={14} /> {status}</p>
          <Link to="/profile" className="mt-2 inline-flex text-sm text-accentYellow">← Назад в кабинет</Link>
        </section>
      )}

      {!['profile', 'edit', 'activity', 'team', 'permissions', 'invites', 'team-socials', 'roster', 'team-events', 'tournament', 'moderation', 'comment-blocks', 'roles', 'rbac', 'restrictions', 'settings'].includes(section) && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 text-sm text-textSecondary">
          Раздел синхронизирован по правам доступа и готов к расширению бизнес-формами.
        </section>
      )}
    </PageContainer>
  )
}
