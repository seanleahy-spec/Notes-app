import { useEffect } from 'react'
import { Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { useHideTabBar } from '../../app/shell'
import { useIsWide } from '../../hooks/useMediaQuery'
import { NoteEditor } from './NoteEditor'
import { NotesList } from './NotesList'
import { deleteEmptyNotes } from './notesRepo'
import './notes.css'

export default function NotesTab() {
  return (
    <Routes>
      <Route index element={<NotesScreen />} />
      <Route path=":noteId" element={<NotesScreen />} />
    </Routes>
  )
}

/** Phone: list OR note. iPad/desktop: list and note side by side. */
function NotesScreen() {
  const { noteId } = useParams()
  const wide = useIsWide()
  const navigate = useNavigate()

  useHideTabBar(!wide && !!noteId)

  // Clean up blank notes you left without typing anything.
  useEffect(() => {
    void deleteEmptyNotes(noteId)
  }, [noteId])

  const editor = noteId ? (
    <NoteEditor key={noteId} id={noteId} showBack={!wide} onClose={() => navigate('/notes')} />
  ) : null

  if (!wide) {
    return <div className="theme-minimal notes-root">{editor ?? <NotesList />}</div>
  }

  return (
    <div className="theme-minimal notes-root notes-split">
      <div className="notes-split-list">
        <NotesList selectedId={noteId} />
      </div>
      <div className="notes-split-detail">
        {editor ?? (
          <div className="notes-empty">
            <p>No note selected</p>
          </div>
        )}
      </div>
    </div>
  )
}
