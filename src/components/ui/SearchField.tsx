import { Search, X } from 'lucide-react'

export const SearchField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="matte-panel flex items-center gap-2 px-3">
    <Search size={16} className="text-textMuted" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Поиск команд, игроков, матчей"
      className="h-12 w-full bg-transparent text-sm outline-none"
    />
    {value && (
      <button onClick={() => onChange('')} className="text-textMuted">
        <X size={16} />
      </button>
    )}
  </div>
)
