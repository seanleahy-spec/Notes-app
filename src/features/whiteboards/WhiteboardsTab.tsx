import { useEffect, useState } from 'react'
import { Route, Routes, useParams } from 'react-router-dom'
import { useHideTabBar } from '../../app/shell'
import { NavBar } from '../../components/NavBar'
import type { Whiteboard } from '../../db/db'
import { BoardEditor } from './BoardEditor'
import { BoardList } from './BoardList'
import { getBoard } from './boardsRepo'
import './whiteboards.css'

export default function WhiteboardsTab() {
  return (
    <Routes>
      <Route index element={<BoardList />} />
      <Route path=":boardId" element={<BoardRoute />} />
    </Routes>
  )
}

function BoardRoute() {
  const { boardId } = useParams()
  const [board, setBoard] = useState<Whiteboard | null | undefined>(undefined)
  useHideTabBar(true)

  useEffect(() => {
    let cancelled = false
    setBoard(undefined)
    if (boardId) void getBoard(boardId).then((b) => !cancelled && setBoard(b ?? null))
    return () => {
      cancelled = true
    }
  }, [boardId])

  if (board === undefined) return <div className="page theme-minimal" />
  if (board === null) {
    return (
      <div className="page theme-minimal">
        <NavBar />
        <div className="wb-empty">
          <p>This whiteboard no longer exists</p>
        </div>
      </div>
    )
  }
  return <BoardEditor key={board.id} board={board} />
}
