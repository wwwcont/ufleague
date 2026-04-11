interface EditableTextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
  placeholder?: string
}

export const EditableTextField = ({ label, value, onChange, isEditing, placeholder }: EditableTextFieldProps) => (
  <label className="block space-y-1">
    <span className="text-xs text-textMuted">{label}</span>
    {isEditing ? (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-borderSubtle bg-mutedBg px-3 py-2 text-sm text-textPrimary"
      />
    ) : (
      <p className="rounded-lg border border-transparent bg-mutedBg px-3 py-2 text-sm text-textSecondary">{value || '—'}</p>
    )}
  </label>
)
