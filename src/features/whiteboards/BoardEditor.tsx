import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionMenu } from '../../components/ActionMenu'
import { useDialogs } from '../../components/dialogs'
import {
  ArrowToolIcon,
  ChevronLeftIcon,
  CursorIcon,
  DiamondIcon,
  DuplicateIcon,
  EllipseIcon,
  EllipsisCircleIcon,
  FitIcon,
  PenIcon,
  RectIcon,
  RedoIcon,
  ShapesIcon,
  StickyIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
} from '../../components/Icons'
import { primeKeyboard } from '../../components/keyboard'
import { newId, type Whiteboard } from '../../db/db'
import { deleteBoard, renameBoard, saveElements, saveViewport } from './boardsRepo'
import { ElementView, strokePath } from './ElementView'
import {
  bounds,
  dist,
  moveElement,
  normaliseStroke,
  resizeElement,
  unionBounds,
  type Handle,
  type Point,
} from './geometry'
import { inkCss, INK_COLORS, STICKY_COLORS } from './palette'
import type { ShapeKind, WbElement } from './types'

const MIN_ZOOM = 0.05
const MAX_ZOOM = 4
const SAVE_DELAY_MS = 400
const HISTORY_LIMIT = 100

type Tool = 'select' | 'pen' | 'text' | 'sticky' | 'shape' | 'arrow'
interface Viewport {
  /** Screen position of the world origin. */
  x: number
  y: number
  zoom: number
}

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'pinch'; d0: number; z0: number; w0: Point }
  | { kind: 'move'; id: string; start: Point; orig: WbElement }
  | { kind: 'resize'; handle: Handle; orig: WbElement }
  | { kind: 'draw'; pts: number[][]; pen: boolean }
  | { kind: 'create'; start: Point; id: string | null }
  | { kind: 'place' }

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

const TOOLS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
  { tool: 'select', label: 'Select', icon: <CursorIcon size={22} /> },
  { tool: 'pen', label: 'Pen', icon: <PenIcon size={22} /> },
  { tool: 'text', label: 'Text', icon: <TextIcon size={22} /> },
  { tool: 'sticky', label: 'Sticky note', icon: <StickyIcon size={22} /> },
  { tool: 'shape', label: 'Shape', icon: <ShapesIcon size={22} /> },
  { tool: 'arrow', label: 'Arrow', icon: <ArrowToolIcon size={22} /> },
]

const SHAPES: { shape: ShapeKind; label: string; icon: React.ReactNode }[] = [
  { shape: 'rect', label: 'Rectangle', icon: <RectIcon size={20} /> },
  { shape: 'ellipse', label: 'Ellipse', icon: <EllipseIcon size={20} /> },
  { shape: 'diamond', label: 'Diamond', icon: <DiamondIcon size={20} /> },
]

export function BoardEditor({ board }: { board: Whiteboard }) {
  const navigate = useNavigate()
  const { prompt, confirm } = useDialogs()
  const [name, setName] = useState(board.name)

  // ---------- Elements + undo history ----------
  const [els, setEls] = useState<WbElement[]>(board.elements ?? [])
  const elsRef = useRef(els)
  const past = useRef<WbElement[][]>([])
  const future = useRef<WbElement[][]>([])
  const snapshot = useRef<WbElement[] | null>(null)
  const [, setHistoryTick] = useState(0)

  const setLive = useCallback((next: WbElement[]) => {
    elsRef.current = next
    setEls(next)
  }, [])
  const pushHistory = (before: WbElement[]) => {
    past.current.push(before)
    if (past.current.length > HISTORY_LIMIT) past.current.shift()
    future.current = []
    setHistoryTick((t) => t + 1)
  }
  const commit = (next: WbElement[]) => {
    pushHistory(elsRef.current)
    setLive(next)
  }
  const beginChange = () => {
    snapshot.current = elsRef.current
  }
  const endChange = () => {
    if (snapshot.current && snapshot.current !== elsRef.current) pushHistory(snapshot.current)
    snapshot.current = null
  }

  // ---------- Selection / editing ----------
  const [selectedId, setSelectedIdState] = useState<string | null>(null)
  const selectedRef = useRef<string | null>(null)
  const select = (id: string | null) => {
    selectedRef.current = id
    setSelectedIdState(id)
  }
  const [editingId, setEditingIdState] = useState<string | null>(null)
  const editingRef = useRef<string | null>(null)
  const editSnapshot = useRef<WbElement[] | null>(null)
  const [heights, setHeights] = useState<Record<string, number>>({})
  const heightsRef = useRef(heights)
  heightsRef.current = heights

  // ---------- Tools ----------
  const [tool, setToolState] = useState<Tool>('select')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect')
  const [inkColor, setInkColor] = useState('ink')
  const [stickyColor, setStickyColor] = useState('yellow')
  const setTool = (t: Tool) => {
    setToolState(t)
    if (t !== 'select') select(null)
  }

  // ---------- Viewport ----------
  const viewportRef = useRef<HTMLDivElement>(null)
  const [vp, setVpState] = useState<Viewport | null>(null)
  const vpRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 })
  const vpSaveTimer = useRef<number | undefined>(undefined)

  const size = () => {
    const r = viewportRef.current?.getBoundingClientRect()
    return { w: r?.width ?? window.innerWidth, h: r?.height ?? window.innerHeight }
  }
  const saveVp = useCallback(() => {
    const v = vpRef.current
    const { w, h } = size()
    void saveViewport(board.id, { cx: (w / 2 - v.x) / v.zoom, cy: (h / 2 - v.y) / v.zoom, zoom: v.zoom })
  }, [board.id])
  const setVp = useCallback(
    (next: Viewport) => {
      vpRef.current = next
      setVpState(next)
      window.clearTimeout(vpSaveTimer.current)
      vpSaveTimer.current = window.setTimeout(saveVp, 600)
    },
    [saveVp],
  )

  // Restore the saved camera (or centre the origin at 100%).
  useLayoutEffect(() => {
    const { w, h } = size()
    const v = board.viewport
    const zoom = v ? clampZoom(v.zoom) : 1
    const next = v ? { zoom, x: w / 2 - v.cx * zoom, y: h / 2 - v.cy * zoom } : { zoom: 1, x: w / 2, y: h / 2 }
    vpRef.current = next
    setVpState(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const screenPoint = (e: { clientX: number; clientY: number }): Point => {
    const r = viewportRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const toWorld = (p: Point): Point => {
    const v = vpRef.current
    return { x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom }
  }
  const zoomAt = useCallback(
    (screen: Point, zoom: number) => {
      const v = vpRef.current
      const z = clampZoom(zoom)
      setVp({ zoom: z, x: screen.x - ((screen.x - v.x) * z) / v.zoom, y: screen.y - ((screen.y - v.y) * z) / v.zoom })
    },
    [setVp],
  )
  const fitAll = () => {
    const { w, h } = size()
    const box = unionBounds(elsRef.current, heightsRef.current)
    if (!box) return setVp({ zoom: 1, x: w / 2, y: h / 2 })
    const zoom = clampZoom(Math.min((w * 0.85) / Math.max(box.w, 1), (h * 0.75) / Math.max(box.h, 1), 1))
    setVp({ zoom, x: w / 2 - (box.x + box.w / 2) * zoom, y: h / 2 - (box.y + box.h / 2) * zoom })
  }

  // ---------- Autosave ----------
  const savedEls = useRef(board.elements)
  const saveTimer = useRef<number | undefined>(undefined)
  const flushSave = useCallback(() => {
    window.clearTimeout(saveTimer.current)
    if (elsRef.current !== savedEls.current) {
      savedEls.current = elsRef.current
      void saveElements(board.id, elsRef.current)
    }
  }, [board.id])
  useEffect(() => {
    if (els === savedEls.current) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(flushSave, SAVE_DELAY_MS)
  }, [els, flushSave])
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        flushSave()
        saveVp()
      }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushSave)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushSave)
      flushSave()
      window.clearTimeout(vpSaveTimer.current)
      saveVp()
    }
  }, [flushSave, saveVp])

  // ---------- Editing text ----------
  const startEditing = (id: string) => {
    primeKeyboard()
    editSnapshot.current = elsRef.current
    editingRef.current = id
    select(id)
    setEditingIdState(id)
  }
  const finishEditing = () => {
    const id = editingRef.current
    if (!id) return
    editingRef.current = null
    setEditingIdState(null)
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    const el = elsRef.current.find((e) => e.id === id)
    const emptyText = el?.type === 'text' && !el.text.trim()
    if (emptyText) {
      // Empty text boxes disappear when you stop editing.
      setLive(elsRef.current.filter((e) => e.id !== id))
      select(null)
    } else if (el?.type === 'text' && heightsRef.current[id]) {
      setLive(elsRef.current.map((e) => (e.id === id ? { ...e, h: heightsRef.current[id] } : e)))
    }
    // Record the edit as one undo step (an abandoned empty text box isn't worth one).
    if (!emptyText && editSnapshot.current && editSnapshot.current !== elsRef.current) pushHistory(editSnapshot.current)
    editSnapshot.current = null
  }
  const onText = useCallback(
    (id: string, text: string) => setLive(elsRef.current.map((e) => (e.id === id && 'text' in e ? { ...e, text } : e))),
    [setLive],
  )
  const onMeasure = useCallback((id: string, h: number) => {
    setHeights((prev) => (Math.abs((prev[id] ?? -1) - h) < 0.5 ? prev : { ...prev, [id]: h }))
  }, [])

  // Keep the text being edited above the keyboard.
  useEffect(() => {
    if (!editingId) return
    const t = window.setTimeout(() => {
      const el = elsRef.current.find((e) => e.id === editingId)
      if (!el) return
      const v = vpRef.current
      const b = bounds(el, heightsRef.current)
      const { h } = size()
      const bottom = (b.y + Math.min(b.h, 160 / v.zoom)) * v.zoom + v.y
      const top = b.y * v.zoom + v.y
      if (bottom > h - 24) setVp({ ...v, y: v.y - (bottom - (h - 24)) })
      else if (top < 12) setVp({ ...v, y: v.y + (12 - top) })
    }, 350)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  // ---------- Element factories (sizes scale with zoom so they look the same on screen) ----------
  const z = () => vpRef.current.zoom
  const makeText = (p: Point): WbElement => ({
    id: newId(), type: 'text', x: p.x, y: p.y - 16 / z(), w: 280 / z(), h: 32 / z(), fontSize: 24 / z(), text: '', color: inkColor,
  })
  const makeSticky = (p: Point): WbElement => ({
    id: newId(), type: 'sticky', x: p.x - 100 / z(), y: p.y - 100 / z(), w: 200 / z(), h: 200 / z(), text: '', color: stickyColor,
  })
  const shapeFromDrag = (id: string, a: Point, b: Point): WbElement => ({
    id, type: 'shape', shape: shapeKind, color: inkColor, strokeWidth: 2.5 / z(),
    x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y),
  })
  const arrowFromDrag = (id: string, a: Point, b: Point): WbElement => ({
    id, type: 'arrow', color: inkColor, strokeWidth: 2.5 / z(), x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y,
  })

  // ---------- Pointer gestures ----------
  const pointers = useRef(new Map<number, Point>())
  const gesture = useRef<Gesture | null>(null)
  const down = useRef<{ sp: Point; wp: Point; t: number; id: string | null; wasSelected: boolean } | null>(null)
  const [draft, setDraft] = useState<{ pts: number[][]; pen: boolean } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    const target = e.target as Element
    if (target.closest('textarea')) return
    e.preventDefault()
    viewportRef.current?.setPointerCapture(e.pointerId)
    const sp = screenPoint(e)
    pointers.current.set(e.pointerId, sp)
    if (editingRef.current) finishEditing()

    if (pointers.current.size === 2) {
      // Second finger: switch to pinch-zoom / pan, abandoning any stroke in progress.
      const g = gesture.current
      if (g?.kind === 'draw') setDraft(null)
      if (g && (g.kind === 'move' || g.kind === 'resize' || g.kind === 'create')) endChange()
      const [a, b] = [...pointers.current.values()]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      gesture.current = { kind: 'pinch', d0: Math.max(dist(a, b), 1), z0: vpRef.current.zoom, w0: toWorld(mid) }
      down.current = null
      return
    }
    if (pointers.current.size > 2) return

    const wp = toWorld(sp)
    const handle = (target.closest('[data-handle]') as HTMLElement | null)?.dataset.handle as Handle | undefined
    const elId = (target.closest('[data-el-id]') as HTMLElement | null)?.dataset.elId ?? null
    down.current = { sp, wp, t: Date.now(), id: elId, wasSelected: !!elId && elId === selectedRef.current }

    if (handle && selectedRef.current) {
      const orig = elsRef.current.find((el) => el.id === selectedRef.current)
      if (orig) {
        beginChange()
        gesture.current = { kind: 'resize', handle, orig }
        return
      }
    }

    switch (tool) {
      case 'pen': {
        const pts = [[wp.x, wp.y, e.pointerType === 'pen' ? e.pressure : 0.5]]
        gesture.current = { kind: 'draw', pts, pen: e.pointerType === 'pen' }
        setDraft({ pts, pen: e.pointerType === 'pen' })
        return
      }
      case 'shape':
      case 'arrow':
        gesture.current = { kind: 'create', start: wp, id: null }
        return
      case 'text':
      case 'sticky':
        gesture.current = { kind: 'place' }
        return
      default: {
        const el = elId ? elsRef.current.find((x) => x.id === elId) : undefined
        if (el) {
          select(el.id)
          beginChange()
          gesture.current = { kind: 'move', id: el.id, start: wp, orig: el }
        } else {
          select(null)
          const v = vpRef.current
          gesture.current = { kind: 'pan', sx: sp.x, sy: sp.y, vx: v.x, vy: v.y }
        }
      }
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    const sp = screenPoint(e)
    pointers.current.set(e.pointerId, sp)
    const g = gesture.current
    if (!g) return

    if (g.kind === 'pinch') {
      const [a, b] = [...pointers.current.values()]
      if (!b) return
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const zoom = clampZoom((g.z0 * dist(a, b)) / g.d0)
      setVp({ zoom, x: mid.x - g.w0.x * zoom, y: mid.y - g.w0.y * zoom })
      return
    }
    const wp = toWorld(sp)
    switch (g.kind) {
      case 'pan':
        setVp({ ...vpRef.current, x: g.vx + sp.x - g.sx, y: g.vy + sp.y - g.sy })
        break
      case 'move': {
        const dx = wp.x - g.start.x
        const dy = wp.y - g.start.y
        setLive(elsRef.current.map((el) => (el.id === g.id ? moveElement(g.orig, dx, dy) : el)))
        break
      }
      case 'resize':
        setLive(
          elsRef.current.map((el) =>
            el.id === g.orig.id ? resizeElement(g.orig, g.handle, wp, vpRef.current.zoom, heightsRef.current) : el,
          ),
        )
        break
      case 'draw': {
        const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
        for (const ce of events.length ? events : [e.nativeEvent]) {
          const p = toWorld(screenPoint(ce))
          g.pts.push([p.x, p.y, g.pen ? ce.pressure : 0.5])
        }
        setDraft({ pts: [...g.pts], pen: g.pen })
        break
      }
      case 'create': {
        if (!g.id) {
          if (!down.current || dist(sp, down.current.sp) < 6) return
          beginChange()
          g.id = newId()
          const el = tool === 'arrow' ? arrowFromDrag(g.id, g.start, wp) : shapeFromDrag(g.id, g.start, wp)
          setLive([...elsRef.current, el])
          select(g.id)
        } else {
          const id = g.id
          setLive(
            elsRef.current.map((el) =>
              el.id === id ? (tool === 'arrow' ? arrowFromDrag(id, g.start, wp) : shapeFromDrag(id, g.start, wp)) : el,
            ),
          )
        }
        break
      }
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const g = gesture.current
    if (g?.kind === 'pinch') {
      if (pointers.current.size === 0) gesture.current = null
      return
    }
    gesture.current = null
    const d = down.current
    down.current = null
    const sp = screenPoint(e)
    const isTap = !!d && dist(sp, d.sp) < 8 && Date.now() - d.t < 500

    switch (g?.kind) {
      case 'move': {
        endChange()
        if (isTap && d?.wasSelected) {
          const el = elsRef.current.find((x) => x.id === d.id)
          if (el && (el.type === 'text' || el.type === 'sticky')) startEditing(el.id)
        }
        break
      }
      case 'resize':
        endChange()
        break
      case 'draw': {
        setDraft(null)
        const { box, points } = normaliseStroke(g.pts)
        const el: WbElement = {
          id: newId(), type: 'draw', ...box, points, color: inkColor, strokeWidth: 3 / vpRef.current.zoom, pressure: g.pen,
        }
        commit([...elsRef.current, el])
        break
      }
      case 'create': {
        if (g.id) endChange()
        else if (d) {
          // Tap: drop a default-sized shape / arrow.
          const zz = vpRef.current.zoom
          const a = tool === 'arrow' ? d.wp : { x: d.wp.x - 80 / zz, y: d.wp.y - 60 / zz }
          const b = tool === 'arrow' ? { x: d.wp.x + 160 / zz, y: d.wp.y } : { x: d.wp.x + 80 / zz, y: d.wp.y + 60 / zz }
          const el = tool === 'arrow' ? arrowFromDrag(newId(), a, b) : shapeFromDrag(newId(), a, b)
          commit([...elsRef.current, el])
          select(el.id)
        }
        setToolState('select')
        break
      }
      case 'place': {
        if (!d) break
        const el = tool === 'text' ? makeText(d.wp) : makeSticky(d.wp)
        commit([...elsRef.current, el])
        setToolState('select')
        startEditing(el.id)
        break
      }
    }
  }

  const onPointerCancel = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (gesture.current?.kind === 'draw') setDraft(null)
    if (gesture.current && ['move', 'resize', 'create'].includes(gesture.current.kind)) endChange()
    if (pointers.current.size === 0) gesture.current = null
  }

  // Trackpad / mouse wheel: scroll to pan, pinch (ctrl+wheel) to zoom. Also stop Safari page zoom.
  useEffect(() => {
    const node = viewportRef.current
    if (!node) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) zoomAt(screenPoint(e), vpRef.current.zoom * Math.exp(-e.deltaY * 0.01))
      else setVp({ ...vpRef.current, x: vpRef.current.x - e.deltaX, y: vpRef.current.y - e.deltaY })
    }
    const stop = (e: Event) => e.preventDefault()
    node.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('gesturestart', stop)
    document.addEventListener('gesturechange', stop)
    return () => {
      node.removeEventListener('wheel', onWheel)
      document.removeEventListener('gesturestart', stop)
      document.removeEventListener('gesturechange', stop)
    }
  }, [zoomAt, setVp])

  // ---------- Actions ----------
  const selected = els.find((el) => el.id === selectedId) ?? null
  const undo = () => {
    finishEditing()
    const prev = past.current.pop()
    if (!prev) return
    future.current.push(elsRef.current)
    setLive(prev)
    if (selectedRef.current && !prev.some((e) => e.id === selectedRef.current)) select(null)
    setHistoryTick((t) => t + 1)
  }
  const redo = () => {
    finishEditing()
    const next = future.current.pop()
    if (!next) return
    past.current.push(elsRef.current)
    setLive(next)
    if (selectedRef.current && !next.some((e) => e.id === selectedRef.current)) select(null)
    setHistoryTick((t) => t + 1)
  }
  const deleteSelected = () => {
    const id = selectedRef.current
    if (!id) return
    editingRef.current = null
    setEditingIdState(null)
    commit(elsRef.current.filter((e) => e.id !== id))
    select(null)
  }
  const duplicateSelected = () => {
    const el = elsRef.current.find((e) => e.id === selectedRef.current)
    if (!el) return
    const off = 24 / vpRef.current.zoom
    const copy = { ...moveElement(el, off, off), id: newId() }
    commit([...elsRef.current, copy])
    select(copy.id)
  }
  const recolour = (color: string) => {
    const el = elsRef.current.find((e) => e.id === selectedRef.current)
    if (el) commit(elsRef.current.map((e) => (e.id === el.id ? { ...e, color } : e)))
    if (el?.type === 'sticky' || (!el && tool === 'sticky')) setStickyColor(color)
    else setInkColor(color)
  }

  // Keyboard (iPad keyboard / desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingRef.current || (e.target as HTMLElement).closest('input, textarea')) return
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedRef.current) {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const rename = async () => {
    const next = await prompt({ title: 'Rename Whiteboard', initialValue: name, placeholder: 'Name', confirmLabel: 'Save' })
    if (next === null) return
    const clean = next.trim() || 'Untitled'
    setName(clean)
    await renameBoard(board.id, clean)
  }
  const remove = async () => {
    const ok = await confirm({
      title: `Delete “${name}”?`,
      message: 'This whiteboard will be permanently deleted.',
      confirmLabel: 'Delete',
      destructive: true,
    })
    if (!ok) return
    savedEls.current = elsRef.current // nothing left to save
    await deleteBoard(board.id)
    navigate('/whiteboards')
  }

  // ---------- Render ----------
  const zoom = vp?.zoom ?? 1
  const dotGap = useMemo(() => {
    let gap = 24 * zoom
    while (gap < 14) gap *= 2
    return gap
  }, [zoom])

  const showColors: 'ink' | 'sticky' | null = selected
    ? selected.type === 'sticky'
      ? 'sticky'
      : 'ink'
    : tool === 'sticky'
      ? 'sticky'
      : tool === 'select'
        ? null
        : 'ink'
  const activeColor = selected ? selected.color : showColors === 'sticky' ? stickyColor : inkColor

  return (
    <div className="page wb-board theme-minimal">
      <header className="wb-topbar">
        <button type="button" className="wb-back" onClick={() => navigate('/whiteboards')}>
          <ChevronLeftIcon size={18} />
          <span>Boards</span>
        </button>
        <button type="button" className="wb-title" onClick={rename} aria-label={`Rename ${name}`}>
          {name}
        </button>
        <div className="wb-topbar-right">
          <button
            type="button"
            className="wb-zoom"
            aria-label="Reset zoom to 100%"
            onClick={() => zoomAt({ x: size().w / 2, y: size().h / 2 }, 1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button type="button" className="icon-button" aria-label="Zoom to fit" onClick={fitAll}>
            <FitIcon size={20} />
          </button>
          <ActionMenu
            label="Board options"
            trigger={<EllipsisCircleIcon size={22} />}
            items={[
              { label: 'Rename', onSelect: rename },
              { label: 'Delete Whiteboard', destructive: true, onSelect: remove },
            ]}
          />
        </div>
      </header>

      <div
        ref={viewportRef}
        className={`wb-viewport tool-${tool}`}
        style={{
          backgroundSize: `${dotGap}px ${dotGap}px`,
          backgroundPosition: `${(vp?.x ?? 0) % dotGap}px ${(vp?.y ?? 0) % dotGap}px`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {vp && (
          <div
            className="wb-world"
            style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`, ['--zoom' as string]: vp.zoom }}
          >
            {els.map((el) => (
              <ElementView key={el.id} el={el} editing={el.id === editingId} onText={onText} onMeasure={onMeasure} />
            ))}
            {draft && (
              <svg className="wb-svg wb-draft" width={1} height={1}>
                <path d={strokePath(draft.pts, 3 / vp.zoom, !draft.pen)} fill={inkCss(inkColor)} />
              </svg>
            )}
            {selected && <SelectionOverlay el={selected} heights={heights} editing={selected.id === editingId} />}
          </div>
        )}
        {els.length === 0 && !draft && (
          <p className="wb-hint">Pick a tool below to start. Pinch to zoom, drag to move around.</p>
        )}
      </div>

      {/* Contextual options: colours, shape kinds, duplicate / delete */}
      {(showColors || tool === 'shape') && (
        <div className="wb-options" role="toolbar" aria-label="Options">
          {tool === 'shape' && !selected && (
            <>
              {SHAPES.map((s) => (
                <button
                  key={s.shape}
                  type="button"
                  className={'wb-opt' + (shapeKind === s.shape ? ' on' : '')}
                  aria-label={s.label}
                  aria-pressed={shapeKind === s.shape}
                  onClick={() => setShapeKind(s.shape)}
                >
                  {s.icon}
                </button>
              ))}
              <span className="wb-divider" />
            </>
          )}
          {(showColors === 'sticky' ? STICKY_COLORS : INK_COLORS).map((c) => (
            <button
              key={c.id}
              type="button"
              className={'wb-swatch' + (activeColor === c.id ? ' on' : '')}
              style={{ background: c.css }}
              aria-label={c.label}
              aria-pressed={activeColor === c.id}
              onClick={() => recolour(c.id)}
            />
          ))}
          {selected && (
            <>
              <span className="wb-divider" />
              <button type="button" className="wb-opt" aria-label="Duplicate" onClick={duplicateSelected}>
                <DuplicateIcon size={20} />
              </button>
              <button type="button" className="wb-opt" aria-label="Delete" onClick={deleteSelected}>
                <TrashIcon size={20} />
              </button>
            </>
          )}
        </div>
      )}

      <nav className="wb-toolbar" role="toolbar" aria-label="Tools">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            type="button"
            className={'wb-tool' + (tool === t.tool ? ' on' : '')}
            aria-label={t.label}
            aria-pressed={tool === t.tool}
            onClick={() => {
              finishEditing()
              setTool(t.tool)
            }}
          >
            {t.icon}
          </button>
        ))}
        <span className="wb-divider" />
        <button type="button" className="wb-tool" aria-label="Undo" disabled={!past.current.length} onClick={undo}>
          <UndoIcon size={20} />
        </button>
        <button type="button" className="wb-tool" aria-label="Redo" disabled={!future.current.length} onClick={redo}>
          <RedoIcon size={20} />
        </button>
      </nav>
    </div>
  )
}

/** Outline + resize handles for the selected element (sizes stay constant on screen). */
function SelectionOverlay({ el, heights, editing }: { el: WbElement; heights: Record<string, number>; editing: boolean }) {
  if (el.type === 'arrow') {
    return (
      <>
        <div className="wb-handle round" data-handle="start" style={{ left: el.x, top: el.y }} />
        <div className="wb-handle round" data-handle="end" style={{ left: el.x + el.w, top: el.y + el.h }} />
      </>
    )
  }
  const b = bounds(el, heights)
  const corners: [Handle, number, number][] = [
    ['nw', b.x, b.y],
    ['ne', b.x + b.w, b.y],
    ['sw', b.x, b.y + b.h],
    ['se', b.x + b.w, b.y + b.h],
  ]
  return (
    <>
      <div className="wb-selection" style={{ left: b.x, top: b.y, width: b.w, height: b.h }} />
      {!editing &&
        corners.map(([h, x, y]) => (
          <div key={h} className="wb-handle" data-handle={h} style={{ left: x, top: y }} aria-label={`Resize ${h}`} />
        ))}
    </>
  )
}
