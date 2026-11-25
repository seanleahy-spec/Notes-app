import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDialogs } from '../../components/dialogs'
import { ComposeIcon, GearIcon, PencilIcon, SearchIcon, TrashIcon, XCircleFillIcon } from '../../components/Icons'
import { primeKeyboard } from '../../components/keyboard'
import { NavBar } from '../../components/NavBar'
import { SwipeRow } from '../../components/SwipeRow'
import type { Note } from '../../db/db'
import { groupLabel, listDate } from './noteDates'
import { createNote, deleteNote, noteMatches, notePreview, noteTitle, renameNote, useNotes } from './notesRepo'

export function NotesList({ selectedId }: { selectedId?: string }) {
  const notes = useNotes()
  const navigate = useNavigate()
  const { confirm, prompt } = useDialogs()
  const [query, setQuery] = useState('')
  const [openRow, setOpenRow] = useState<string | null>(null)

  const searching = query.trim() !== ''
  const visible = useMemo(() => (notes ?? []).filter((n) => noteMatches(n, query)), [notes, query])

  const sections = useMemo(() => {
    if (searching) return [{ label: 'Results', notes: visible }]
    const out: { label: string; notes: Note[] }[] = []
    const now = Date.now()
    for (const n of visible) {
      const label = groupLabel(n.updatedAt, now)
      const last = out[out.length - 1]
      if (last?.label === label) last.notes.push(n)
      else out.push({ label, notes: [n] })
    }
    return out
  }, [visible, searching])

  const handleCreate = async () => {
    primeKeyboard()
    const id = await createNote()
    setQuery('')
    navigate(`/notes/${id}`, { state: { isNew: true } })
  }

  const handleRename = async (note: Note) => {
    const title = await prompt({
      title: 'Rename Note',
      initialValue: noteTitle(note) === 'New Note' ? '' : noteTitle(note),
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

  const now = Date.now()

  return (
    <div className="page notes-list-page">
      <NavBar
        right={
          <Link to="/settings" className="icon-button" aria-label="Settings">
            <GearIcon size={22} />
          </Link>
        }
      />
      <div className="page-scroll">
        <h1 className="large-title">Notes</h1>
        <div className="search-field">
          <SearchIcon size={16} />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <XCircleFillIcon size={17} />
            </button>
          )}
        </div>

        {notes && visible.length === 0 && (
          <div className="empty-state">
            <p>{searching ? 'No Results' : 'No Notes'}</p>
            {!searching && <small>Tap the compose button to create one.</small>}
          </div>
        )}

        {sections.map((section) => (
          <section key={section.label} className="list-section">
            <h2 className="list-section-header">{section.label}</h2>
            <ul className="grouped-list">
              {section.notes.map((note) => (
                <li key={note.id}>
                  <SwipeRow
                    open={openRow === note.id}
                    onOpenChange={(o) => setOpenRow(o ? note.id : null)}
                    actions={[
                      { label: 'Rename', icon: <PencilIcon size={20} />, color: 'var(--gray-action)', onSelect: () => handleRename(note) },
                      { label: 'Delete', icon: <TrashIcon size={20} />, color: 'var(--red)', onSelect: () => handleDelete(note) },
                    ]}
                  >
                    <Link
                      to={`/notes/${note.id}`}
                      replace={!!selectedId}
                      className={'note-row' + (note.id === selectedId ? ' selected' : '')}
                    >
                      <span className="note-row-title">{noteTitle(note)}</span>
                      <span className="note-row-detail">
                        <span className="note-row-date">{listDate(note.updatedAt, now)}</span>
                        <span className="note-row-preview">{notePreview(note)}</span>
                      </span>
                    </Link>
                  </SwipeRow>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <footer className="bottom-toolbar">
        <span />
        <span className="bottom-toolbar-label">
          {notes ? `${notes.length} ${notes.length === 1 ? 'Note' : 'Notes'}` : ''}
        </span>
        <button type="button" className="icon-button" aria-label="New note" onClick={handleCreate}>
          <ComposeIcon size={25} />
        </button>
      </footer>
    </div>
  )
}
