import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { EditorContent, useEditor, type Content } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ActionMenu } from '../../components/ActionMenu'
import { useDialogs } from '../../components/dialogs'
import { ChevronLeftIcon, EllipsisCircleIcon, PencilIcon, TrashIcon } from '../../components/Icons'
import { NavBar } from '../../components/NavBar'
import type { Note } from '../../db/db'
import { FormatToolbar } from './FormatToolbar'
import { editorDate } from './noteDates'
import { deleteNote, getNote, noteTitle, updateNote } from './notesRepo'

const SAVE_DELAY_MS = 400

interface Props {
  id: string
  showBack: boolean
  onClose: () => void
}

/** Loads a note, then hands it to the editor. */
export function NoteEditor(props: Props) {
  const [note, setNote] = useState<Note | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    getNote(props.id).then((n) => !cancelled && setNote(n ?? null))
    return () => {
      cancelled = true
    }
  }, [props.id])

  if (note === undefined) return <div className="page" />
  if (note === null) {
    return (
      <div className="page">
        <NavBar left={props.showBack && <BackButton onClick={props.onClose} />} />
        <div className="empty-state">
          <p>This note no longer exists.</p>
        </div>
      </div>
    )
  }
  return <LoadedEditor {...props} note={note} />
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="back-button" onClick={onClick}>
      <ChevronLeftIcon size={22} />
      <span>Notes</span>
    </button>
  )
}

function LoadedEditor({ id, note, showBack, onClose }: Props & { note: Note }) {
  const { confirm } = useDialogs()
  const location = useLocation()
  const isNew = (location.state as { isNew?: boolean } | null)?.isNew === true

  const [title, setTitle] = useState(note.title)
  const [editedAt, setEditedAt] = useState(note.updatedAt)
  const [editing, setEditing] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const deleted = useRef(false)

  // ---- Autosave: batch changes and write them shortly after typing stops.
  const pending = useRef<Partial<Pick<Note, 'title' | 'content' | 'text'>>>({})
  const timer = useRef<number | undefined>(undefined)

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const patch = pending.current
    pending.current = {}
    if (!deleted.current && Object.keys(patch).length) void updateNote(id, patch)
  }, [id])

  const queueSave = useCallback(
    (patch: Partial<Pick<Note, 'title' | 'content' | 'text'>>) => {
      Object.assign(pending.current, patch)
      setEditedAt(Date.now())
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, SAVE_DELAY_MS)
    },
    [flush],
  )

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  // ---- Rich-text body
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: (note.content as Content) ?? '',
    editorProps: { attributes: { class: 'note-body', 'aria-label': 'Note text' } },
    onUpdate: ({ editor: e }) => queueSave({ content: e.getJSON(), text: e.getText({ blockSeparator: '\n' }) }),
    onFocus: () => setEditing(true),
    onBlur: () => setEditing(document.activeElement === titleRef.current),
  })

  // ---- Title (auto-growing textarea)
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  useEffect(() => {
    if (isNew) titleRef.current?.focus()
  }, [isNew])

  const stopEditing = () => {
    flush()
    editor?.commands.blur()
    titleRef.current?.blur()
    ;(document.activeElement as HTMLElement | null)?.blur()
    setEditing(false)
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete “${noteTitle({ title, text: editor?.getText() ?? '' })}”?`,
      message: 'This note will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    deleted.current = true
    window.clearTimeout(timer.current)
    await deleteNote(id)
    onClose()
  }

  const handleRename = () => {
    const el = titleRef.current
    if (!el) return
    el.focus()
    el.select()
  }

  return (
    <div className="page note-editor">
      <NavBar
        left={showBack && <BackButton onClick={onClose} />}
        right={
          <>
            {editing && (
              <button type="button" className="text-button bold" onClick={stopEditing}>
                Done
              </button>
            )}
            <ActionMenu
              label="Note options"
              trigger={<EllipsisCircleIcon size={24} />}
              items={[
                { label: 'Rename', icon: <PencilIcon size={18} />, onSelect: handleRename },
                { label: 'Delete', icon: <TrashIcon size={18} />, destructive: true, onSelect: handleDelete },
              ]}
            />
          </>
        }
      />
      <div className="page-scroll note-scroll">
        <p className="note-date">{editorDate(editedAt)}</p>
        <textarea
          ref={titleRef}
          className="note-title"
          rows={1}
          placeholder="Title"
          aria-label="Note title"
          value={title}
          onChange={(e) => {
            const value = e.target.value.replace(/\n/g, ' ')
            setTitle(value)
            queueSave({ title: value })
          }}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(!!editor?.isFocused)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              editor?.commands.focus('start')
            }
          }}
        />
        <EditorContent editor={editor} />
      </div>
      {editor && <FormatToolbar editor={editor} editing={editing} onDone={stopEditing} />}
    </div>
  )
}
