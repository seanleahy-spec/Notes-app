import { useLayoutEffect, useRef, useState } from 'react'
import { ElementView } from './ElementView'
import { unionBounds } from './geometry'
import type { WbElement } from './types'

/** Small, non-interactive picture of a whiteboard, scaled to fit its box. */
export function BoardPreview({ elements }: { elements: WbElement[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const ro = new ResizeObserver(() => setSize({ w: node.clientWidth, h: node.clientHeight }))
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const box = unionBounds(elements)
  let style: React.CSSProperties | undefined
  if (box && size.w) {
    const pad = 14
    const scale = Math.min((size.w - pad * 2) / Math.max(box.w, 1), (size.h - pad * 2) / Math.max(box.h, 1), 1)
    const x = size.w / 2 - (box.x + box.w / 2) * scale
    const y = size.h / 2 - (box.y + box.h / 2) * scale
    style = { transform: `translate(${x}px, ${y}px) scale(${scale})`, ['--zoom' as string]: scale }
  }

  return (
    <div ref={ref} className="wb-preview" aria-hidden="true">
      {style && (
        <div className="wb-world" style={style}>
          {elements.map((el) => (
            <ElementView key={el.id} el={el} />
          ))}
        </div>
      )}
    </div>
  )
}
