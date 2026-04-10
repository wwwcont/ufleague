import type { ReactNode } from 'react'

export const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-textSecondary">{title}</h2>
    {action}
  </div>
)
