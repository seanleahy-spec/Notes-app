import { differenceInCalendarDays, format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDialogs } from '../../components/dialogs'
import { GearIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon, XCircleFillIcon } from '../../components/Icons'
import { primeKeyboard } from '../../components/keyboard'
import { NavBar } from '../../components/NavBar'
import { Sheet } from '../../components/Sheet'
import { SwipeRow } from '../../components/SwipeRow'
import type { Note } from '../../db/db'
import { kindOf, NOTE_KINDS } from './kinds/registry'
import type { NoteType } from './kinds/types'
import { createNote, deleteNote, noteMatches, notePreview, noteTitle, renameNote, useNotes } from './notesRepo'

function section(ts: number, now: number): string {
  const days = differenceInCalendarDays(now, ts)
  if (days < 7) return 'This week'
  if (days < 30) return 'This month'
  return 'Earlier'
}

export function NotesList({ selectedId }: { selectedId?: string }) {
  const notes = useNotes()
  const navigate = useNavigate()
  const { confirm, prompt } = useDialogs()
  const [query, setQuery] = useState('')
  const [openRow, setOpenRow] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  const searching = query.trim() !== ''
  const visible = useMemo(() => (notes ?? []).filter((n) => noteMatches(n, query)), [notes, query])
  const now = Date.now()

  const sections = useMemo(() => {
    if (searching) return [{ label: 'Results', notes: visible }]
    const out: { label: string; notes: Note[] }[] = []
    for (const n of visible) {
      const label = section(n.updatedAt, now)
      const last = out[out.length - 1]
      if (last?.label === label) last.notes.push(n)
      else out.push({ label, notes: [n] })
    }
    return out
  }, [visible, searching, now])

  const create = async (type: NoteType) => {
    primeKeyboard()
    setPicking(false)
    const id = await createNote(type)
    setQuery('')
    navigate(`/notes/${id}`, { state: { isNew: true } })
  }

  const handleRename = async (note: Note) => {
    const t = noteTitle(note)
    const title = await prompt({
      title: 'Rename Note',
      initialValue: t.startsWith('New ') ? '' : t,
      placeholder: 'Title',
      confirmLabel: 'Save',
    })
    if (title !== null) await renameNote(note.id, title)
  }

  const handleDelete = async (note: Note) => {
    const ok = await confirm({
      title: `Delete “${noteTitle(note)}”?`,
      message: 'This note will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    await deleteNote(note.id)
    if (selectedId === note.id) navigate('/notes')
  }

  return (
    <div className="page notes-list-page">
      <NavBar
        left={
          <Link to="/settings" className="icon-button" aria-label="Settings">
            <GearIcon size={20} />
          </Link>
        }
        right={
          <button type="button" className="icon-button" aria-label="New note" onClick={() => setPicking(true)}>
            <PlusIcon size={24} />
          </button>
        }
      />
      <div className="page-scroll">
        <h1 className="notes-title">Notes</h1>
        <label className="notes-search">
          <SearchIcon size={14} />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <XCircleFillIcon size={16} />
            </button>
          )}
        </label>

        {notes && visible.length === 0 && (
          <div className="notes-empty">
            <p>{searching ? 'No results' : 'No notes'}</p>
            {!searching && (
              <button type="button" className="notes-empty-button" onClick={() => setPicking(true)}>
                Create one
              </button>
            )}
          </div>
        )}

        {sections.map((s) => (
          <section key={s.label} className="notes-section">
            <h2 className="notes-section-label">{s.label}</h2>
            <ul className="notes-rows">
              {s.notes.map((note) => {
                const kind = kindOf(note.type)
                return (
                  <li key={note.id}>
                    <SwipeRow
                      open={openRow === note.id}
                      onOpenChange={(o) => setOpenRow(o ? note.id : null)}
                      actions={[
                        { label: 'Rename', icon: <PencilIcon size={18} />, color: 'var(--swipe-gray)', onSelect: () => handleRename(note) },
                        { label: 'Delete', icon: <TrashIcon size={18} />, color: 'var(--red)', onSelect: () => handleDelete(note) },
                      ]}
                    >
                      <Link
                        to={`/notes/${note.id}`}
                        replace={!!selectedId}
                        className={'note-row' + (note.id === selectedId ? ' selected' : '')}
                      >
                        <span className="note-row-top">
                          <span className="note-row-title">{noteTitle(note)}</span>
                          <span className="note-row-date">
                            {kind.type !== 'note' && <span className="note-row-kind">{kind.label} · </span>}
                            {format(note.updatedAt, 'd MMM', { locale: enAU })}
                          </span>
                        </span>
                        <span className="note-row-preview">{notePreview(note)}</span>
                      </Link>
                    </SwipeRow>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
        {notes && notes.length > 0 && !searching && (
          <p className="notes-count">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </p>
        )}
      </div>

      {picking && (
        <Sheet
          title="New"
          onClose={() => setPicking(false)}
          left={
            <button type="button" className="text-button" onClick={() => setPicking(false)}>
              Cancel
            </button>
          }
        >
          <ul className="kind-picker" aria-label="Choose a type of note">
            {NOTE_KINDS.map((k) => {
              const Icon = k.icon
              return (
                <li key={k.type}>
                  <button type="button" className="kind-option" onClick={() => create(k.type)}>
                    <Icon size={22} />
                    <span className="kind-text">
                      <span className="kind-label">{k.label}</span>
                      <span className="kind-desc">{k.description}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Sheet>
      )}
    </div>
  )
}
