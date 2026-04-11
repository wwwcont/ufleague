import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import type { EventContentBlock } from '../../domain/entities/types'

interface EventEditorProps {
  blocks: EventContentBlock[]
  onChange: (next: EventContentBlock[]) => void
  onImageUpload: (blockId: string, file: File | null) => void
}

const makeBlockId = () => `blk_${Math.random().toString(36).slice(2, 10)}`

export const EventEditor = ({ blocks, onChange, onImageUpload }: EventEditorProps) => {
  const addText = () => onChange([...blocks, { id: makeBlockId(), type: 'text', text: '' }])
  const addImage = () => onChange([...blocks, { id: makeBlockId(), type: 'image', imageUrl: '' }])

  const patchBlock = (index: number, patch: Partial<EventContentBlock>) => {
    const next = [...blocks]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= blocks.length) return
    const next = [...blocks]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  const remove = (index: number) => {
    const next = [...blocks]
    next.splice(index, 1)
    onChange(next)
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <article key={block.id} className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-textMuted">
            <span>{block.type === 'text' ? 'Текстовый блок' : 'Изображение'}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} className="rounded border border-borderSubtle p-1" aria-label="move-up"><ArrowUp size={12} /></button>
              <button type="button" onClick={() => move(index, 1)} className="rounded border border-borderSubtle p-1" aria-label="move-down"><ArrowDown size={12} /></button>
              <button type="button" onClick={() => remove(index)} className="rounded border border-borderSubtle p-1" aria-label="remove-block"><Trash2 size={12} /></button>
            </div>
          </div>

          {block.type === 'text' ? (
            <textarea
              value={block.text ?? ''}
              onChange={(event) => patchBlock(index, { text: event.target.value })}
              rows={4}
              placeholder="Введите текст блока"
              className="w-full rounded-lg border border-borderSubtle bg-panelBg px-3 py-2 text-sm"
            />
          ) : (
            <div className="space-y-2">
              {block.imageUrl ? <img src={block.imageUrl} alt="block" className="h-40 w-full rounded-lg object-cover" /> : <p className="text-xs text-textMuted">Изображение не выбрано.</p>}
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onImageUpload(block.id, event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-borderSubtle bg-panelBg px-3 py-2 text-xs"
              />
            </div>
          )}
        </article>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addText} className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">
          <Plus size={12} /> Добавить текст
        </button>
        <button type="button" onClick={addImage} className="inline-flex items-center gap-1 rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary">
          <ImagePlus size={12} /> Добавить изображение
        </button>
      </div>
    </div>
  )
}
