export const EventEmptyState = ({ message = 'События пока не опубликованы.' }: { message?: string }) => (
  <div className="rounded-xl border border-dashed border-borderStrong bg-mutedBg px-4 py-8 text-center text-sm text-textMuted">
    {message}
  </div>
)
