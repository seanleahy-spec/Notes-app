import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { Link, useNavigate } from 'react-router-dom'
import { ActionMenu } from '../../components/ActionMenu'
import { useDialogs } from '../../components/dialogs'
import { EllipsisCircleIcon, PlusIcon } from '../../components/Icons'
import { NavBar } from '../../components/NavBar'
import type { Whiteboard } from '../../db/db'
import { BoardPreview } from './BoardPreview'
import { createBoard, deleteBoard, renameBoard, useBoards } from './boardsRepo'

export function BoardList() {
  const boards = useBoards()
  const navigate = useNavigate()
  const { prompt, confirm } = useDialogs()

  const create = async () => {
    const id = await createBoard()
    navigate(`/whiteboards/${id}`)
  }
  const rename = async (b: Whiteboard) => {
    const name = await prompt({ title: 'Rename Whiteboard', initialValue: b.name, placeholder: 'Name', confirmLabel: 'Save' })
    if (name !== null) await renameBoard(b.id, name)
  }
  const remove = async (b: Whiteboard) => {
    const ok = await confirm({
      title: `Delete “${b.name}”?`,
      message: 'This whiteboard will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (ok) await deleteBoard(b.id)
  }

  return (
    <div className="page wb-list-page theme-minimal">
      <NavBar
        right={
          <button type="button" className="icon-button" aria-label="New whiteboard" onClick={create}>
            <PlusIcon size={24} />
          </button>
        }
      />
      <div className="page-scroll">
        <h1 className="wb-list-title">Whiteboards</h1>
        {boards && boards.length === 0 && (
          <div className="wb-empty">
            <p>No whiteboards</p>
            <button type="button" className="wb-empty-button" onClick={create}>
              Create one
            </button>
          </div>
        )}
        <ul className="wb-grid">
          {boards?.map((b) => (
            <li key={b.id} className="wb-card">
              <Link to={`/whiteboards/${b.id}`} className="wb-card-link" aria-label={`Open ${b.name}`}>
                <BoardPreview elements={b.elements} />
              </Link>
              <div className="wb-card-meta">
                <Link to={`/whiteboards/${b.id}`} className="wb-card-text">
                  <span className="wb-card-name">{b.name}</span>
                  <span className="wb-card-date">{format(b.updatedAt, 'd MMM yyyy', { locale: enAU })}</span>
                </Link>
                <ActionMenu
                  label={`Options for ${b.name}`}
                  trigger={<EllipsisCircleIcon size={20} />}
                  items={[
                    { label: 'Rename', onSelect: () => rename(b) },
                    { label: 'Delete', destructive: true, onSelect: () => remove(b) },
                  ]}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
