interface EditableTextareaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
  placeholder?: string
  rows?: number
}

export const EditableTextareaField = ({ label, value, onChange, isEditing, placeholder, rows = 4 }: EditableTextareaFieldProps) => (
  <label className="block space-y-1">
    <span className="text-xs text-textMuted">{label}</span>
    {isEditing ? (
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary"
      />
    ) : (
      <p className="rounded-lg border border-transparent bg-mutedBg px-3 py-2 text-sm leading-relaxed text-textSecondary">{value || '—'}</p>
    )}
  </label>
)
