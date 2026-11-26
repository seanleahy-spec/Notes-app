import { useRef } from 'react'

/** Horizontal swipe detection. Spread the returned handlers onto an element. */
export function useSwipe({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return (start.current = null)
      const t = e.touches[0]
      start.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - s.t < 800) {
        if (dx < 0) onLeft()
        else onRight()
      }
    },
  }
}
