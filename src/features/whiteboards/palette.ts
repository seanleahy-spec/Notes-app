/** Ink colours (pen, text, shapes, arrows). "ink" follows the theme: charcoal or off-white. */
export const INK_COLORS = [
  { id: 'ink', label: 'Ink', css: 'var(--text)' },
  { id: 'red', label: 'Red', css: 'var(--ev-red)' },
  { id: 'orange', label: 'Orange', css: 'var(--ev-orange)' },
  { id: 'yellow', label: 'Yellow', css: 'var(--ev-yellow)' },
  { id: 'green', label: 'Green', css: 'var(--ev-green)' },
  { id: 'blue', label: 'Blue', css: 'var(--ev-blue)' },
  { id: 'purple', label: 'Purple', css: 'var(--ev-purple)' },
]

/** Sticky note paper colours (soft pastels, same in light and dark). */
export const STICKY_COLORS = [
  { id: 'yellow', label: 'Yellow', css: '#f7e7a1' },
  { id: 'orange', label: 'Orange', css: '#f6cfa8' },
  { id: 'pink', label: 'Pink', css: '#f2c4c9' },
  { id: 'green', label: 'Green', css: '#c9e4c5' },
  { id: 'blue', label: 'Blue', css: '#c3d7ec' },
  { id: 'purple', label: 'Purple', css: '#d9cbe8' },
  { id: 'paper', label: 'Paper', css: '#ece7df' },
]

export const inkCss = (id: string) => INK_COLORS.find((c) => c.id === id)?.css ?? 'var(--text)'
export const stickyCss = (id: string) => STICKY_COLORS.find((c) => c.id === id)?.css ?? STICKY_COLORS[0].css
