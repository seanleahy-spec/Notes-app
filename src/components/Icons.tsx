import type { SVGProps } from 'react'

/** Small SF-Symbols-style line icons. All use currentColor. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const NotesIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
    <path d="M8 8h8M8 12h8M8 16h5" />
  </Svg>
)

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4" />
    <path d="M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 16.8h.01M12 16.8h.01" strokeWidth={2.4} />
  </Svg>
)

export const WhiteboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M7 13c1.5-3 3-3 4-1s2.5 2 4.5-2.5M12 17v3.5M8.5 20.5h7" />
  </Svg>
)

export const ComposeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13" />
    <path d="M17.6 3.6a1.9 1.9 0 0 1 2.8 2.8L12.5 14.3l-3.6.8.8-3.6z" />
  </Svg>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M15 4.5 7.5 12l7.5 7.5" />
  </Svg>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
)

export const EllipsisCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth={2.6} />
  </Svg>
)

export const SearchIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="m15 15 5 5" />
  </Svg>
)

export const XCircleFillIcon = (p: IconProps) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path d="m8.5 8.5 7 7m0-7-7 7" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

export const GearIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
)

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7" />
  </Svg>
)

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
  </Svg>
)

export const BulletListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={3} />
  </Svg>
)

export const NumberListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <path d="M4 4.5 5.3 4v4M4 8h2.6M3.9 11.2a1.3 1.3 0 0 1 2.4.6c0 .9-2.4 2-2.4 2.7h2.5M4 16.3h2.2l-1.2 1.4a1.2 1.2 0 1 1-1 2" strokeWidth={1.3} />
  </Svg>
)

export const ChecklistIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="5.5" cy="7" r="2.3" />
    <circle cx="5.5" cy="17" r="2.3" />
    <path d="M11 7h9M11 17h9" />
  </Svg>
)

export const KeyboardDismissIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3.5" width="18" height="11" rx="2" />
    <path d="M7 7h.01M10.3 7h.01M13.6 7h.01M17 7h.01M7 10.5h10" strokeWidth={2} />
    <path d="m9 18 3 3 3-3" />
  </Svg>
)

export const PlusIcon = (p: IconProps) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const RepeatIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <path d="M4 11V9a3 3 0 0 1 3-3h12M16 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H5M8 21l-3-3 3-3" />
  </Svg>
)

// ---------- Whiteboard tools ----------
export const CursorIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5 18.5 12l-5.6 1.4L10.4 19z" />
  </Svg>
)

export const PenIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
    <path d="m13.5 6.5 3 3" />
  </Svg>
)

export const TextIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6" />
  </Svg>
)

export const StickyIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 4.5h15v10l-5 5h-10z" />
    <path d="M19.5 14.5h-5v5" />
  </Svg>
)

export const ShapesIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="9.5" height="9.5" rx="1" />
    <circle cx="15.5" cy="15.5" r="5" />
  </Svg>
)

export const RectIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="6" width="16" height="12" rx="1" />
  </Svg>
)

export const EllipseIcon = (p: IconProps) => (
  <Svg {...p}>
    <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
  </Svg>
)

export const DiamondIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 20.5 12 12 20.5 3.5 12z" />
  </Svg>
)

export const ArrowToolIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 19 19 5M10 5h9v9" />
  </Svg>
)

export const UndoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Svg>
)

export const RedoIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Svg>
)

export const DuplicateIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="1.5" />
    <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
  </Svg>
)

export const FitIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </Svg>
)
