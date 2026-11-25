import { useEffect, useState } from 'react'

/**
 * Keeps the app sized to the *visible* area so bottom toolbars sit right on top
 * of the on-screen keyboard (iOS otherwise scrolls the whole page under it).
 * Sets --app-height on <html> and returns whether the keyboard looks open.
 */
export function useVisualViewport(): { keyboardOpen: boolean } {
  const [keyboardOpen, setKeyboardOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    const update = () => {
      const height = vv ? vv.height : window.innerHeight
      root.style.setProperty('--app-height', `${Math.round(height)}px`)
      const open = !!vv && window.innerHeight - vv.height > 120
      setKeyboardOpen(open)
      root.classList.toggle('keyboard-open', open)
      // iOS scrolls the layout viewport when focusing an input; undo that.
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return { keyboardOpen }
}
