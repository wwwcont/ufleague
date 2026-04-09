import type { ReactNode } from 'react'

export const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="mb-4 mt-7 flex items-end justify-between gap-3">
    <div>
      <div className="mb-2 h-px w-8 bg-accentYellow/70" />
      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-textSecondary">{title}</h2>
    </div>
    {action}
  </div>
)
