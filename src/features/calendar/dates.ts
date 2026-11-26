import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enAU } from 'date-fns/locale'

/** Weeks start on Monday. */
export const WEEK_OPTS = { weekStartsOn: 1 as const }

export const fmt = (d: Date, pattern: string) => format(d, pattern, { locale: enAU })

/** Date -> 'yyyy-MM-dd' (local time). */
export const toKey = (d: Date) => format(d, 'yyyy-MM-dd')

/** 'yyyy-MM-dd' -> local Date at midnight. Falls back to today when invalid. */
export function fromKey(key: string | null | undefined): Date {
  if (key) {
    const d = parse(key, 'yyyy-MM-dd', new Date())
    if (isValid(d)) return d
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export const todayKey = () => toKey(new Date())

/** All days shown in a month grid (whole weeks, Monday first). */
export function monthGridDays(month: Date): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), WEEK_OPTS),
    end: endOfWeek(endOfMonth(month), WEEK_OPTS),
  })
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, WEEK_OPTS)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 'HH:mm' -> minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** minutes since midnight -> 'HH:mm' (clamped to the same day). */
export function fromMinutes(mins: number): string {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(mins)))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** 'HH:mm' -> '9:30 am' */
export function displayTime(time: string): string {
  const mins = toMinutes(time)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const suffix = h < 12 ? 'am' : 'pm'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Hour label for the time grid: '9 am', 'Noon'. */
export function hourLabel(hour: number): string {
  if (hour === 12) return 'Noon'
  return displayTime(`${hour}:00`)
}
