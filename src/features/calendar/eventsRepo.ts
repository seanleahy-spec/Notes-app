import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, type CalendarEvent } from '../../db/db'
import { displayTime, toMinutes } from './dates'

export type EventDraft = Pick<CalendarEvent, 'title' | 'date' | 'allDay' | 'startTime' | 'endTime' | 'notes'>

/** Events whose date is between two 'yyyy-MM-dd' keys (inclusive), sorted. */
export function useEventsBetween(startKey: string, endKey: string): CalendarEvent[] | undefined {
  return useLiveQuery(
    async () => sortEvents(await db.events.where('date').between(startKey, endKey, true, true).toArray()),
    [startKey, endKey],
  )
}

export async function getEventsOn(dateKey: string): Promise<CalendarEvent[]> {
  return sortEvents(await db.events.where('date').equals(dateKey).toArray())
}

export function getEvent(id: string) {
  return db.events.get(id)
}

export async function createEvent(draft: EventDraft): Promise<string> {
  const now = Date.now()
  const id = newId()
  await db.events.add({ ...clean(draft), id, createdAt: now, updatedAt: now })
  return id
}

export async function updateEvent(id: string, draft: EventDraft) {
  await db.events.update(id, { ...clean(draft), updatedAt: Date.now() })
}

export async function deleteEvent(id: string) {
  await db.events.delete(id)
}

function clean(d: EventDraft): EventDraft {
  return { ...d, title: d.title.trim() || 'New Event', notes: d.notes.trim() }
}

/** All-day first, then by start time, then by title. */
export function sortEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    if (!a.allDay && a.startTime !== b.startTime) return toMinutes(a.startTime) - toMinutes(b.startTime)
    return a.title.localeCompare(b.title)
  })
}

export function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
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

export function isValidDraft(d: EventDraft): string | null {
  if (!d.date) return 'Choose a date.'
  if (!d.allDay) {
    if (!d.startTime || !d.endTime) return 'Choose a start and end time.'
    if (toMinutes(d.endTime) <= toMinutes(d.startTime)) return 'The end time must be after the start time.'
  }
  return null
}
