import { useState } from 'react'
import type { EventContentBlock } from '../../domain/entities/types'
import { MediaPreviewModal } from '../ui/MediaPreviewModal'

export const EventContentRenderer = ({ blocks }: { blocks: EventContentBlock[] }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  if (!blocks.length) return <p className="text-base leading-relaxed text-textSecondary">Содержимое события пока не заполнено.</p>

  return (
    <>
      <div className="space-y-4">
        {blocks.map((block) => {
          if (block.type === 'image') {
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => setPreviewImage(block.imageUrl ?? null)}
                className="block w-full overflow-hidden rounded-2xl"
              >
                <img src={block.imageUrl} alt="event block" className="h-52 w-full rounded-2xl object-cover transition hover:opacity-95 sm:h-64" />
              </button>
            )
          }
          return <p key={block.id} className="whitespace-pre-wrap text-base leading-relaxed text-textSecondary">{block.text}</p>
        })}
      </div>

      <MediaPreviewModal
        isOpen={Boolean(previewImage)}
        imageUrl={previewImage}
        alt="Изображение события"
        onClose={() => setPreviewImage(null)}
      />
    </>
  )
}
