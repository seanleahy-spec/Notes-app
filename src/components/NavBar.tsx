import type { ReactNode } from 'react'

/** Top navigation bar: left / centered title / right slots. */
export function NavBar({ left, title, right }: { left?: ReactNode; title?: ReactNode; right?: ReactNode }) {
  return (
    <header className="nav-bar">
      <div className="nav-bar-side left">{left}</div>
      <div className="nav-bar-title">{title}</div>
      <div className="nav-bar-side right">{right}</div>
    </header>
  )
}
