import type { ReactNode } from 'react'

export const PageContainer = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-28 pt-4 md:px-6">{children}</div>
)
