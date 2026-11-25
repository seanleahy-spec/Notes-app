import { differenceInCalendarDays, format, isSameYear } from 'date-fns'
import { enAU } from 'date-fns/locale'

const fmt = (ts: number, pattern: string) => format(ts, pattern, { locale: enAU })

/** Short date shown in each list row, like Apple Notes. */
export function listDate(ts: number, now = Date.now()): string {
  const days = differenceInCalendarDays(now, ts)
  if (days <= 0) return fmt(ts, 'h:mm a').toLowerCase()
  if (days === 1) return 'Yesterday'
  if (days < 7) return fmt(ts, 'EEEE')
  return fmt(ts, 'd/M/yy')
}

/** Section a note falls under in the list. */
export function groupLabel(ts: number, now = Date.now()): string {
  const days = differenceInCalendarDays(now, ts)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return 'Previous 7 Days'
  if (days < 30) return 'Previous 30 Days'
  return isSameYear(now, ts) ? fmt(ts, 'MMMM') : fmt(ts, 'yyyy')
}

/** Full timestamp shown at the top of an open note. */
export function editorDate(ts: number): string {
  return `${fmt(ts, 'd MMMM yyyy')} at ${fmt(ts, 'h:mm a').toLowerCase()}`
}
