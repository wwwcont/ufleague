import { useEffect, useMemo, useRef, useState } from 'react'

interface ImageCropperDialogProps {
  isOpen: boolean
  file: File | null
  title: string
  onCancel: () => void
  onApply: (file: File, previewUrl: string) => void
}

const VIEWPORT_SIZE = 280
const OUTPUT_SIZE = 1024

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const ImageCropperDialog = ({ isOpen, file, title, onCancel, onApply }: ImageCropperDialogProps) => {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isApplying, setIsApplying] = useState(false)
  const [decodeError, setDecodeError] = useState(false)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!isOpen || !file) return
    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    setIsApplying(false)
    setDecodeError(false)
    const image = new Image()
    image.onload = () => setImgSize({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => {
      setImgSize(null)
      setDecodeError(true)
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [file, isOpen])

  const baseScale = useMemo(() => {
    if (!imgSize) return 1
    return Math.max(VIEWPORT_SIZE / imgSize.width, VIEWPORT_SIZE / imgSize.height)
  }, [imgSize])

  const scale = baseScale * zoom
  const scaledWidth = (imgSize?.width ?? VIEWPORT_SIZE) * scale
  const scaledHeight = (imgSize?.height ?? VIEWPORT_SIZE) * scale
  const offsetLimitX = Math.max(0, (scaledWidth - VIEWPORT_SIZE) / 2)
  const offsetLimitY = Math.max(0, (scaledHeight - VIEWPORT_SIZE) / 2)

  if (!isOpen || !file) return null

  return (
    <section className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <p className="text-sm font-semibold text-textPrimary">{title}</p>
        <p className="mt-1 text-xs text-textMuted">Подгоните область миниатюры внутри круга.</p>

        <div
          className="relative mx-auto mt-3 h-[280px] w-[280px] touch-none overflow-hidden rounded-2xl border border-borderSubtle bg-panelSoft"
          onPointerDown={(event) => {
            dragRef.current = { x: event.clientX, y: event.clientY }
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return
            const dx = event.clientX - dragRef.current.x
            const dy = event.clientY - dragRef.current.y
            dragRef.current = { x: event.clientX, y: event.clientY }
            setOffset((prev) => ({
              x: clamp(prev.x + dx, -offsetLimitX, offsetLimitX),
              y: clamp(prev.y + dy, -offsetLimitY, offsetLimitY),
            }))
          }}
          onPointerUp={() => {
            dragRef.current = null
          }}
          onPointerLeave={() => {
            dragRef.current = null
          }}
        >
          {sourceUrl && !decodeError && (
            <img
              src={sourceUrl}
              alt="crop-source"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 select-none"
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                objectFit: 'cover',
              }}
            />
          )}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(circle at center, transparent 0 42%, rgba(0,0,0,0.6) 43% 100%)' }}
          />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[236px] w-[236px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/85" />
          {decodeError && (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-textMuted">
              Не удалось открыть формат в браузере. Выберите JPG/PNG/WEBP/AVIF/GIF/SVG.
            </div>
          )}
        </div>

        {!decodeError && (
          <label className="mt-3 block space-y-1 text-xs text-textMuted">
            Масштаб
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => {
                const nextZoom = Number(event.target.value)
                setZoom(nextZoom)
                setOffset((prev) => ({
                  x: clamp(prev.x, -Math.max(0, ((imgSize?.width ?? VIEWPORT_SIZE) * baseScale * nextZoom - VIEWPORT_SIZE) / 2), Math.max(0, ((imgSize?.width ?? VIEWPORT_SIZE) * baseScale * nextZoom - VIEWPORT_SIZE) / 2)),
                  y: clamp(prev.y, -Math.max(0, ((imgSize?.height ?? VIEWPORT_SIZE) * baseScale * nextZoom - VIEWPORT_SIZE) / 2), Math.max(0, ((imgSize?.height ?? VIEWPORT_SIZE) * baseScale * nextZoom - VIEWPORT_SIZE) / 2)),
                }))
              }}
              className="w-full"
            />
          </label>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-borderSubtle px-3 py-1.5 text-xs text-textSecondary">
            Отмена
          </button>
          <button
            type="button"
            disabled={isApplying || !imgSize || !sourceUrl}
            className="rounded-lg bg-accentYellow px-3 py-1.5 text-xs font-semibold text-app disabled:opacity-50"
            onClick={async () => {
              if (!imgSize || !sourceUrl) return
              setIsApplying(true)
              try {
                const canvas = document.createElement('canvas')
                canvas.width = OUTPUT_SIZE
                canvas.height = OUTPUT_SIZE
                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('canvas context unavailable')

                const cropSize = VIEWPORT_SIZE / scale
                const sx = clamp(imgSize.width / 2 - cropSize / 2 - offset.x / scale, 0, Math.max(0, imgSize.width - cropSize))
                const sy = clamp(imgSize.height / 2 - cropSize / 2 - offset.y / scale, 0, Math.max(0, imgSize.height - cropSize))

                const image = new Image()
                await new Promise<void>((resolve, reject) => {
                  image.onload = () => resolve()
                  image.onerror = () => reject(new Error('failed to decode image'))
                  image.src = sourceUrl
                })

                ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.95))
                if (!blob) throw new Error('failed to export image')
                const normalizedFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}_thumb.png`, { type: 'image/png' })
                onApply(normalizedFile, URL.createObjectURL(blob))
              } catch {
                onApply(file, URL.createObjectURL(file))
              } finally {
                setIsApplying(false)
              }
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </section>
  )
}
