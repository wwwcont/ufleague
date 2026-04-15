import type { CircleCrop } from '../../lib/image-upload'

type CircularImageCropFieldProps = {
  imageUrl: string
  crop: CircleCrop
  onChange: (next: CircleCrop) => void
  label: string
}

export const CircularImageCropField = ({ imageUrl, crop, onChange, label }: CircularImageCropFieldProps) => (
  <div className="rounded-xl border border-borderSubtle bg-mutedBg p-3">
    <p className="text-xs text-textMuted">{label}</p>
    <div className="mt-3 flex justify-center">
      <div className="relative h-44 w-44 overflow-hidden rounded-full border border-borderStrong bg-panelBg">
        <img
          src={imageUrl}
          alt="crop-preview"
          className="h-full w-full object-cover"
          style={{ transform: `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})` }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-accentYellow/70" />
      </div>
    </div>
    <div className="mt-3 space-y-2 text-xs text-textMuted">
      <label className="block">
        Масштаб: {crop.zoom.toFixed(2)}x
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={crop.zoom}
          onChange={(event) => onChange({ ...crop, zoom: Number(event.target.value) })}
          className="mt-1 w-full accent-accentYellow"
        />
      </label>
      <label className="block">
        Смещение по горизонтали
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={crop.x}
          onChange={(event) => onChange({ ...crop, x: Number(event.target.value) })}
          className="mt-1 w-full accent-accentYellow"
        />
      </label>
      <label className="block">
        Смещение по вертикали
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={crop.y}
          onChange={(event) => onChange({ ...crop, y: Number(event.target.value) })}
          className="mt-1 w-full accent-accentYellow"
        />
      </label>
    </div>
  </div>
)
