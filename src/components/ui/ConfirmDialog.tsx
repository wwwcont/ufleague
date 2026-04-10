interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h3 className="text-base font-semibold text-textPrimary">{title}</h3>
        <p className="mt-1 text-sm text-textSecondary">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-borderSubtle px-3 py-1.5 text-sm text-textSecondary">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-accentYellow px-3 py-1.5 text-sm font-semibold text-app">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
