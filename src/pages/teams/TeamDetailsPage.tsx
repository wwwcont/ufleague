import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CalendarClock, Pencil, ShieldCheck, Star, Trophy, Users } from 'lucide-react'
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
import { CommentsSection } from '../../components/comments'
import { EventFeedSection } from '../../components/events'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { canManageTeam } from '../../domain/services/accessControl'
import { ApiError } from '../../infrastructure/api/repositories'
import { useUserPreferences } from '../../hooks/app/useUserPreferences'
import {
  EditableSection,
  EditableTextField,
  EditableTextareaField,
  SectionActionBar,
} from '../../components/ui/editable'
import { CircularImageCropField } from '../../components/ui/CircularImageCropField'
import { buildCircularCropUploadFile, type CircleCrop } from '../../lib/image-upload'

const formLabel: Record<string, string> = { W: 'В', D: 'Н', L: 'П' }
const tournamentFallbackLogo = '/assets/logos/tournament.svg'

export const TeamDetailsPage = () => {
  const { teamId } = useParams()
  const { data: team } = useTeamDetails(teamId)
  const { data: players } = usePlayers(teamId)
  const { data: teamFeed } = useEvents({ entityType: 'team', entityId: teamId, limit: 4 })
  const { data: standings } = useStandings()
  const { data: matches } = useMatches()
  const { data: teams } = useTeams()
  const { session } = useSession()
  const { isFavorite, toggleFavorite } = useUserPreferences()
  const { teamsRepository, uploadsRepository } = useRepositories()
  const [heroEditing, setHeroEditing] = useState(false)
  const [heroSaving, setHeroSaving] = useState(false)

  const [heroStatus, setHeroStatus] = useState<string | null>(null)
  const [heroTone, setHeroTone] = useState<'idle' | 'success' | 'error'>('idle')

  const [editableName, setEditableName] = useState('')
  const [editableShortName, setEditableShortName] = useState('')
  const [editableSlogan, setEditableSlogan] = useState('')
  const [editableDescription, setEditableDescription] = useState('')
  const [editableTelegram, setEditableTelegram] = useState('')
  const [editableVk, setEditableVk] = useState('')
  const [editableInstagram, setEditableInstagram] = useState('')
  const [customLabel1, setCustomLabel1] = useState('')
  const [customUrl1, setCustomUrl1] = useState('')
  const [customLabel2, setCustomLabel2] = useState('')
  const [customUrl2, setCustomUrl2] = useState('')
  const [editableLogoUrl, setEditableLogoUrl] = useState<string | undefined>(undefined)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoCrop, setLogoCrop] = useState<CircleCrop>({ x: 0, y: 0, zoom: 1 })
  const [localTeamFeed, setLocalTeamFeed] = useState(teamFeed ?? [])

  useEffect(() => {
    if (!team) return
    setEditableName(team.name)
    setEditableShortName(team.shortName)
    setEditableSlogan(team.slogan ?? '')
    setEditableDescription(team.description ?? '')
    setEditableTelegram(team.socials?.telegram ?? '')
    setEditableVk(team.socials?.vk ?? '')
    setEditableInstagram(team.socials?.instagram ?? '')
    setCustomLabel1(team.socials?.custom?.[0]?.label ?? '')
    setCustomUrl1(team.socials?.custom?.[0]?.url ?? '')
    setCustomLabel2(team.socials?.custom?.[1]?.label ?? '')
    setCustomUrl2(team.socials?.custom?.[1]?.url ?? '')
    setEditableLogoUrl(team.logoUrl ?? undefined)
    setLogoFile(null)
    setLogoCrop({ x: 0, y: 0, zoom: 1 })
    setHeroEditing(false)
  }, [team])

  useEffect(() => {
    setLocalTeamFeed(teamFeed ?? [])
  }, [teamFeed])

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
  const isFavoriteTeam = isFavorite(`team:${team.id}`)
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) return `Ошибка API ${error.status}: ${error.message}`
    return error instanceof Error ? error.message : 'Не удалось сохранить'
  }

  const syncHeroDraft = () => {
    setEditableName(team.name)
    setEditableShortName(team.shortName)
    setEditableSlogan(team.slogan ?? '')
    setEditableLogoUrl(team.logoUrl ?? undefined)
    setEditableTelegram(team.socials?.telegram ?? '')
    setEditableVk(team.socials?.vk ?? '')
    setEditableInstagram(team.socials?.instagram ?? '')
    setCustomLabel1(team.socials?.custom?.[0]?.label ?? '')
    setCustomUrl1(team.socials?.custom?.[0]?.url ?? '')
    setCustomLabel2(team.socials?.custom?.[1]?.label ?? '')
    setCustomUrl2(team.socials?.custom?.[1]?.url ?? '')
    setEditableDescription(team.description ?? '')
    setLogoFile(null)
    setLogoCrop({ x: 0, y: 0, zoom: 1 })
  }
  return (
    <PageContainer>
      <EditableSection isEditing={heroEditing} className="relative overflow-hidden border-borderStrong bg-panelBg p-5 shadow-matte">
        <div className="pointer-events-none absolute inset-0">
          {(editableLogoUrl || team.logoUrl) && (
            <img
              src={editableLogoUrl || team.logoUrl || ''}
              alt=""
              className="h-full w-full scale-[1.08] object-cover blur-[5px] opacity-[0.24]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/65 to-black/80" />
          <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-accentYellow/8 blur-3xl" />
        </div>

        <div className="relative z-10">
          {!heroEditing && session.isAuthenticated && (
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => toggleFavorite(`team:${team.id}`)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${isFavoriteTeam ? 'border-accentYellow/70 bg-accentYellow/10 text-accentYellow' : 'border-borderSubtle bg-black/30 text-textMuted'}`}
                aria-label={isFavoriteTeam ? 'Убрать команду из избранного' : 'Добавить команду в избранное'}
              >
                <Star size={14} className={isFavoriteTeam ? 'fill-current' : ''} />
              </button>
              {canManageCurrentTeam && (
                <button
                  type="button"
                  onClick={() => {
                    syncHeroDraft()
                    setHeroStatus(null)
                    setHeroTone('idle')
                    setHeroEditing(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle bg-black/30 px-2 py-1 text-xs text-textSecondary"
                  aria-label="Редактировать профиль команды"
                >
                  <Pencil size={14} />
                  Редактировать
                </button>
              )}
            </div>
          )}

          <div className="mb-4 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-white">{team.name}</h1>
              {team.slogan && <p className="mt-1 text-sm text-textSecondary">{team.slogan}</p>}
            </div>

            <div className="flex items-center justify-between gap-4">
              <TeamAvatar
                team={{ ...team, logoUrl: editableLogoUrl ?? team.logoUrl }}
                size="xl"
                fit="cover"
                fallbackLogoUrl={tournamentFallbackLogo}
                className="h-28 w-28 overflow-hidden rounded-full border border-borderStrong bg-panelSoft p-0"
              />
              <p className="text-5xl font-black uppercase tracking-[0.14em] text-white">{team.shortName}</p>
            </div>

            <div className="rounded-xl border border-borderSubtle bg-black/25 p-3">
              <p className="text-sm leading-relaxed text-textSecondary">{team.description || 'Описание команды пока не заполнено.'}</p>
            </div>

            <div>
              <SocialLinks
                compact
                links={{ telegram: team.socials?.telegram, vk: team.socials?.vk, instagram: team.socials?.instagram }}
                custom={team.socials?.custom}
              />
            </div>

            <div className="flex-1">
              {heroEditing ? (
                <div className="space-y-2">
                  <EditableTextField label="Полное название" value={editableName} onChange={setEditableName} isEditing placeholder="Например, Urban Foxes" />
                  <EditableTextField label="Сокращение (3 символа)" value={editableShortName} onChange={(value) => setEditableShortName(value.toUpperCase().slice(0, 3))} isEditing placeholder="ABC" />
                  <EditableTextField label={`Слоган (${editableSlogan.length}/50)`} value={editableSlogan} onChange={(value) => setEditableSlogan(value.slice(0, 50))} isEditing placeholder="Короткий слоган команды" />
                  <EditableTextareaField
                    label={`Описание (${editableDescription.length}/300)`}
                    value={editableDescription}
                    onChange={(value) => setEditableDescription(value.slice(0, 300))}
                    isEditing
                    placeholder="Краткое описание команды (до 300 символов)"
                    rows={4}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <EditableTextField label="Telegram" value={editableTelegram} onChange={setEditableTelegram} isEditing placeholder="@team_channel" />
                    <EditableTextField label="VK" value={editableVk} onChange={setEditableVk} isEditing placeholder="vk.com/team" />
                    <EditableTextField label="Instagram" value={editableInstagram} onChange={setEditableInstagram} isEditing placeholder="instagram.com/team" />
                    <EditableTextField label="Custom link #1 (label)" value={customLabel1} onChange={setCustomLabel1} isEditing placeholder="Партнер" />
                    <EditableTextField label="Custom link #1 (url)" value={customUrl1} onChange={setCustomUrl1} isEditing placeholder="https://..." />
                    <EditableTextField label="Custom link #2 (label)" value={customLabel2} onChange={setCustomLabel2} isEditing placeholder="Мерч" />
                    <EditableTextField label="Custom link #2 (url)" value={customUrl2} onChange={setCustomUrl2} isEditing placeholder="https://..." />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {heroEditing && (
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                setLogoFile(file)
                setLogoCrop({ x: 0, y: 0, zoom: 1 })
                if (!file) {
                  setEditableLogoUrl(team.logoUrl ?? undefined)
                  return
                }
                setEditableLogoUrl(URL.createObjectURL(file))
              }}
              className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs text-textSecondary"
            />
          )}
          {heroEditing && logoFile && editableLogoUrl && (
            <div className="mt-3">
              <CircularImageCropField
                label="Миниатюра логотипа (круг)"
                imageUrl={editableLogoUrl}
                crop={logoCrop}
                onChange={setLogoCrop}
              />
            </div>
          )}

          <SectionActionBar
            isEditing={heroEditing}
            isPending={heroSaving}
            statusMessage={heroStatus}
            statusTone={heroTone}
            onCancel={() => {
              syncHeroDraft()
              setHeroStatus(null)
              setHeroTone('idle')
              setHeroEditing(false)
            }}
            onSave={async () => {
              if (!teamsRepository.updateTeam) return
              setHeroSaving(true)
              setHeroStatus('Сохраняем hero...')
              setHeroTone('idle')
              try {
                const preparedLogoFile = logoFile ? await buildCircularCropUploadFile(logoFile, logoCrop) : null
                const logoUrl = preparedLogoFile ? (await uploadsRepository.uploadImage(preparedLogoFile)).url : team.logoUrl ?? undefined
                await teamsRepository.updateTeam(team.id, {
                  name: editableName,
                  shortName: editableShortName,
                  slogan: editableSlogan,
                  description: editableDescription,
                  logoUrl,
                  socials: {
                    telegram: editableTelegram,
                    vk: editableVk,
                    instagram: editableInstagram,
                    custom: [
                      ...(customLabel1 && customUrl1 ? [{ label: customLabel1, url: customUrl1 }] : []),
                      ...(customLabel2 && customUrl2 ? [{ label: customLabel2, url: customUrl2 }] : []),
                    ],
                  },
                })
                setHeroStatus('Hero обновлен')
                setHeroTone('success')
                setHeroEditing(false)
              } catch (error) {
                setHeroStatus(actionError(error))
                setHeroTone('error')
              } finally {
                setHeroSaving(false)
              }
            }}
          />
        </div>
      </EditableSection>

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

      <EventFeedSection title="События команды" events={localTeamFeed} layout="timeline" notificationScopeKey={`events:team:${team.id}`} messageWhenEmpty="События команды пока не добавлены." linkToAll={`/teams/${team.id}/events`} />

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> СОСТАВ</h2>
          <div className="flex items-center gap-2">
            <Link to={`/teams/${team.id}/roster`} className="text-xs text-accentYellow hover:underline">{canManageCurrentTeam ? 'ВСЕ / НАСТРОИТЬ' : 'ВСЕ'}</Link>
          </div>
        </div>
        <div className="space-y-2">
          {players?.length ? players
            .filter((player) => canManageCurrentTeam || !player.isHidden)
            .slice(0, 8)
            .map((player) => (
            <div key={player.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-2">
              <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <PlayerRow player={player} />
                    {player.userId === team.captainUserId ? (
                      <p className="mt-1 px-1 text-[11px] font-semibold text-accentYellow">Капитан команды</p>
                    ) : null}
                  </div>
                <Link to={`/players/${player.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary" aria-label="Открыть игрока">
                  <Pencil size={12} />
                </Link>
              </div>
            </div>
          )) : <p className="text-sm text-textMuted">Состав пока не загружен.</p>}
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
                    {opponent && <TeamAvatar team={opponent} size="md" fallbackLogoUrl={tournamentFallbackLogo} className="border border-borderStrong bg-panelSoft p-1" />}
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
