import { ArrowLeft } from 'lucide-react'

export const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-md border border-borderSubtle text-textSecondary hover:bg-elevated" aria-label="Back">
    <ArrowLeft size={18} />
  </button>
)
