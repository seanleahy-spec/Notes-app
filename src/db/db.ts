import Dexie, { type EntityTable } from 'dexie'

/**
 * Single on-device database (IndexedDB) for the whole app.
 *
 * Adding a new section later: add its record type and a table below, then add a
 * NEW `this.version(n + 1).stores({...})` call listing only the new/changed
 * tables. Never edit an existing version — that is how existing data is kept.
 */

export interface Note {
  id: string
  /** Explicit title. If empty, the list falls back to the first line of the body. */
  title: string
  /** Rich-text document (Tiptap/ProseMirror JSON). */
  content: unknown
  /** Plain-text copy of the body, used for search and list previews. */
  text: string
  createdAt: number
  updatedAt: number
}

/**
 * How an event repeats.
 *  - weekly: on the given weekdays (0 = Sunday … 6 = Saturday, like Date.getDay),
 *    from the event's date until `until` (inclusive) or forever.
 *  - dates:  on exactly these dates ('yyyy-MM-dd').
 */
export type Recurrence =
  | { kind: 'weekly'; weekdays: number[]; until?: string | null }
  | { kind: 'dates'; dates: string[] }

export interface CalendarEvent {
  id: string
  title: string
  /** Local calendar date, 'yyyy-MM-dd'. For repeating events, the first date. */
  date: string
  allDay: boolean
  /** 'HH:mm' (24h). Ignored when allDay. */
  startTime: string
  /** 'HH:mm' (24h), after startTime. Ignored when allDay. */
  endTime: string
  notes: string
  /** Colour id from EVENT_COLORS (features/calendar/colors.ts). Missing = red. */
  color?: string
  recurrence?: Recurrence | null
  /** 1 when `recurrence` is set (indexed so repeating events can be found quickly). */
  repeats?: 0 | 1
  /** Dates removed from a repeating series ("delete this event only"). */
  exceptions?: string[]
  createdAt: number
  updatedAt: number
}

class AppDatabase extends Dexie {
  notes!: EntityTable<Note, 'id'>
  events!: EntityTable<CalendarEvent, 'id'>

  constructor() {
    super('my-productivity')
    this.version(1).stores({
      notes: 'id, updatedAt',
    })
    this.version(2).stores({
      events: 'id, date',
    })
    this.version(3).stores({
      events: 'id, date, repeats',
    })
  }
}

export const db = new AppDatabase()

export function newId(): string {
  return crypto.randomUUID()
}
