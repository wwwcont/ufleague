import { Camera, Send } from 'lucide-react'
import { toExternalUrl } from '../../lib/links'

const VkGlyph = () => (
  <span className="inline-flex h-4 w-4 items-center justify-center text-[9px] font-bold leading-none">VK</span>
)

export type SocialSet = { telegram?: string; vk?: string; instagram?: string }
type CustomSocial = { label: string; url: string }

export const SocialLinks = ({ compact = false, links, custom = [] }: { compact?: boolean; links?: SocialSet; custom?: CustomSocial[] }) => {
  const size = compact ? 'h-8 w-8' : 'h-9 w-9'
  const visibleCustom = custom
    .slice(0, 2)
    .map((item) => ({ ...item, url: toExternalUrl(item.url) }))
    .filter((item): item is { label: string; url: string } => Boolean(item.url))
  const telegramUrl = toExternalUrl(links?.telegram)
  const vkUrl = toExternalUrl(links?.vk)
  const instagramUrl = toExternalUrl(links?.instagram)
  const hasAny = Boolean(telegramUrl || vkUrl || instagramUrl || visibleCustom.length)
  if (!hasAny) return null

  return (
    <div className="mt-4 flex items-center gap-2">
      {telegramUrl && <a href={telegramUrl} target="_blank" rel="noreferrer noopener" aria-label="Telegram" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <Send size={14} />
      </a>}
      {vkUrl && <a href={vkUrl} target="_blank" rel="noreferrer noopener" aria-label="VK" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <VkGlyph />
      </a>}
      {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer noopener" aria-label="Instagram" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <Camera size={14} />
      </a>}
      {visibleCustom.map((item) => (
        <a key={item.url} href={item.url} target="_blank" rel="noreferrer noopener" aria-label={item.label} className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft px-2 text-[10px] font-semibold uppercase text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
          {item.label.slice(0, 10)}
        </a>
      ))}
    </div>
  )
}
