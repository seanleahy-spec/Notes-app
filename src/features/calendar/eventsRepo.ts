import { addDays, format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, type CalendarEvent, type Recurrence } from '../../db/db'
import { DEFAULT_EVENT_COLOR } from './colors'
import { displayTime, fmt, fromKey, toMinutes } from './dates'

export type EventDraft = Pick<CalendarEvent, 'title' | 'date' | 'allDay' | 'startTime' | 'endTime' | 'notes'> & {
  color: string
  recurrence: Recurrence | null
}

/**
 * One appearance of an event on a particular date. For repeating events,
 * `id` is the series id, `date` is this occurrence's date and `seriesStart`
 * is the series' first date.
 */
export interface Occurrence extends CalendarEvent {
  key: string
  repeating: boolean
  seriesStart: string
}

// ---------- Reading ----------

async function occurrencesBetween(startKey: string, endKey: string): Promise<Occurrence[]> {
  const [single, series] = await Promise.all([
    db.events
      .where('date')
      .between(startKey, endKey, true, true)
      .filter((e) => !e.repeats)
      .toArray(),
    db.events.where('repeats').equals(1).toArray(),
  ])
  return sortEvents([
    ...single.map((e) => ({ ...e, key: e.id, repeating: false, seriesStart: e.date })),
    ...series.flatMap((s) => expandSeries(s, startKey, endKey)),
  ])
}

/** Event occurrences between two 'yyyy-MM-dd' keys (inclusive), sorted. Live-updating. */
export function useEventsBetween(startKey: string, endKey: string): Occurrence[] | undefined {
  return useLiveQuery(() => occurrencesBetween(startKey, endKey), [startKey, endKey])
}

export function getEventsOn(dateKey: string): Promise<Occurrence[]> {
  return occurrencesBetween(dateKey, dateKey)
}

/** Dates (within the range) on which a repeating event occurs. */
export function seriesDates(series: CalendarEvent, startKey: string, endKey: string): string[] {
  const r = series.recurrence
  if (!r) return series.date >= startKey && series.date <= endKey ? [series.date] : []
  const skip = new Set(series.exceptions ?? [])
  if (r.kind === 'dates') {
    return r.dates.filter((d) => d >= startKey && d <= endKey && !skip.has(d))
  }
  const from = series.date > startKey ? series.date : startKey
  const to = r.until && r.until < endKey ? r.until : endKey
  const out: string[] = []
  const days = new Set(r.weekdays)
  for (let d = fromKey(from); format(d, 'yyyy-MM-dd') <= to; d = addDays(d, 1)) {
    const key = format(d, 'yyyy-MM-dd')
    if (days.has(d.getDay()) && !skip.has(key)) out.push(key)
  }
  return out
}

function expandSeries(series: CalendarEvent, startKey: string, endKey: string): Occurrence[] {
  return seriesDates(series, startKey, endKey).map((date) => ({
    ...series,
    date,
    key: `${series.id}:${date}`,
    repeating: true,
    seriesStart: series.date,
  }))
}

// ---------- Writing ----------

function normalise(d: EventDraft): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  let recurrence = d.recurrence
  let date = d.date
  if (recurrence?.kind === 'dates') {
    const dates = [...new Set(recurrence.dates.filter(Boolean))].sort()
    recurrence = { kind: 'dates', dates }
    date = dates[0] ?? date
  } else if (recurrence?.kind === 'weekly') {
    recurrence = { kind: 'weekly', weekdays: [...new Set(recurrence.weekdays)].sort(), until: recurrence.until || null }
  }
  return {
    title: d.title.trim() || 'New Event',
    date,
    allDay: d.allDay,
    startTime: d.startTime,
    endTime: d.endTime,
    notes: d.notes.trim(),
    color: d.color || DEFAULT_EVENT_COLOR,
    recurrence: recurrence ?? null,
    repeats: recurrence ? 1 : 0,
  }
}

export async function createEvent(draft: EventDraft): Promise<string> {
  const now = Date.now()
  const id = newId()
  await db.events.add({ ...normalise(draft), exceptions: [], id, createdAt: now, updatedAt: now })
  return id
}

/** Updates a one-off event, or every occurrence of a repeating one. */
export async function updateEvent(id: string, draft: EventDraft) {
  await db.events.update(id, { ...normalise(draft), updatedAt: Date.now() })
}

export async function deleteEvent(id: string) {
  await db.events.delete(id)
}

/** Removes one date from a repeating event. */
export async function deleteOccurrence(seriesId: string, date: string) {
  await db.transaction('rw', db.events, async () => {
    const series = await db.events.get(seriesId)
    if (!series) return
    await db.events.update(seriesId, {
      exceptions: [...new Set([...(series.exceptions ?? []), date])],
      updatedAt: Date.now(),
    })
  })
}

/** "Save for this event only": split one date off a series into its own event. */
export async function detachOccurrence(seriesId: string, date: string, draft: EventDraft) {
  await db.transaction('rw', db.events, async () => {
    await deleteOccurrence(seriesId, date)
    await createEvent({ ...draft, recurrence: null })
  })
}

// ---------- Helpers ----------

/** All-day first, then by start time, then by title. */
export function sortEvents<T extends CalendarEvent>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    if (!a.allDay && a.startTime !== b.startTime) return toMinutes(a.startTime) - toMinutes(b.startTime)
    return a.title.localeCompare(b.title)
  })
}

export function groupByDate<T extends CalendarEvent>(events: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const e of events) {
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  return map
}

/** '9 am – 10:30 am' or 'All day' */
export function timeRangeLabel(e: Pick<CalendarEvent, 'allDay' | 'startTime' | 'endTime'>): string {
  return e.allDay ? 'All day' : `${displayTime(e.startTime)} – ${displayTime(e.endTime)}`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 'Every Mon, Wed and Fri until 19 Dec 2026', 'Every weekday', '3 dates' … */
export function describeRecurrence(r: Recurrence | null | undefined): string {
  if (!r) return 'Never'
  if (r.kind === 'dates') return `On ${r.dates.length} date${r.dates.length === 1 ? '' : 's'}`
  const days = [...r.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  let text: string
  if (days.length === 7) text = 'Every day'
  else if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) text = 'Every weekday'
  else if (days.length === 2 && days.includes(0) && days.includes(6)) text = 'Every weekend'
  else {
    const names = days.map((d) => DAY_NAMES[d])
    text = 'Every ' + (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0])
  }
  return r.until ? `${text} until ${fmt(fromKey(r.until), 'd MMM yyyy')}` : text
}

export function isValidDraft(d: EventDraft): string | null {
  const r = d.recurrence
  if (r?.kind === 'dates') {
    if (!r.dates.filter(Boolean).length) return 'Add at least one date.'
  } else if (!d.date) return 'Choose a date.'
  if (r?.kind === 'weekly') {
    if (!r.weekdays.length) return 'Choose at least one day of the week.'
    if (r.until && r.until < d.date) return 'The repeat end date must be after the start date.'
  }
  if (!d.allDay) {
    if (!d.startTime || !d.endTime) return 'Choose a start and end time.'
    if (toMinutes(d.endTime) <= toMinutes(d.startTime)) return 'The end time must be after the start time.'
  }
  return null
}
