import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, type Note } from '../../db/db'

/** All notes, most recently edited first. `undefined` while loading. */
export function useNotes(): Note[] | undefined {
  return useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [])
}

export async function createNote(): Promise<string> {
  const now = Date.now()
  const id = newId()
  await db.notes.add({ id, title: '', content: null, text: '', createdAt: now, updatedAt: now })
  return id
}

export function getNote(id: string): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'content' | 'text'>>) {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() })
}

export async function renameNote(id: string, title: string) {
  await updateNote(id, { title: title.trim() })
}

export async function deleteNote(id: string) {
  await db.notes.delete(id)
}

export function isNoteEmpty(note: Pick<Note, 'title' | 'text'>): boolean {
  return note.title.trim() === '' && note.text.trim() === ''
}

/** Removes untouched blank notes (like Apple Notes does when you leave one). */
export async function deleteEmptyNotes(exceptId?: string) {
  const empty = await db.notes.filter((n) => n.id !== exceptId && isNoteEmpty(n)).primaryKeys()
  if (empty.length) await db.notes.bulkDelete(empty)
}

function nonEmptyLines(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export function noteTitle(note: Pick<Note, 'title' | 'text'>): string {
  return note.title.trim() || nonEmptyLines(note.text)[0] || 'New Note'
}

export function notePreview(note: Pick<Note, 'title' | 'text'>): string {
  const lines = nonEmptyLines(note.text)
  const line = note.title.trim() ? lines[0] : lines[1]
  return line || 'No additional text'
}

export function noteMatches(note: Pick<Note, 'title' | 'text'>, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return note.title.toLowerCase().includes(q) || note.text.toLowerCase().includes(q)
}
