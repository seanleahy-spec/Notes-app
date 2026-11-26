/** Event colours (Apple Calendar palette). Values live in index.css as --ev-<id>. */
export const EVENT_COLORS = [
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'purple', label: 'Purple' },
  { id: 'brown', label: 'Brown' },
] as const

export const DEFAULT_EVENT_COLOR = 'red'

export function colorVar(id: string | undefined): string {
  const known = EVENT_COLORS.some((c) => c.id === id)
  return `var(--ev-${known ? id : DEFAULT_EVENT_COLOR})`
}

/** Inline style that sets --event-color for an event element. */
export function eventColorStyle(id: string | undefined): React.CSSProperties {
  return { ['--event-color' as string]: colorVar(id) }
}
