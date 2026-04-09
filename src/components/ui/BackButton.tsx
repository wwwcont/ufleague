import { ArrowLeft } from 'lucide-react'

export const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="flex h-11 w-11 items-center justify-center text-textSecondary hover:text-accentYellow" aria-label="Назад">
    <ArrowLeft size={18} />
  </button>
)
