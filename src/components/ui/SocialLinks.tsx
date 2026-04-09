import { Camera, Send } from 'lucide-react'

const VkGlyph = () => (
  <span className="inline-flex h-4 w-4 items-center justify-center text-[9px] font-bold leading-none">VK</span>
)

export const SocialLinks = ({ compact = false }: { compact?: boolean }) => {
  const size = compact ? 'h-8 w-8' : 'h-9 w-9'

  return (
    <div className="mt-4 flex items-center gap-2">
      <a href="#" aria-label="Telegram" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <Send size={14} />
      </a>
      <a href="#" aria-label="VK" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <VkGlyph />
      </a>
      <a href="#" aria-label="Instagram" className={`${size} inline-flex items-center justify-center rounded-full border border-borderSubtle bg-panelSoft text-textSecondary hover:border-borderStrong hover:text-accentYellow`}>
        <Camera size={14} />
      </a>
    </div>
  )
}
