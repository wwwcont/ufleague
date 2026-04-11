import { Camera, Send } from 'lucide-react'

const VkGlyph = () => (
  <span className="inline-flex h-4 w-4 items-center justify-center text-[9px] font-bold leading-none">VK</span>
)

export type SocialSet = { telegram?: string; vk?: string; instagram?: string }
type CustomSocial = { label: string; url: string }

export const SocialLinks = ({ compact = false, links, custom = [] }: { compact?: boolean; links?: SocialSet; custom?: CustomSocial[] }) => {
  const size = compact ? 'h-8 w-8' : 'h-9 w-9'
  const visibleCustom = custom.slice(0, 2)
  const hasAny = Boolean(links?.telegram || links?.vk || links?.instagram || visibleCustom.length)
  if (!hasAny) return null

  return (
    <div className="mt-4 flex items-center gap-2">
      {links?.telegram && <a href={links.telegram} aria-label="Telegram" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <Send size={14} />
      </a>}
      {links?.vk && <a href={links.vk} aria-label="VK" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <VkGlyph />
      </a>}
      {links?.instagram && <a href={links.instagram} aria-label="Instagram" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <Camera size={14} />
      </a>}
      {visibleCustom.map((item) => (
        <a key={item.url} href={item.url} aria-label={item.label} className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft px-2 text-[10px] font-semibold uppercase text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
          {item.label.slice(0, 10)}
        </a>
      ))}
    </div>
  )
}
