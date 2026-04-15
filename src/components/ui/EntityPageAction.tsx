import { Bell, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type EntityPageActionMode = 'favorite' | 'notify'

interface EntityPageActionProps {
  mode: EntityPageActionMode
  entityKey: string
}

export const EntityPageAction = ({ mode, entityKey }: EntityPageActionProps) => {
  const storageKey = useMemo(() => `ufl:${mode}:${entityKey}`, [entityKey, mode])
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    setIsActive(window.localStorage.getItem(storageKey) === '1')
  }, [storageKey])

  const Icon = mode === 'favorite' ? Star : Bell
  const label = mode === 'favorite' ? 'В избранное' : 'Уведомления'
  const activeLabel = mode === 'favorite' ? 'В избранном' : 'Уведомления включены'

  return (
    <button
      type="button"
      onClick={() => {
        const next = !isActive
        setIsActive(next)
        window.localStorage.setItem(storageKey, next ? '1' : '0')
      }}
      className={`inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${
        isActive
          ? 'border-accentYellow bg-accentYellow/15 text-accentYellow'
          : 'border-borderSubtle bg-panelBg text-textSecondary hover:text-textPrimary'
      }`}
      aria-pressed={isActive}
      aria-label={isActive ? activeLabel : label}
      title={isActive ? activeLabel : label}
    >
      <Icon size={14} className={mode === 'favorite' && isActive ? 'fill-current' : ''} />
      {isActive ? activeLabel : label}
    </button>
  )
}
