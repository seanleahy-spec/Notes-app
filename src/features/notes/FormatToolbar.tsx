import { useEditorState, type Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { BulletListIcon, ChecklistIcon, KeyboardDismissIcon, NumberListIcon } from '../../components/Icons'

export function FormatToolbar({ editor, editing, onDone }: { editor: Editor; editing: boolean; onDone: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
    }),
  })

  const chain = () => editor.chain().focus()

  return (
    <div className="format-toolbar" role="toolbar" aria-label="Formatting">
      <ToolButton label="Title" active={s.h1} onPress={() => chain().toggleHeading({ level: 1 }).run()}>
        <span className="tool-text tool-h1">H1</span>
      </ToolButton>
      <ToolButton label="Heading" active={s.h2} onPress={() => chain().toggleHeading({ level: 2 }).run()}>
        <span className="tool-text tool-h2">H2</span>
      </ToolButton>
      <ToolButton label="Bold" active={s.bold} onPress={() => chain().toggleBold().run()}>
        <span className="tool-text tool-bold">B</span>
      </ToolButton>
      <ToolButton label="Italic" active={s.italic} onPress={() => chain().toggleItalic().run()}>
        <span className="tool-text tool-italic">I</span>
      </ToolButton>
      <ToolButton label="Bulleted list" active={s.bullet} onPress={() => chain().toggleBulletList().run()}>
        <BulletListIcon size={22} />
      </ToolButton>
      <ToolButton label="Numbered list" active={s.ordered} onPress={() => chain().toggleOrderedList().run()}>
        <NumberListIcon size={22} />
      </ToolButton>
      <ToolButton label="Checklist" active={s.task} onPress={() => chain().toggleTaskList().run()}>
        <ChecklistIcon size={22} />
      </ToolButton>
      {editing && (
        <ToolButton label="Hide keyboard" onPress={onDone}>
          <KeyboardDismissIcon size={22} />
        </ToolButton>
      )}
    </div>
  )
}

function ToolButton({
  label,
  active,
  onPress,
  children,
}: {
  label: string
  active?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={'tool-button' + (active ? ' active' : '')}
      aria-label={label}
      aria-pressed={active}
      title={label}
      // Keep the text cursor where it is when tapping a toolbar button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
    >
      {children}
    </button>
  )
}
