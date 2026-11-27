import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { EditorContent, useEditor, type Content, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ActionMenu } from '../../components/ActionMenu'
import { useDialogs } from '../../components/dialogs'
import { ChevronLeftIcon, EllipsisCircleIcon, PencilIcon, TrashIcon } from '../../components/Icons'
import { NavBar } from '../../components/NavBar'
import type { Note } from '../../db/db'
import { FormatToolbar } from './FormatToolbar'
import { DraftBody } from './kinds/DraftBody'
import { ListBody } from './kinds/ListBody'
import { MoneyBody } from './kinds/MoneyBody'
import { PlanBody } from './kinds/PlanBody'
import { kindOf } from './kinds/registry'
import { ScoreBody } from './kinds/ScoreBody'
import { TableBody } from './kinds/TableBody'
import type { BodyProps } from './kinds/types'
import { editorDate } from './noteDates'
import { deleteNote, getNote, noteTitle, updateNote } from './notesRepo'

const SAVE_DELAY_MS = 400
type Patch = Partial<Pick<Note, 'title' | 'content' | 'text' | 'data'>>

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

  if (note === undefined) return <div className="page note-editor" />
  if (note === null) {
    return (
      <div className="page note-editor">
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
      <ChevronLeftIcon size={18} />
      <span>Notes</span>
    </button>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BODIES: Record<string, (p: BodyProps<any>) => ReactNode> = {
  table: TableBody,
  money: MoneyBody,
  list: ListBody,
  score: ScoreBody,
  draft: DraftBody,
  plan: PlanBody,
}

function LoadedEditor({ id, note, showBack, onClose }: Props & { note: Note }) {
  const { confirm } = useDialogs()
  const location = useLocation()
  const isNew = (location.state as { isNew?: boolean } | null)?.isNew === true
  const kind = kindOf(note.type)
  const isRich = kind.type === 'note'

  const [title, setTitle] = useState(note.title)
  const [data, setData] = useState<unknown>(() => note.data ?? (isRich ? null : kind.initial()))
  const [editedAt, setEditedAt] = useState(note.updatedAt)
  const [editing, setEditing] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const richEditor = useRef<Editor | null>(null)
  const deleted = useRef(false)

  // ---- Autosave: batch changes and write them shortly after typing stops.
  const pending = useRef<Patch>({})
  const timer = useRef<number | undefined>(undefined)
  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const patch = pending.current
    pending.current = {}
    if (!deleted.current && Object.keys(patch).length) void updateNote(id, patch)
  }, [id])
  const queueSave = useCallback(
    (patch: Patch) => {
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

  const onDataChange = useCallback(
    (next: unknown) => {
      setData(next)
      queueSave({ data: next, text: kind.summary(next) })
    },
    [kind, queueSave],
  )

  // ---- Title (auto-growing)
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
    richEditor.current?.commands.blur()
    ;(document.activeElement as HTMLElement | null)?.blur()
    setEditing(false)
  }

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete “${noteTitle({ title, text: richEditor.current?.getText() ?? kind.summary(data), type: note.type })}”?`,
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

  const header = (
    <>
      <p className="note-date">
        {!isRich && <span className="note-kind">{kind.label} · </span>}
        {editorDate(editedAt)}
      </p>
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
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (richEditor.current) richEditor.current.commands.focus('start')
            else titleRef.current?.blur()
          }
        }}
      />
    </>
  )

  const Body = BODIES[kind.type]

  return (
    <div
      className={`page note-editor kind-${kind.type}`}
      onFocus={() => setEditing(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditing(false)
      }}
    >
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
              trigger={<EllipsisCircleIcon size={22} />}
              items={[
                {
                  label: 'Rename',
                  icon: <PencilIcon size={18} />,
                  onSelect: () => {
                    titleRef.current?.focus()
                    titleRef.current?.select()
                  },
                },
                { label: 'Delete', icon: <TrashIcon size={18} />, destructive: true, onSelect: handleDelete },
              ]}
            />
          </>
        }
      />
      {isRich ? (
        <RichBody note={note} header={header} editing={editing} onSave={queueSave} onReady={(ed) => (richEditor.current = ed)} onDone={stopEditing} />
      ) : (
        <div className="page-scroll note-scroll">
          {header}
          <Body data={data} onChange={onDataChange} title={title} />
        </div>
      )}
    </div>
  )
}

/** The original rich-text note: headings, bold, italics, lists and checklists. */
function RichBody({
  note,
  header,
  editing,
  onSave,
  onReady,
  onDone,
}: {
  note: Note
  header: ReactNode
  editing: boolean
  onSave: (p: Patch) => void
  onReady: (e: Editor) => void
  onDone: () => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: (note.content as Content) ?? '',
    editorProps: { attributes: { class: 'note-body', 'aria-label': 'Note text' } },
    onUpdate: ({ editor: e }) => onSave({ content: e.getJSON(), text: e.getText({ blockSeparator: '\n' }) }),
  })
  useEffect(() => {
    if (editor) onReady(editor)
  }, [editor, onReady])

  return (
    <>
      <div className="page-scroll note-scroll">
        {header}
        <EditorContent editor={editor} />
      </div>
      {editor && <FormatToolbar editor={editor} editing={editing} onDone={onDone} />}
    </>
  )
}
