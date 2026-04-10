import type { ReactNode } from 'react'

export const PageIntro = ({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) => (
  <div className="matte-panel flex items-start justify-between gap-3 p-4">
    <div>
      <h1 className="text-xl font-bold leading-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-textMuted">{subtitle}</p>}
    </div>
    {right}
  </div>
)
