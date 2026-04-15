interface EditableImageFieldProps {
  label: string
  imageUrl?: string
  isEditing: boolean
  onSelectFile: (file: File | null) => void
  helperText?: string
}

export const EditableImageField = ({ label, imageUrl, isEditing, onSelectFile, helperText }: EditableImageFieldProps) => (
  <div className="space-y-2">
    <p className="text-xs text-textMuted">{label}</p>
    {imageUrl ? (
      <img src={imageUrl} alt={label} className="h-40 w-full rounded-xl border border-borderSubtle object-cover" />
    ) : (
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-borderStrong bg-mutedBg text-xs text-textMuted">Изображение не загружено</div>
    )}

    {isEditing && (
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/svg+xml"
        onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-xs text-textSecondary"
      />
    )}

    {helperText && <p className="text-xs text-textMuted">{helperText}</p>}
  </div>
)
