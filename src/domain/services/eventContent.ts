import type { EventContentBlock } from '../entities/types'

const makeId = () => `blk_${Math.random().toString(36).slice(2, 10)}`

export const normalizeEventBlocks = (rawBlocks: unknown, fallback: { text?: string; imageUrl?: string }): EventContentBlock[] => {
  if (Array.isArray(rawBlocks)) {
    const normalized = rawBlocks.reduce<EventContentBlock[]>((acc, item: any) => {
      if (item?.type === 'text') {
        const text = String(item.text ?? '').trim()
        if (text) acc.push({ id: item.id || makeId(), type: 'text', text })
      }
      if (item?.type === 'image') {
        const imageUrl = String(item.imageUrl ?? '').trim()
        if (imageUrl) acc.push({ id: item.id || makeId(), type: 'image', imageUrl })
      }
      return acc
    }, [])

    if (normalized.length) return normalized
  }

  const fallbackBlocks: EventContentBlock[] = []
  if (fallback.text?.trim()) fallbackBlocks.push({ id: makeId(), type: 'text', text: fallback.text.trim() })
  if (fallback.imageUrl?.trim()) fallbackBlocks.push({ id: makeId(), type: 'image', imageUrl: fallback.imageUrl.trim() })
  return fallbackBlocks
}

export const blocksToPlainText = (blocks: EventContentBlock[]) => blocks
  .filter((item) => item.type === 'text')
  .map((item) => item.text?.trim())
  .filter(Boolean)
  .join('\n\n')

export const deriveSummaryFromBlocks = (blocks: EventContentBlock[]) => {
  const text = blocksToPlainText(blocks)
  if (!text) return ''
  return text.slice(0, 160)
}
