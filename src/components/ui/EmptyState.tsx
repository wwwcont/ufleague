export const EmptyState = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="matte-panel p-6 text-center">
    <p className="text-base font-semibold">{title}</p>
    {subtitle && <p className="mt-1 text-sm text-textMuted">{subtitle}</p>}
  </div>
)
