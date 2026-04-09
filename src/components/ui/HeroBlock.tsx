import type { ReactNode } from 'react'

export const HeroBlock = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) => (
  <section className="matte-panel px-5 py-6 sm:px-6">
    <div className="accent-line mb-3 w-14" />
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">Центр турнира</p>
    <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-textPrimary">{title}</h2>
    {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-textSecondary">{subtitle}</p>}
    {children && <div className="mt-5">{children}</div>}
  </section>
)
