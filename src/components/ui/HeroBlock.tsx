import type { ReactNode } from 'react'

export const HeroBlock = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) => (
  <section className="relative border-y border-accentYellow/80 px-5 py-6 sm:px-6">
    <div className="absolute left-0 top-0 h-full w-px bg-accentYellow/80" />
    <div className="absolute right-4 top-4 h-px w-10 bg-accentYellow/60" />
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textMuted">Центр турнира</p>
    <h2 className="text-[28px] font-bold leading-tight tracking-[-0.02em] text-textPrimary">{title}</h2>
    {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-textSecondary">{subtitle}</p>}
    {children && <div className="mt-5">{children}</div>}
  </section>
)
