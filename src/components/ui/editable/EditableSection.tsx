import type { ReactNode } from 'react'

export type EditableStatusTone = 'idle' | 'pending' | 'success' | 'error'

export interface EditableSectionProps {
  isEditing: boolean
  children: ReactNode
  className?: string
}

export const EditableSection = ({ isEditing, children, className = '' }: EditableSectionProps) => (
  <section
    className={[
      'rounded-2xl border bg-panelBg p-4 shadow-soft transition-colors',
      isEditing ? 'border-accentYellow/60' : 'border-borderSubtle',
      className,
    ].join(' ')}
  >
    {children}
  </section>
)
