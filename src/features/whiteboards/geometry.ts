import type { WbElement } from './types'

export interface Point {
  x: number
  y: number
}
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Normalised (positive width/height) bounding box. `heights` holds measured text heights. */
export function bounds(el: WbElement, heights?: Record<string, number>): Box {
  if (el.type === 'arrow') {
    return { x: Math.min(el.x, el.x + el.w), y: Math.min(el.y, el.y + el.h), w: Math.abs(el.w), h: Math.abs(el.h) }
  }
  if (el.type === 'text') return { x: el.x, y: el.y, w: el.w, h: heights?.[el.id] ?? el.h }
  return { x: el.x, y: el.y, w: el.w, h: el.h }
}

export function unionBounds(els: WbElement[], heights?: Record<string, number>): Box | null {
  if (!els.length) return null
  let l = Infinity
  let t = Infinity
  let r = -Infinity
  let b = -Infinity
  for (const el of els) {
    const bb = bounds(el, heights)
    l = Math.min(l, bb.x)
    t = Math.min(t, bb.y)
    r = Math.max(r, bb.x + bb.w)
    b = Math.max(b, bb.y + bb.h)
  }
  return { x: l, y: t, w: r - l, h: b - t }
}

export type Handle = 'nw' | 'ne' | 'sw' | 'se' | 'start' | 'end'

/** Box resize from a corner, keeping the opposite corner fixed. */
function resizeBox(orig: Box, handle: Handle, p: Point, min: number): Box {
  const right = orig.x + orig.w
  const bottom = orig.y + orig.h
  let l = orig.x
  let t = orig.y
  let r = right
  let b = bottom
  if (handle.includes('w')) l = Math.min(p.x, right - min)
  if (handle.includes('e')) r = Math.max(p.x, orig.x + min)
  if (handle.includes('n')) t = Math.min(p.y, bottom - min)
  if (handle.includes('s')) b = Math.max(p.y, orig.y + min)
  return { x: l, y: t, w: r - l, h: b - t }
}

/** Returns the element resized by dragging `handle` to world point `p`. */
export function resizeElement(
  orig: WbElement,
  handle: Handle,
  p: Point,
  zoom: number,
  heights?: Record<string, number>,
): WbElement {
  if (orig.type === 'arrow') {
    if (handle === 'start') {
      const ex = orig.x + orig.w
      const ey = orig.y + orig.h
      return { ...orig, x: p.x, y: p.y, w: ex - p.x, h: ey - p.y }
    }
    return { ...orig, w: p.x - orig.x, h: p.y - orig.y }
  }
  if (orig.type === 'text') {
    // Text scales proportionally (font size follows the width).
    const h = heights?.[orig.id] ?? orig.h
    const box = resizeBox({ x: orig.x, y: orig.y, w: orig.w, h }, handle, p, 40 / zoom)
    const ratio = box.w / orig.w
    const newH = h * ratio
    return {
      ...orig,
      w: box.w,
      h: newH,
      fontSize: orig.fontSize * ratio,
      x: handle.includes('w') ? orig.x + orig.w - box.w : orig.x,
      y: handle.includes('n') ? orig.y + h - newH : orig.y,
    }
  }
  const min = (orig.type === 'sticky' ? 80 : 12) / zoom
  return { ...orig, ...resizeBox(orig, handle, p, min) }
}

/** Moves an element by (dx, dy). */
export const moveElement = (el: WbElement, dx: number, dy: number): WbElement => ({ ...el, x: el.x + dx, y: el.y + dy })

/** Turns absolute pen points [x, y, pressure] into a draw element box + normalised points. */
export function normaliseStroke(pts: number[][]): { box: Box; points: number[][] } {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const w = Math.max(...xs) - x
  const h = Math.max(...ys) - y
  return {
    box: { x, y, w, h },
    points: pts.map(([px, py, pr]) => [w ? (px - x) / w : 0, h ? (py - y) / h : 0, pr]),
  }
}
