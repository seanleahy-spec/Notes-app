/**
 * Whiteboard elements. All coordinates are in "world" units (1 unit = 1 CSS px at 100% zoom).
 * Every element has a box (x, y, w, h). Arrows run from (x, y) to (x + w, y + h), so their
 * w/h may be negative.
 */
export type ShapeKind = 'rect' | 'ellipse' | 'diamond'

interface Base {
  id: string
  x: number
  y: number
  w: number
  h: number
  /** Colour id (see palette.ts). */
  color: string
}

export interface TextElement extends Base {
  type: 'text'
  text: string
  fontSize: number
}

export interface StickyElement extends Base {
  type: 'sticky'
  text: string
}

export interface ShapeElement extends Base {
  type: 'shape'
  shape: ShapeKind
  strokeWidth: number
}

export interface ArrowElement extends Base {
  type: 'arrow'
  strokeWidth: number
}

export interface DrawElement extends Base {
  type: 'draw'
  /** Points normalised to the box: [0..1, 0..1, pressure]. */
  points: number[][]
  strokeWidth: number
  /** True when drawn with a pressure-sensitive pen (Apple Pencil). */
  pressure: boolean
}

export type WbElement = TextElement | StickyElement | ShapeElement | ArrowElement | DrawElement

/** Saved camera position: the world point at the centre of the screen, and zoom. */
export interface SavedViewport {
  cx: number
  cy: number
  zoom: number
}
