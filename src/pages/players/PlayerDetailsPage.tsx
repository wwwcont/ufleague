import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { UserCircle2 } from 'lucide-react'
import { PageContainer } from '../../layouts/containers/PageContainer'
import { usePlayerDetails } from '../../hooks/data/usePlayerDetails'
import { useTeamDetails } from '../../hooks/data/useTeamDetails'
import { EmptyState } from '../../components/ui/EmptyState'
import { SocialLinks } from '../../components/ui/SocialLinks'
import { CommentsSection } from '../../components/comments'
import { EventEditor, EventFeedSection } from '../../components/events'
import { useEvents } from '../../hooks/data/useEvents'
import { useSession } from '../../app/providers/use-session'
import { useRepositories } from '../../app/providers/use-repositories'
import { ApiError } from '../../infrastructure/api/repositories'
import { canManagePlayer } from '../../domain/services/accessControl'
import {
  EditableImageField,
  EditableSection,
  EditableSectionHeader,
  EditableTextField,
  EditableTextareaField,
  SectionActionBar,
} from '../../components/ui/editable'
import type { EventContentBlock } from '../../domain/entities/types'
import { blocksToPlainText, deriveSummaryFromBlocks, normalizeEventBlocks } from '../../domain/services/eventContent'

const getInitials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2)

export const PlayerDetailsPage = () => {
  const { playerId } = useParams()
  const { data: player } = usePlayerDetails(playerId)
  const { data: team } = useTeamDetails(player?.teamId)
  const { data: playerFeed } = useEvents({ entityType: 'player', entityId: playerId, limit: 4 })
  const { session } = useSession()
  const { playersRepository, eventsRepository, uploadsRepository } = useRepositories()

  const [heroEditing, setHeroEditing] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [sportsEditing, setSportsEditing] = useState(false)
  const [heroSaving, setHeroSaving] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [sportsSaving, setSportsSaving] = useState(false)
  const [heroStatus, setHeroStatus] = useState<string | null>(null)
  const [profileStatus, setProfileStatus] = useState<string | null>(null)
  const [sportsStatus, setSportsStatus] = useState<string | null>(null)
  const [heroTone, setHeroTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [profileTone, setProfileTone] = useState<'idle' | 'success' | 'error'>('idle')
  const [sportsTone, setSportsTone] = useState<'idle' | 'success' | 'error'>('idle')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [telegram, setTelegram] = useState('')
  const [vk, setVk] = useState('')
  const [instagram, setInstagram] = useState('')
  const [number, setNumber] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  const [position, setPosition] = useState(player?.position ?? 'MF')
  const [eventCreateOpen, setEventCreateOpen] = useState(false)
  const [eventCreatePending, setEventCreatePending] = useState(false)
  const [eventCreateStatus, setEventCreateStatus] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventSummary, setNewEventSummary] = useState('')
  const [newEventBlocks, setNewEventBlocks] = useState<EventContentBlock[]>([])

  useEffect(() => {
    if (!player) return
    setDisplayName(player.displayName)
    setBio(player.bio ?? '')
    setAge(String(player.age ?? ''))
    setTelegram(player.socials?.telegram ?? '')
    setVk(player.socials?.vk ?? '')
    setInstagram(player.socials?.instagram ?? '')
    setNumber(String(player.number ?? ''))
    setPosition(player.position ?? 'MF')
    setAvatarPreview(player.avatar ?? undefined)
    setAvatarFile(null)
    setHeroEditing(false)
    setProfileEditing(false)
    setSportsEditing(false)
  }, [player])

  if (!player) return <PageContainer><EmptyState title="Игрок не найден" /></PageContainer>

  const canEditPlayer = canManagePlayer(session, player, team)

  const actionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.status === 403) return 'Недостаточно прав для изменения игрока (403).'
      return `Ошибка API ${error.status}: ${error.message}`
    }
    return error instanceof Error ? error.message : 'Не удалось обновить игрока'
  }

  return (
    <PageContainer>
      <EditableSection isEditing={heroEditing} className="relative overflow-hidden border-borderStrong bg-panelBg p-5 shadow-matte">
        <div className="pointer-events-none absolute inset-0">
          {(avatarPreview || team?.logoUrl) && (
            <img
              src={avatarPreview || team?.logoUrl || ''}
              alt=""
              className="h-full w-full scale-[1.18] object-cover blur-xl opacity-20"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/65 to-black/80" />
          <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-accentYellow/8 blur-3xl" />
        </div>

        <div className="relative z-10">
          <EditableSectionHeader
            title="Профиль игрока"
            subtitle="Аватар и имя"
            canEdit={canEditPlayer}
            isEditing={heroEditing}
            onStartEdit={() => {
              setDisplayName(player.displayName)
              setAvatarPreview(player.avatar ?? undefined)
              setAvatarFile(null)
              setHeroStatus(null)
              setHeroTone('idle')
              setHeroEditing(true)
            }}
            onCancelEdit={() => {
              setDisplayName(player.displayName)
              setAvatarPreview(player.avatar ?? undefined)
              setAvatarFile(null)
              setHeroStatus(null)
              setHeroTone('idle')
              setHeroEditing(false)
            }}
          />
          <div className="mb-4 flex items-start gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-borderStrong bg-panelSoft text-2xl font-bold text-textPrimary">
              {avatarPreview ? <img src={avatarPreview} alt={displayName || player.displayName} className="h-full w-full object-cover" /> : getInitials(displayName || player.displayName)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-textPrimary">{displayName || player.displayName}</h1>
              <p className="text-sm text-textSecondary">Роль: {player.position}</p>
              <p className="text-xs text-textMuted">{player.age ? `${player.age} лет` : 'Возраст не указан'}</p>
            </div>
          </div>

          {heroEditing && (
            <>
              <EditableTextField label="Имя игрока" value={displayName} onChange={setDisplayName} isEditing placeholder="Полное имя" />
              <div className="mt-3">
                <EditableImageField
                  label="Сменить аватар"
                  imageUrl={avatarPreview}
                  isEditing
                  onSelectFile={(file) => {
                    setAvatarFile(file)
                    if (!file) {
                      setAvatarPreview(player.avatar ?? undefined)
                      return
                    }
                    setAvatarPreview(URL.createObjectURL(file))
                  }}
                />
              </div>
            </>
          )}
          <SectionActionBar
            isEditing={heroEditing}
            isPending={heroSaving}
            statusMessage={heroStatus}
            statusTone={heroTone}
            onCancel={() => {
              setDisplayName(player.displayName)
              setAvatarPreview(player.avatar ?? undefined)
              setAvatarFile(null)
              setHeroStatus(null)
              setHeroTone('idle')
              setHeroEditing(false)
            }}
            onSave={async () => {
              if (!playersRepository.updatePlayer) return
              setHeroSaving(true)
              setHeroStatus('Сохраняем профиль...')
              setHeroTone('idle')
              try {
                const uploadedAvatar = avatarFile ? (await uploadsRepository.uploadImage(avatarFile)).url : player.avatar || undefined
                await playersRepository.updatePlayer(player.id, { displayName: displayName || player.displayName, avatar: uploadedAvatar })
                setHeroStatus('Профиль обновлен')
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

          <SocialLinks compact links={{ telegram: player.socials?.telegram, vk: player.socials?.vk, instagram: player.socials?.instagram }} />
        </div>
      </EditableSection>

      <EditableSection isEditing={profileEditing}>
        <EditableSectionHeader
          title="О профиле"
          subtitle="Bio, возраст и соцсети"
          canEdit={canEditPlayer}
          isEditing={profileEditing}
          onStartEdit={() => {
            setBio(player.bio ?? '')
            setAge(String(player.age ?? ''))
            setTelegram(player.socials?.telegram ?? '')
            setVk(player.socials?.vk ?? '')
            setInstagram(player.socials?.instagram ?? '')
            setProfileStatus(null)
            setProfileTone('idle')
            setProfileEditing(true)
          }}
          onCancelEdit={() => {
            setBio(player.bio ?? '')
            setAge(String(player.age ?? ''))
            setTelegram(player.socials?.telegram ?? '')
            setVk(player.socials?.vk ?? '')
            setInstagram(player.socials?.instagram ?? '')
            setProfileStatus(null)
            setProfileTone('idle')
            setProfileEditing(false)
          }}
        />
        {profileEditing ? (
          <>
            <EditableTextareaField label="Bio" value={bio} onChange={setBio} isEditing placeholder="Кратко о себе" />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <EditableTextField label="Возраст" value={age} onChange={setAge} isEditing placeholder="Например: 22" />
              <EditableTextField label="Telegram" value={telegram} onChange={setTelegram} isEditing placeholder="@nickname" />
              <EditableTextField label="VK" value={vk} onChange={setVk} isEditing placeholder="vk.com/..." />
              <EditableTextField label="Instagram" value={instagram} onChange={setInstagram} isEditing placeholder="instagram.com/..." />
            </div>
          </>
        ) : (
          <div className="space-y-2 text-sm text-textSecondary">
            <p>{bio || 'Био пока не заполнено.'}</p>
            <p className="text-xs text-textMuted">Возраст: {player.age || '—'}</p>
            <SocialLinks compact links={{ telegram: player.socials?.telegram, vk: player.socials?.vk, instagram: player.socials?.instagram }} />
          </div>
        )}
        <SectionActionBar
          isEditing={profileEditing}
          isPending={profileSaving}
          statusMessage={profileStatus}
          statusTone={profileTone}
          onCancel={() => {
            setBio(player.bio ?? '')
            setAge(String(player.age ?? ''))
            setTelegram(player.socials?.telegram ?? '')
            setVk(player.socials?.vk ?? '')
            setInstagram(player.socials?.instagram ?? '')
            setProfileStatus(null)
            setProfileTone('idle')
            setProfileEditing(false)
          }}
          onSave={async () => {
            if (!playersRepository.updatePlayer) return
            setProfileSaving(true)
            setProfileStatus('Сохраняем профиль...')
            setProfileTone('idle')
            try {
              await playersRepository.updatePlayer(player.id, {
                bio,
                age: Number(age) || player.age,
                socials: {
                  telegram,
                  vk,
                  instagram,
                },
              })
              setProfileStatus('Профиль обновлен')
              setProfileTone('success')
              setProfileEditing(false)
            } catch (error) {
              setProfileStatus(actionError(error))
              setProfileTone('error')
            } finally {
              setProfileSaving(false)
            }
          }}
        />
      </EditableSection>

      <EditableSection isEditing={sportsEditing}>
        <EditableSectionHeader
          title="Спортивный профиль"
          subtitle="Позиция и номер"
          canEdit={canEditPlayer}
          isEditing={sportsEditing}
          onStartEdit={() => {
            setPosition(player.position)
            setNumber(String(player.number))
            setSportsStatus(null)
            setSportsTone('idle')
            setSportsEditing(true)
          }}
          onCancelEdit={() => {
            setPosition(player.position)
            setNumber(String(player.number))
            setSportsStatus(null)
            setSportsTone('idle')
            setSportsEditing(false)
          }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-textMuted">Позиция</span>
            {sportsEditing ? (
              <select value={position} onChange={(e) => setPosition(e.target.value as typeof position)} className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm">
                {['GK', 'DF', 'MF', 'FW'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            ) : (
              <p className="rounded-lg bg-mutedBg px-3 py-2 text-sm text-textSecondary">{position}</p>
            )}
          </label>
          {sportsEditing ? (
            <EditableTextField label="Игровой номер" value={number} onChange={setNumber} isEditing placeholder="Например: 10" />
          ) : (
            <div>
              <p className="text-xs text-textMuted">Игровой номер</p>
              <p className="rounded-lg bg-mutedBg px-3 py-2 text-sm text-textSecondary">{number}</p>
            </div>
          )}
        </div>
        <SectionActionBar
          isEditing={sportsEditing}
          isPending={sportsSaving}
          statusMessage={sportsStatus}
          statusTone={sportsTone}
          onCancel={() => {
            setPosition(player.position)
            setNumber(String(player.number))
            setSportsStatus(null)
            setSportsTone('idle')
            setSportsEditing(false)
          }}
          onSave={async () => {
            if (!playersRepository.updatePlayer) return
            setSportsSaving(true)
            setSportsStatus('Сохраняем спортивные данные...')
            setSportsTone('idle')
            try {
              await playersRepository.updatePlayer(player.id, { position, number: Number(number) || player.number })
              setSportsStatus('Спортивные данные обновлены')
              setSportsTone('success')
              setSportsEditing(false)
            } catch (error) {
              setSportsStatus(actionError(error))
              setSportsTone('error')
            } finally {
              setSportsSaving(false)
            }
          }}
        />
      </EditableSection>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-3 text-base font-semibold text-textPrimary">Статистика игрока</h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Матчи:</span> {player.stats.appearances}</div>
          <div className="rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2"><span className="text-textMuted">Голы:</span> <span className="font-semibold text-accentYellow">{player.stats.goals}</span></div>
        </div>
      </section>

      <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
        <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-textPrimary"><UserCircle2 size={16} className="text-accentYellow" /> Профиль / медиа</h2>
        <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
          <p className="text-xs text-textMuted">Bio</p>
          <p className="mt-1 text-textSecondary">{bio || 'Био пока не заполнено.'}</p>
        </div>
      </section>

      <EventFeedSection title="События игрока" events={playerFeed ?? []} layout="timeline" messageWhenEmpty="События игрока пока не найдены." />

      {canEditPlayer && (
        <section className="rounded-2xl border border-borderSubtle bg-panelBg p-4 shadow-soft">
          {!eventCreateOpen ? (
            <button type="button" onClick={() => setEventCreateOpen(true)} className="rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">Создать событие</button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-textPrimary">Новое событие игрока</p>
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
                        scopeType: 'player',
                        scopeId: player.id,
                        title: newEventTitle.trim(),
                        summary: newEventSummary.trim() || deriveSummaryFromBlocks(blocks),
                        body: blocksToPlainText(blocks) || newEventSummary.trim(),
                        imageUrl: blocks.find((item) => item.type === 'image')?.imageUrl,
                        contentBlocks: blocks,
                      })
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

      <CommentsSection entityType="player" entityId={player.id} title="Комментарии" />
    </PageContainer>
  )
}
