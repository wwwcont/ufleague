import type { ReactNode } from 'react'
import { Pencil, X } from 'lucide-react'

interface EditableSectionHeaderProps {
  title: string
  subtitle?: string
  canEdit?: boolean
  isEditing?: boolean
  onStartEdit?: () => void
  onCancelEdit?: () => void
  actions?: ReactNode
}

export const EditableSectionHeader = ({
  title,
  subtitle,
  canEdit = false,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
  actions,
}: EditableSectionHeaderProps) => (
  <div className="mb-3 flex items-start justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-base font-semibold text-textPrimary">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-textMuted">{subtitle}</p>}
    </div>

    <div className="flex shrink-0 items-center gap-2">
      {actions}
      {canEdit && !isEditing && (
        <button
          type="button"
          onClick={onStartEdit}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary"
          aria-label="Редактировать блок"
        >
          <Pencil size={12} />
        </button>
      )}
      {canEdit && isEditing && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-borderSubtle text-textSecondary"
          aria-label="Закрыть редактирование"
        >
          <X size={12} />
        </button>
      )}
    </div>
  </div>
)
