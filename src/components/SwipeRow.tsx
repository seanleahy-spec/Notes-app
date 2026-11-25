import { useRef, useState, type ReactNode } from 'react'

export interface SwipeAction {
  label: string
  icon?: ReactNode
  color: string
  onSelect: () => void
}

const ACTION_WIDTH = 74

/**
 * A list row that reveals action buttons when swiped left (or right-clicked).
 * Only one row should be open at a time: pass `open` / `onOpenChange` from the list.
 */
export function SwipeRow({
  children,
  actions,
  open,
  onOpenChange,
}: {
  children: ReactNode
  actions: SwipeAction[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const width = actions.length * ACTION_WIDTH
  const [dragX, setDragX] = useState<number | null>(null)
  const start = useRef<{ x: number; y: number; base: number; horizontal: boolean | null } | null>(null)
  const suppressClick = useRef(false)

  const offset = dragX ?? (open ? -width : 0)

  return (
    <div
      className="swipe-row"
      onContextMenu={(e) => {
        e.preventDefault()
        onOpenChange(!open)
      }}
    >
      <div
        className="swipe-row-actions"
        style={{ width, visibility: open || dragX !== null ? 'visible' : 'hidden' }}
        aria-hidden={!open}
      >
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            tabIndex={open ? 0 : -1}
            style={{ background: a.color, width: ACTION_WIDTH }}
            onClick={() => {
              onOpenChange(false)
              a.onSelect()
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
      <div
        className="swipe-row-content"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragX === null ? 'transform 0.25s ease' : 'none',
        }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          start.current = { x: t.clientX, y: t.clientY, base: open ? -width : 0, horizontal: null }
        }}
        onTouchMove={(e) => {
          const s = start.current
          if (!s) return
          const t = e.touches[0]
          const dx = t.clientX - s.x
          const dy = t.clientY - s.y
          if (s.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            s.horizontal = Math.abs(dx) > Math.abs(dy)
          }
          if (s.horizontal) {
            setDragX(Math.max(-width - 30, Math.min(0, s.base + dx)))
          }
        }}
        onTouchEnd={() => {
          const s = start.current
          start.current = null
          if (s?.horizontal && dragX !== null) {
            suppressClick.current = true
            setTimeout(() => (suppressClick.current = false), 50)
            onOpenChange(dragX < -width / 3)
          }
          setDragX(null)
        }}
        onClickCapture={(e) => {
          if (suppressClick.current || open) {
            e.preventDefault()
            e.stopPropagation()
            if (open) onOpenChange(false)
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
