export const EmptyState = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="rounded-xl border border-dashed border-borderStrong bg-surface p-6 text-center">
    <p className="text-sm font-semibold">{title}</p>
    {subtitle && <p className="mt-1 text-xs text-textMuted">{subtitle}</p>}
  </div>
)
