import type { ReactNode } from 'react'

export const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="mb-3 mt-6 flex items-end justify-between gap-3">
    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">{title}</h2>
    {action}
  </div>
)
