import { lazy, type ComponentType, type LazyExoticComponent, type ReactElement } from 'react'
import { CalendarIcon, NotesIcon, WhiteboardIcon } from '../components/Icons'

/**
 * THE TAB REGISTRY.
 *
 * Every main section of the app is one entry here. To add a new tab:
 *   1. Create a folder in src/features/<name>/ with a component that handles
 *      everything under its path (it can define its own sub-routes).
 *   2. Add an entry below. Order here = order in the tab bar.
 *   3. (Optional) Add an accent colour token in index.css.
 * Nothing else in the app needs to change.
 */
export interface TabDefinition {
  id: string
  label: string
  /** Base URL path, e.g. "/notes". The tab owns every route under it. */
  path: string
  icon: (props: { size?: number }) => ReactElement
  /** CSS colour (usually a token) used for the tab's buttons and highlights. */
  accent: string
  component: LazyExoticComponent<ComponentType>
}

export const tabs: TabDefinition[] = [
  {
    id: 'calendar',
    label: 'Calendar',
    path: '/calendar',
    icon: CalendarIcon,
    accent: 'var(--accent-calendar)',
    component: lazy(() => import('../features/calendar/CalendarTab')),
  },
  {
    id: 'whiteboards',
    label: 'Whiteboards',
    path: '/whiteboards',
    icon: WhiteboardIcon,
    accent: 'var(--accent-whiteboards)',
    component: lazy(() => import('../features/whiteboards/WhiteboardsTab')),
  },
  {
    id: 'notes',
    label: 'Notes',
    path: '/notes',
    icon: NotesIcon,
    accent: 'var(--accent-notes)',
    component: lazy(() => import('../features/notes/NotesTab')),
  },
]

const LAST_TAB_KEY = 'app.lastTab'

/** Tab shown when the app opens with no specific location: the last one used. */
export function startTab(): TabDefinition {
  try {
    const id = localStorage.getItem(LAST_TAB_KEY)
    const tab = tabs.find((t) => t.id === id)
    if (tab) return tab
  } catch {
    /* storage unavailable */
  }
  return tabs[0]
}

export function rememberTab(tab: TabDefinition) {
  try {
    localStorage.setItem(LAST_TAB_KEY, tab.id)
  } catch {
    /* ignore */
  }
}

export function tabForPath(pathname: string): TabDefinition | undefined {
  return tabs.find((t) => pathname === t.path || pathname.startsWith(t.path + '/'))
}
