// Renders the app icon SVG to PNGs. Run: node scripts/make-icons.cjs
const { chromium } = require('playwright')
const path = require('path')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffd54a"/><stop offset="1" stop-color="#f5a623"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <rect x="136" y="104" width="240" height="304" rx="34" fill="#fff"/>
  <rect x="136" y="104" width="240" height="64" rx="34" fill="#ff3b30"/>
  <rect x="136" y="140" width="240" height="28" fill="#ff3b30"/>
  <g stroke="#c7c7cc" stroke-width="14" stroke-linecap="round">
    <line x1="180" y1="222" x2="332" y2="222"/><line x1="180" y1="272" x2="332" y2="272"/><line x1="180" y1="322" x2="276" y2="322"/>
  </g></svg>`

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0}</style>${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}`)
    await page.screenshot({ path: path.join(__dirname, '..', 'public', 'icons', name) })
  }
  await browser.close()
})()
