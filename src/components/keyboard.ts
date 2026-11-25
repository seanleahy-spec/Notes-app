/**
 * iOS only opens the keyboard when focus happens directly inside a tap handler.
 * Call this synchronously in the tap handler *before* async work (saving,
 * navigating); then focusing the real field afterwards keeps the keyboard up.
 */
export function primeKeyboard() {
  const proxy = document.createElement('input')
  proxy.setAttribute('aria-hidden', 'true')
  proxy.style.cssText = 'position:fixed;top:0;left:0;opacity:0;height:1px;width:1px;font-size:16px;pointer-events:none;'
  document.body.appendChild(proxy)
  proxy.focus()
  setTimeout(() => proxy.remove(), 1500)
}
