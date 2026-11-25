import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface MenuItem {
  label: string
  icon?: ReactNode
  destructive?: boolean
  onSelect: () => void
}

/** A button that opens an iOS-style popover menu. */
export function ActionMenu({ trigger, label, items }: { trigger: ReactNode; label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div className="action-menu" ref={ref}>
      <button
        type="button"
        className="icon-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      {open && (
        <div className="action-menu-popover" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.destructive ? 'destructive' : undefined}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              <span>{item.label}</span>
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
