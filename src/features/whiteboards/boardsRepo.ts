import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, type Whiteboard } from '../../db/db'
import type { SavedViewport, WbElement } from './types'

/** All boards, most recently edited first. */
export function useBoards(): Whiteboard[] | undefined {
  return useLiveQuery(() => db.whiteboards.orderBy('updatedAt').reverse().toArray(), [])
}

export async function createBoard(): Promise<string> {
  const now = Date.now()
  const id = newId()
  await db.whiteboards.add({ id, name: 'Untitled', elements: [], viewport: null, createdAt: now, updatedAt: now })
  return id
}

export const getBoard = (id: string) => db.whiteboards.get(id)

export async function saveElements(id: string, elements: WbElement[]) {
  await db.whiteboards.update(id, { elements, updatedAt: Date.now() })
}

/** Saves where you were looking, without counting as an edit. */
export async function saveViewport(id: string, viewport: SavedViewport) {
  await db.whiteboards.update(id, { viewport })
}

export async function renameBoard(id: string, name: string) {
  await db.whiteboards.update(id, { name: name.trim() || 'Untitled', updatedAt: Date.now() })
}

export async function deleteBoard(id: string) {
  await db.whiteboards.delete(id)
}
