import { Search, X } from 'lucide-react'

export const SearchField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="matte-panel relative flex items-center gap-2 px-3">
    <Search size={16} className="text-textMuted" />
    {!value && <span className="typing-cursor pointer-events-none absolute left-10 text-textMuted" aria-hidden="true">|</span>}
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder=""
      className="h-12 w-full bg-transparent text-sm outline-none"
      aria-label="Поиск команд, игроков, матчей"
    />
    {value && (
      <button onClick={() => onChange('')} className="text-textMuted">
        <X size={16} />
      </button>
    )}
  </div>
)
