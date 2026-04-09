import type { ReactNode } from 'react'

export const PageContainer = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:px-6">{children}</div>
)
