import { getStroke } from 'perfect-freehand'
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { inkCss, stickyCss } from './palette'
import type { ArrowElement, DrawElement, ShapeElement, WbElement } from './types'

/** Builds an SVG path for a smooth, pressure-sensitive stroke. */
export function strokePath(points: number[][], size: number, simulatePressure: boolean): string {
  const outline = getStroke(points, { size, thinning: 0.55, smoothing: 0.5, streamline: 0.4, simulatePressure, last: true })
  if (!outline.length) return ''
  const d: (string | number)[] = ['M', outline[0][0], outline[0][1], 'Q']
  outline.forEach(([x0, y0], i) => {
    const [x1, y1] = outline[(i + 1) % outline.length]
    d.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
  })
  d.push('Z')
  return d.join(' ')
}

/** Absolute (element-relative) points of a draw element. */
const drawPoints = (el: DrawElement) => el.points.map(([nx, ny, p]) => [nx * el.w, ny * el.h, p])

function DrawView({ el }: { el: DrawElement }) {
  const pts = drawPoints(el)
  const centre = pts.map(([x, y]) => `${x},${y}`).join(' ')
  return (
    <svg className="wb-svg" width={1} height={1}>
      <path d={strokePath(pts, el.strokeWidth, !el.pressure)} fill={inkCss(el.color)} />
      <polyline className="wb-hit" points={centre} />
    </svg>
  )
}

function ArrowView({ el }: { el: ArrowElement }) {
  const len = Math.hypot(el.w, el.h)
  const a = Math.atan2(el.h, el.w)
  const head = Math.min(Math.max(10, el.strokeWidth * 5), len * 0.5)
  const h1 = [el.w - head * Math.cos(a - 0.45), el.h - head * Math.sin(a - 0.45)]
  const h2 = [el.w - head * Math.cos(a + 0.45), el.h - head * Math.sin(a + 0.45)]
  const d = `M0 0 L${el.w} ${el.h} M${h1[0]} ${h1[1]} L${el.w} ${el.h} L${h2[0]} ${h2[1]}`
  return (
    <svg className="wb-svg" width={1} height={1}>
      <path d={d} fill="none" stroke={inkCss(el.color)} strokeWidth={el.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path className="wb-hit" d={`M0 0 L${el.w} ${el.h}`} />
    </svg>
  )
}

function ShapeView({ el }: { el: ShapeElement }) {
  const s = el.strokeWidth / 2
  const w = Math.max(el.w - el.strokeWidth, 1)
  const h = Math.max(el.h - el.strokeWidth, 1)
  const common = { fill: 'transparent', stroke: inkCss(el.color), strokeWidth: el.strokeWidth, strokeLinejoin: 'round' as const }
  return (
    <svg className="wb-svg wb-shape" width={el.w} height={el.h}>
      {el.shape === 'rect' && <rect x={s} y={s} width={w} height={h} rx={Math.min(w, h) * 0.04} {...common} />}
      {el.shape === 'ellipse' && <ellipse cx={el.w / 2} cy={el.h / 2} rx={w / 2} ry={h / 2} {...common} />}
      {el.shape === 'diamond' && (
        <polygon points={`${el.w / 2},${s} ${el.w - s},${el.h / 2} ${el.w / 2},${el.h - s} ${s},${el.h / 2}`} {...common} />
      )}
    </svg>
  )
}

function TextEditor({ value, onChange, className, style }: {
  value: string
  onChange: (v: string) => void
  className: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])
  useLayoutEffect(() => {
    const el = ref.current
    if (el && className.includes('auto-height')) {
      el.style.height = '0px'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [value, className])
  return (
    <textarea
      ref={ref}
      className={className}
      style={style}
      value={value}
      placeholder="Type something"
      aria-label="Text"
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

interface Props {
  el: WbElement
  editing?: boolean
  onText?: (id: string, text: string) => void
  onMeasure?: (id: string, height: number) => void
}

/** Renders one element, positioned in world coordinates. */
export const ElementView = memo(function ElementView({ el, editing, onText, onMeasure }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  // Text boxes grow with their content; report the real height for selection/fit.
  useEffect(() => {
    if (el.type !== 'text' || !onMeasure || !ref.current) return
    const node = ref.current
    const ro = new ResizeObserver(() => onMeasure(el.id, node.offsetHeight))
    ro.observe(node)
    return () => ro.disconnect()
  }, [el.type, el.id, onMeasure])

  const pos: React.CSSProperties = { left: el.x, top: el.y }

  switch (el.type) {
    case 'text':
      return (
        <div
          ref={ref}
          data-el-id={el.id}
          className="wb-el wb-text"
          style={{ ...pos, width: el.w, fontSize: el.fontSize, color: inkCss(el.color) }}
        >
          {editing && onText ? (
            <TextEditor className="wb-textarea auto-height" value={el.text} onChange={(v) => onText(el.id, v)} />
          ) : (
            el.text || ' '
          )}
        </div>
      )
    case 'sticky':
      return (
        <div
          data-el-id={el.id}
          className="wb-el wb-sticky"
          style={{ ...pos, width: el.w, height: el.h, background: stickyCss(el.color), fontSize: Math.max(14, el.w * 0.09) }}
        >
          {editing && onText ? (
            <TextEditor className="wb-textarea" value={el.text} onChange={(v) => onText(el.id, v)} />
          ) : (
            <span className="wb-sticky-text">{el.text}</span>
          )}
        </div>
      )
    case 'shape':
      return (
        <div data-el-id={el.id} className="wb-el" style={{ ...pos, width: el.w, height: el.h }}>
          <ShapeView el={el} />
        </div>
      )
    case 'arrow':
      return (
        <div data-el-id={el.id} className="wb-el wb-passthrough" style={pos}>
          <ArrowView el={el} />
        </div>
      )
    case 'draw':
      return (
        <div data-el-id={el.id} className="wb-el wb-passthrough" style={pos}>
          <DrawView el={el} />
        </div>
      )
  }
})
