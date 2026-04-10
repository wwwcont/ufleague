import type { ReactNode } from 'react'

export const PageSection = ({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`space-y-2 ${className}`}>
    {(title || action) && (
      <div className="flex items-center justify-between">
        {title ? <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-textSecondary">{title}</h2> : <span />}
        {action}
      </div>
    )}
    {children}
  </section>
)
