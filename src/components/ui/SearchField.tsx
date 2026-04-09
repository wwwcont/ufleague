import { Search, X } from 'lucide-react'

export const SearchField = ({ value, onChange, placeholder = 'Поиск' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="matte-panel relative flex items-center gap-2 px-3">
    <Search size={16} className="text-textMuted" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-textMuted/60"
      aria-label="Поиск по турниру"
    />
    {value && (
      <button onClick={() => onChange('')} className="text-textMuted">
        <X size={16} />
      </button>
    )}
  </div>
)
