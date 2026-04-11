import { X } from 'lucide-react'
import { useEffect } from 'react'

interface MediaPreviewModalProps {
  isOpen: boolean
  imageUrl?: string | null
  alt?: string
  onClose: () => void
}

export const MediaPreviewModal = ({ isOpen, imageUrl, alt = 'preview', onClose }: MediaPreviewModalProps) => {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !imageUrl) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 px-3 py-6 sm:px-6"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <button
        type="button"
        aria-label="Закрыть просмотр изображения"
        onClick={onClose}
        className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55 text-white sm:right-5 sm:top-5"
      >
        <X size={18} />
      </button>

      <img
        src={imageUrl}
        alt={alt}
        className="max-h-[86vh] w-auto max-w-[96vw] rounded-xl object-contain shadow-2xl sm:max-w-[90vw]"
      />
    </div>
  )
}
