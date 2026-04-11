import type { EventContentBlock } from '../../domain/entities/types'

export const EventContentRenderer = ({ blocks }: { blocks: EventContentBlock[] }) => {
  if (!blocks.length) return <p className="text-base leading-relaxed text-textSecondary">Содержимое события пока не заполнено.</p>

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        if (block.type === 'image') {
          return <img key={block.id} src={block.imageUrl} alt="event block" className="h-52 w-full rounded-2xl object-cover" />
        }
        return <p key={block.id} className="text-base leading-relaxed text-textSecondary whitespace-pre-wrap">{block.text}</p>
      })}
    </div>
  )
}
