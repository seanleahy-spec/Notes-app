import { db } from './db'

const APP_ID = 'my-productivity'

interface BackupFile {
  app: string
  schemaVersion: number
  exportedAt: string
  tables: Record<string, unknown[]>
}

/** Serialises every table in the database. New tables are included automatically. */
export async function createBackup(): Promise<Blob> {
  const tables: Record<string, unknown[]> = {}
  for (const table of db.tables) {
    tables[table.name] = await table.toArray()
  }
  const backup: BackupFile = {
    app: APP_ID,
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    tables,
  }
  return new Blob([JSON.stringify(backup)], { type: 'application/json' })
}

export function backupFileName(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `productivity-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

/** Shares (iOS share sheet) or downloads the backup file. */
export async function exportBackup(): Promise<void> {
  const blob = await createBackup()
  const name = backupFileName()
  const file = new File([blob], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return
      // fall through to a normal download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Replaces the contents of every table present in the backup file.
 * Returns the number of records restored.
 */
export async function importBackup(file: File): Promise<number> {
  let parsed: BackupFile
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('That file isn’t a valid backup.')
  }
  if (parsed?.app !== APP_ID || typeof parsed.tables !== 'object') {
    throw new Error('That file isn’t a backup from this app.')
  }
  const known = db.tables.filter((t) => Array.isArray(parsed.tables[t.name]))
  let count = 0
  await db.transaction('rw', known, async () => {
    for (const table of known) {
      const rows = parsed.tables[table.name]
      await table.clear()
      await table.bulkPut(rows)
      count += rows.length
    }
  })
  return count
}
