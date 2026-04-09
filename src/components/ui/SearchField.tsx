import { Search, X } from 'lucide-react'

export const SearchField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2 rounded-xl border border-borderSubtle bg-surface px-3">
    <Search size={16} className="text-textMuted" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search teams, players, matches" className="h-11 w-full bg-transparent text-sm outline-none" />
    {value && <button onClick={() => onChange('')} className="text-textMuted"><X size={16} /></button>}
  </div>
)
