import type { ReactNode } from 'react'

export const PageContainer = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`page-container mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-28 pt-6 md:px-6 ${className}`.trim()}>{children}</div>
)
