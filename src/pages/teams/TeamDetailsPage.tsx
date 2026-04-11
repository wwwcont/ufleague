import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CalendarClock, ShieldCheck, Trophy, Users } from 'lucide-react'
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
import {
  EditableImageField,
  EditableSection,
  EditableSectionHeader,
  EditableTextField,
  EditableTextareaField,
  SectionActionBar,
} from '../../components/ui/editable'

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
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/60 to-black/75" />
          {(editableLogoUrl || team.logoUrl) && <img src={editableLogoUrl || team.logoUrl || ''} alt="" className="h-full w-full scale-[1.45] object-cover blur-2xl opacity-35" />}
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
            <div className="flex-1 space-y-2">
              <EditableTextField label="Название" value={editableName} onChange={setEditableName} isEditing={heroEditing} placeholder="Название команды" />
              <EditableTextField label="Слоган" value={editableSlogan} onChange={setEditableSlogan} isEditing={heroEditing} placeholder="Слоган (необязательно)" />
            </div>
          </div>

          <EditableImageField
            label="Логотип"
            imageUrl={editableLogoUrl}
            isEditing={heroEditing}
            onSelectFile={(file) => {
              setLogoFile(file)
              if (!file) {
                setEditableLogoUrl(team.logoUrl ?? undefined)
                return
              }
              setEditableLogoUrl(URL.createObjectURL(file))
            }}
          />

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
        <EditableTextareaField label="Описание" value={editableDescription} onChange={setEditableDescription} isEditing={descriptionEditing} placeholder="Описание команды" rows={5} />
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
        <div className="grid gap-2 sm:grid-cols-2">
          <EditableTextField label="Telegram" value={editableTelegram} onChange={setEditableTelegram} isEditing={socialsEditing} placeholder="@team_channel" />
          <EditableTextField label="VK" value={editableVk} onChange={setEditableVk} isEditing={socialsEditing} placeholder="vk.com/team" />
          <EditableTextField label="Instagram" value={editableInstagram} onChange={setEditableInstagram} isEditing={socialsEditing} placeholder="instagram.com/team" />
          <EditableTextField label="Custom link #1 (label)" value={customLabel1} onChange={setCustomLabel1} isEditing={socialsEditing} placeholder="Партнер" />
          <EditableTextField label="Custom link #1 (url)" value={customUrl1} onChange={setCustomUrl1} isEditing={socialsEditing} placeholder="https://..." />
          <EditableTextField label="Custom link #2 (label)" value={customLabel2} onChange={setCustomLabel2} isEditing={socialsEditing} placeholder="Мерч" />
          <EditableTextField label="Custom link #2 (url)" value={customUrl2} onChange={setCustomUrl2} isEditing={socialsEditing} placeholder="https://..." />
        </div>
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
