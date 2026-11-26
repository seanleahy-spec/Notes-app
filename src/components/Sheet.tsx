import { useEffect, type ReactNode } from 'react'

/**
 * Modal sheet: slides up full-height on iPhone, centred card on iPad.
 * Header has left / title / right slots like a nav bar.
 */
export function Sheet({
  title,
  left,
  right,
  onClose,
  children,
}: {
  title: string
  left?: ReactNode
  right?: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header">
          <div className="nav-bar-side left">{left}</div>
          <div className="nav-bar-title">{title}</div>
          <div className="nav-bar-side right">{right}</div>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
