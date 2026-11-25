import { createContext, useContext, useEffect } from 'react'

interface ShellApi {
  /** Registers a request to hide the tab bar; returns a function to release it. */
  hideTabBar: () => () => void
}

export const ShellContext = createContext<ShellApi>({ hideTabBar: () => () => {} })

/** Hide the tab bar while the calling component is mounted and `hidden` is true. */
export function useHideTabBar(hidden: boolean) {
  const { hideTabBar } = useContext(ShellContext)
  useEffect(() => (hidden ? hideTabBar() : undefined), [hidden, hideTabBar])
}
