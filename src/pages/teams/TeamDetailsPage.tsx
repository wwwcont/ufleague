import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CalendarClock, EyeOff, Pencil, Plus, ShieldCheck, Trophy, UserPlus, Users, X } from 'lucide-react'
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
import { EventEditor, EventFeedSection } from '../../components/events'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { canManageTeam } from '../../domain/services/accessControl'
import { ApiError } from '../../infrastructure/api/repositories'
import type { EventContentBlock } from '../../domain/entities/types'
import {
  EditableImageField,
  EditableSection,
  EditableSectionHeader,
  EditableTextField,
  EditableTextareaField,
  SectionActionBar,
} from '../../components/ui/editable'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'

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
  const { teamsRepository, eventsRepository, uploadsRepository, playersRepository, usersRepository } = useRepositories()
  const [heroEditing, setHeroEditing] = useState(false)
  const [descriptionEditing, setDescriptionEditing] = useState(false)
  const [socialsEditing, setSocialsEditing] = useState(false)

  const [heroSaving, setHeroSaving] = useState(false)
  const [descriptionSaving, setDescriptionSaving] = useState(false)
  const [socialsSaving, setSocialsSaving] = useState(false)

  const [heroStatus, setHeroStatus] = useState<string | null>(null)
  const [heroTone, setHeroTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [descriptionStatus, setDescriptionStatus] = useState<string | null>(null)
  const [descriptionTone, setDescriptionTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [socialsStatus, setSocialsStatus] = useState<string | null>(null)
  const [socialsTone, setSocialsTone] = useState<'idle' | 'success' | 'error'>('idle')

  const [editableName, setEditableName] = useState('')
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
  const [eventCreateOpen, setEventCreateOpen] = useState(false)
  const [eventCreatePending, setEventCreatePending] = useState(false)
  const [eventCreateStatus, setEventCreateStatus] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventSummary, setNewEventSummary] = useState('')
  const [newEventBlocks, setNewEventBlocks] = useState<EventContentBlock[]>([])
  const [localTeamFeed, setLocalTeamFeed] = useState(teamFeed ?? [])
  const [rosterSetupMode, setRosterSetupMode] = useState(false)
  const [inviteUsername, setInviteUsername] = useState('')
  const [rosterStatus, setRosterStatus] = useState<string | null>(null)
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<string[]>([])
  const [kickedPlayerIds, setKickedPlayerIds] = useState<string[]>([])

  useEffect(() => {
    if (!team) return
    setEditableName(team.name)
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
    setHeroEditing(false)
    setDescriptionEditing(false)
    setSocialsEditing(false)
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
  const actionError = (error: unknown) => {
    if (error instanceof ApiError) return `Ошибка API ${error.status}: ${error.message}`
    return error instanceof Error ? error.message : 'Не удалось сохранить'
  }

  const syncHeroDraft = () => {
    setEditableName(team.name)
    setEditableSlogan(team.slogan ?? '')
    setEditableLogoUrl(team.logoUrl ?? undefined)
    setLogoFile(null)
  }
  const syncDescriptionDraft = () => {
    setEditableDescription(team.description ?? '')
  }
  const syncSocialsDraft = () => {
    setEditableTelegram(team.socials?.telegram ?? '')
    setEditableVk(team.socials?.vk ?? '')
    setEditableInstagram(team.socials?.instagram ?? '')
    setCustomLabel1(team.socials?.custom?.[0]?.label ?? '')
    setCustomUrl1(team.socials?.custom?.[0]?.url ?? '')
    setCustomLabel2(team.socials?.custom?.[1]?.label ?? '')
    setCustomUrl2(team.socials?.custom?.[1]?.url ?? '')
  }

  return (
    <PageContainer>
      <EditableSection isEditing={heroEditing} className="relative overflow-hidden border-borderStrong bg-panelBg p-5 shadow-matte">
        <div className="pointer-events-none absolute inset-0">
          {(editableLogoUrl || team.logoUrl) && (
            <img
              src={editableLogoUrl || team.logoUrl || ''}
              alt=""
              className="h-full w-full scale-[1.18] object-cover blur-xl opacity-20"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/65 to-black/80" />
          <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-accentYellow/8 blur-3xl" />
        </div>

        <div className="relative z-10">
          <EditableSectionHeader
            title="Hero команды"
            subtitle="Лого, название и слоган"
            canEdit={canManageCurrentTeam}
            isEditing={heroEditing}
            onStartEdit={() => {
              syncHeroDraft()
              setHeroStatus(null)
              setHeroTone('idle')
              setHeroEditing(true)
            }}
            onCancelEdit={() => {
              syncHeroDraft()
              setHeroStatus(null)
              setHeroTone('idle')
              setHeroEditing(false)
            }}
          />

          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <TeamAvatar team={{ ...team, logoUrl: editableLogoUrl ?? team.logoUrl }} size="xl" fallbackLogoUrl={tournament.logoUrl} className="h-20 w-20 border border-borderStrong bg-panelSoft p-2" />
            <div className="flex-1">
              {heroEditing ? (
                <div className="space-y-2">
                  <EditableTextField label="Название" value={editableName} onChange={setEditableName} isEditing placeholder="Название команды" />
                  <EditableTextField label="Слоган" value={editableSlogan} onChange={setEditableSlogan} isEditing placeholder="Слоган (необязательно)" />
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-textPrimary">{team.name}</h1>
                  {team.slogan && <p className="mt-1 text-sm text-textSecondary">{team.slogan}</p>}
                </>
              )}
            </div>
          </div>

          {heroEditing && (
            <EditableImageField
              label="Сменить логотип"
              imageUrl={editableLogoUrl}
              isEditing
              onSelectFile={(file) => {
                setLogoFile(file)
                if (!file) {
                  setEditableLogoUrl(team.logoUrl ?? undefined)
                  return
                }
                setEditableLogoUrl(URL.createObjectURL(file))
              }}
            />
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
                const logoUrl = logoFile ? (await uploadsRepository.uploadImage(logoFile)).url : team.logoUrl ?? undefined
                await teamsRepository.updateTeam(team.id, {
                  name: editableName,
                  slogan: editableSlogan,
                  logoUrl,
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

          <SocialLinks
            compact
            links={{ telegram: team.socials?.telegram, vk: team.socials?.vk, instagram: team.socials?.instagram }}
            custom={team.socials?.custom}
          />
        </div>
      </EditableSection>

      <EditableSection isEditing={descriptionEditing}>
        <EditableSectionHeader
          title="Описание команды"
          canEdit={canManageCurrentTeam}
          isEditing={descriptionEditing}
          onStartEdit={() => {
            syncDescriptionDraft()
            setDescriptionStatus(null)
            setDescriptionTone('idle')
            setDescriptionEditing(true)
          }}
          onCancelEdit={() => {
            syncDescriptionDraft()
            setDescriptionStatus(null)
            setDescriptionTone('idle')
            setDescriptionEditing(false)
          }}
        />
        {descriptionEditing ? (
          <EditableTextareaField label="Описание" value={editableDescription} onChange={setEditableDescription} isEditing placeholder="Описание команды" rows={5} />
        ) : (
          <p className="text-sm leading-relaxed text-textSecondary">{team.description || 'Описание команды пока не заполнено.'}</p>
        )}
        <SectionActionBar
          isEditing={descriptionEditing}
          isPending={descriptionSaving}
          statusMessage={descriptionStatus}
          statusTone={descriptionTone}
          onCancel={() => {
            syncDescriptionDraft()
            setDescriptionStatus(null)
            setDescriptionTone('idle')
            setDescriptionEditing(false)
          }}
          onSave={async () => {
            if (!teamsRepository.updateTeam) return
            setDescriptionSaving(true)
            setDescriptionStatus('Сохраняем описание...')
            setDescriptionTone('idle')
            try {
              await teamsRepository.updateTeam(team.id, { description: editableDescription })
              setDescriptionStatus('Описание обновлено')
              setDescriptionTone('success')
              setDescriptionEditing(false)
            } catch (error) {
              setDescriptionStatus(actionError(error))
              setDescriptionTone('error')
            } finally {
              setDescriptionSaving(false)
            }
          }}
        />
      </EditableSection>

      <EditableSection isEditing={socialsEditing}>
        <EditableSectionHeader
          title="Соцсети"
          canEdit={canManageCurrentTeam}
          isEditing={socialsEditing}
          onStartEdit={() => {
            syncSocialsDraft()
            setSocialsStatus(null)
            setSocialsTone('idle')
            setSocialsEditing(true)
          }}
          onCancelEdit={() => {
            syncSocialsDraft()
            setSocialsStatus(null)
            setSocialsTone('idle')
            setSocialsEditing(false)
          }}
        />
        {socialsEditing ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <EditableTextField label="Telegram" value={editableTelegram} onChange={setEditableTelegram} isEditing placeholder="@team_channel" />
            <EditableTextField label="VK" value={editableVk} onChange={setEditableVk} isEditing placeholder="vk.com/team" />
            <EditableTextField label="Instagram" value={editableInstagram} onChange={setEditableInstagram} isEditing placeholder="instagram.com/team" />
            <EditableTextField label="Custom link #1 (label)" value={customLabel1} onChange={setCustomLabel1} isEditing placeholder="Партнер" />
            <EditableTextField label="Custom link #1 (url)" value={customUrl1} onChange={setCustomUrl1} isEditing placeholder="https://..." />
            <EditableTextField label="Custom link #2 (label)" value={customLabel2} onChange={setCustomLabel2} isEditing placeholder="Мерч" />
            <EditableTextField label="Custom link #2 (url)" value={customUrl2} onChange={setCustomUrl2} isEditing placeholder="https://..." />
          </div>
        ) : (
          <SocialLinks
            compact
            links={{ telegram: team.socials?.telegram, vk: team.socials?.vk, instagram: team.socials?.instagram }}
            custom={team.socials?.custom}
          />
        )}
        <SectionActionBar
          isEditing={socialsEditing}
          isPending={socialsSaving}
          statusMessage={socialsStatus}
          statusTone={socialsTone}
          onCancel={() => {
            syncSocialsDraft()
            setSocialsStatus(null)
            setSocialsTone('idle')
            setSocialsEditing(false)
          }}
          onSave={async () => {
            if (!teamsRepository.updateTeam) return
            setSocialsSaving(true)
            setSocialsStatus('Сохраняем соцсети...')
            setSocialsTone('idle')
            try {
              await teamsRepository.updateTeam(team.id, {
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
              setSocialsStatus('Соцсети обновлены')
              setSocialsTone('success')
              setSocialsEditing(false)
            } catch (error) {
              setSocialsStatus(actionError(error))
              setSocialsTone('error')
            } finally {
              setSocialsSaving(false)
            }
          }}
        />
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

      <EventFeedSection title="События команды" events={localTeamFeed} layout="timeline" messageWhenEmpty="События команды пока не добавлены." />

      {canManageCurrentTeam && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          {!eventCreateOpen ? (
            <button type="button" onClick={() => setEventCreateOpen(true)} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">Создать событие</button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-textPrimary">Новое событие команды</p>
              <input value={newEventTitle} onChange={(event) => setNewEventTitle(event.target.value)} placeholder="Заголовок события" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <textarea value={newEventSummary} onChange={(event) => setNewEventSummary(event.target.value)} rows={2} placeholder="Короткое summary (необязательно)" className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm" />
              <EventEditor
                blocks={newEventBlocks}
                onChange={setNewEventBlocks}
                onImageUpload={async (blockId, file) => {
                  const next = [...newEventBlocks]
                  const index = next.findIndex((item) => item.id === blockId)
                  if (index < 0) return
                  if (!file) {
                    next[index] = { ...next[index], imageUrl: '' }
                    setNewEventBlocks(next)
                    return
                  }
                  try {
                    const imageUrl = (await uploadsRepository.uploadImage(file)).url
                    next[index] = { ...next[index], imageUrl }
                    setNewEventBlocks(next)
                  } catch (error) {
                    setEventCreateStatus(actionError(error))
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={eventCreatePending || !newEventTitle.trim()}
                  className="rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50"
                  onClick={async () => {
                    setEventCreatePending(true)
                    setEventCreateStatus('Сохраняем событие...')
                    try {
                      const blocks = normalizeEventBlocks(newEventBlocks, { text: '', imageUrl: undefined })
                      await eventsRepository.createEventForScope?.({
                        scopeType: 'team',
                        scopeId: team.id,
                        title: newEventTitle.trim(),
                        summary: newEventSummary.trim() || deriveSummaryFromBlocks(blocks),
                        body: blocksToPlainText(blocks) || newEventSummary.trim(),
                        imageUrl: blocks.find((item) => item.type === 'image')?.imageUrl,
                        contentBlocks: blocks,
                      })
                      setLocalTeamFeed((prev) => [{
                        id: `local_${Date.now()}`,
                        title: newEventTitle.trim(),
                        summary: newEventSummary.trim() || deriveSummaryFromBlocks(blocks),
                        text: blocksToPlainText(blocks),
                        contentBlocks: blocks,
                        timestamp: new Date().toISOString(),
                        source: 'team',
                        authorName: session.user.displayName,
                        category: 'news' as const,
                        entityType: 'team' as const,
                        entityId: team.id,
                        imageUrl: blocks.find((item) => item.type === 'image')?.imageUrl,
                        canEdit: true,
                        canDelete: true,
                      }, ...prev].slice(0, 8))
                      setEventCreateStatus('Событие создано')
                      setEventCreateOpen(false)
                      setNewEventTitle('')
                      setNewEventSummary('')
                      setNewEventBlocks([])
                    } catch (error) {
                      setEventCreateStatus(actionError(error))
                    } finally {
                      setEventCreatePending(false)
                    }
                  }}
                >
                  Сохранить
                </button>
                <button type="button" disabled={eventCreatePending} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary disabled:opacity-50" onClick={() => {
                  setEventCreateOpen(false)
                  setNewEventTitle('')
                  setNewEventSummary('')
                  setNewEventBlocks([])
                  setEventCreateStatus(null)
                }}>Отмена</button>
              </div>
              {eventCreateStatus && <p className="text-xs text-textMuted">{eventCreateStatus}</p>}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-textPrimary"><Users size={16} className="text-accentYellow" /> СОСТАВ</h2>
          <div className="flex items-center gap-2">
            {canManageCurrentTeam && (
              <>
                <button type="button" onClick={() => setRosterSetupMode((prev) => !prev)} className="rounded-lg border border-borderSubtle px-2 py-1 text-xs text-textSecondary">
                  {rosterSetupMode ? 'Готово' : 'Настроить'}
                </button>
              </>
            )}
            <Link to="/players" className="text-xs text-accentYellow hover:underline">ВСЕ</Link>
          </div>
        </div>
        {canManageCurrentTeam && (
          <div className="mb-3 rounded-xl border border-borderSubtle bg-mutedBg p-3">
            <p className="mb-2 text-xs text-textMuted">Добавить игрока по @username</p>
            <div className="flex flex-wrap items-center gap-2">
              <input value={inviteUsername} onChange={(event) => setInviteUsername(event.target.value)} placeholder="@telegram_username" className="min-w-[220px] flex-1 rounded-lg border border-borderSubtle bg-panelBg px-3 py-2 text-sm" />
              <button type="button" disabled={!inviteUsername.trim().startsWith('@')} className="inline-flex items-center gap-1 rounded-lg bg-accentYellow px-3 py-2 text-xs font-semibold text-app disabled:opacity-50" onClick={async () => {
                try {
                  const found = await usersRepository.findByTelegramUsername?.(inviteUsername)
                  if (!found) throw new Error('Пользователь не найден')
                  await teamsRepository.captainInviteByUsername?.(team.id, found.telegramUsername ?? inviteUsername.replace(/^@/, ''))
                  await playersRepository.createPlayer?.({ userId: found.id, teamId: team.id, fullName: found.displayName, position: 'MF', shirtNumber: 0 })
                  setRosterStatus('Игрок добавлен в команду и player profile создан')
                  setInviteUsername('')
                } catch (error) {
                  setRosterStatus(actionError(error))
                }
              }}>
                <UserPlus size={12} /> <Plus size={12} /> Добавить
              </button>
            </div>
            {rosterStatus && <p className="mt-2 text-xs text-textMuted">{rosterStatus}</p>}
          </div>
        )}
        <div className="space-y-2">
          {players?.length ? players.filter((player) => !kickedPlayerIds.includes(player.id)).map((player) => (
            <div key={player.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-2">
              <div className="flex items-center justify-between gap-2">
                <PlayerRow player={player} />
                {canManageCurrentTeam && rosterSetupMode && (
                  <div className="flex items-center gap-1">
                    <Link to={`/players/${player.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary" aria-label="Редактировать игрока">
                      <Pencil size={12} />
                    </Link>
                    <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary" aria-label="Скрыть игрока" onClick={async () => {
                      try {
                        await teamsRepository.captainSetRosterVisibility?.(team.id, player.id, hiddenPlayerIds.includes(player.id))
                        setHiddenPlayerIds((prev) => (prev.includes(player.id) ? prev.filter((id) => id !== player.id) : [...prev, player.id]))
                        setRosterStatus(hiddenPlayerIds.includes(player.id) ? 'Игрок снова отображается в составе' : 'Игрок скрыт из состава')
                      } catch (error) {
                        setRosterStatus(actionError(error))
                      }
                    }}>
                      <EyeOff size={12} />
                    </button>
                    <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/40 text-red-300" aria-label="Выгнать игрока" onClick={async () => {
                      if (!window.confirm('Выгнать игрока из команды? Пользователь сохранится, профиль игрока будет деактивирован.')) return
                      try {
                        await teamsRepository.captainSetRosterVisibility?.(team.id, player.id, false)
                        setKickedPlayerIds((prev) => [...prev, player.id])
                        setRosterStatus('Игрок исключен из команды, user сохранен')
                      } catch (error) {
                        setRosterStatus(actionError(error))
                      }
                    }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              {hiddenPlayerIds.includes(player.id) && <p className="mt-1 text-xs text-textMuted">Скрыт из состава</p>}
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
