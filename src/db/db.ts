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

class AppDatabase extends Dexie {
  notes!: EntityTable<Note, 'id'>

  constructor() {
    super('my-productivity')
    this.version(1).stores({
      notes: 'id, updatedAt',
    })
  }
}

export const db = new AppDatabase()

export function newId(): string {
  return crypto.randomUUID()
}
