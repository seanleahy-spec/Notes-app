// End-to-end smoke test for Whiteboards (emulated iPhone).
// Usage: npm run build && npx vite preview --port 4173 &  node tests/whiteboards.smoke.cjs [screenshotDir]
const { chromium, devices } = require('playwright')
const assert = require('assert')

const URL = process.env.APP_URL || 'http://localhost:4173/'
const shots = process.argv[2]
const snap = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png` })

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...devices['iPhone 15'], colorScheme: 'dark' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto(URL + '#/whiteboards')
  await page.getByText('No whiteboards').waitFor()
  await page.getByRole('button', { name: 'New whiteboard' }).click()
  await page.locator('.wb-viewport').waitFor()
  assert.equal(await page.locator('.tab-bar').count(), 0, 'tab bar hidden on a board')
  assert.equal(await page.locator('.wb-zoom').innerText(), '100%')

  const vb = await page.locator('.wb-viewport').boundingBox()
  const at = (x, y) => ({ x: vb.x + x, y: vb.y + y })
  const tap = async (x, y) => {
    const p = at(x, y)
    await page.mouse.click(p.x, p.y)
  }
  const drag = async (x1, y1, x2, y2, steps = 12) => {
    const a = at(x1, y1)
    const b = at(x2, y2)
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    await page.mouse.move(b.x, b.y, { steps })
    await page.mouse.up()
  }
  // Tap an empty spot near the top-right of the canvas (clear of the floating toolbars).
  const finish = () => tap(vb.width - 24, 24)
  const tool = (name) => page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true }).click()
  const count = (sel) => page.locator(`.wb-world ${sel}`).count()

  // --- Text
  await tool('Text')
  await tap(40, 90)
  await page.locator('.wb-textarea').waitFor()
  await page.keyboard.type('Project plan')
  await finish()
  await page.locator('.wb-text', { hasText: 'Project plan' }).waitFor()
  assert.equal(await count('.wb-textarea'), 0)

  // --- Empty text disappears
  await tool('Text')
  await tap(40, 600)
  await page.locator('.wb-textarea').waitFor()
  await finish()
  assert.equal(await count('.wb-text'), 1, 'empty text removed')

  // --- Sticky notes
  await tool('Sticky note')
  await page.getByRole('button', { name: 'Pink' }).click()
  await tap(110, 260)
  await page.keyboard.type('Ideas for the term')
  await finish()
  await page.locator('.wb-sticky', { hasText: 'Ideas for the term' }).waitFor()
  const stickyBg = await page.locator('.wb-sticky').evaluate((el) => el.style.background)
  assert.match(stickyBg, /242, 196, 201|f2c4c9/i)

  // --- Shape (drag) as an ellipse in blue
  await tool('Shape')
  await page.getByRole('button', { name: 'Ellipse' }).click()
  await page.getByRole('button', { name: 'Blue' }).click()
  await drag(230, 230, 360, 330)
  assert.equal(await count('ellipse'), 1)
  // Tool returns to select after placing
  assert.equal(await page.getByRole('button', { name: 'Select', exact: true }).getAttribute('aria-pressed'), 'true')

  // --- Rectangle by tap (default size)
  await tool('Shape')
  await page.getByRole('button', { name: 'Rectangle' }).click()
  await tap(290, 440)
  assert.equal(await count('rect'), 1)

  // --- Arrow
  await tool('Arrow')
  await drag(200, 300, 260, 420)
  assert.equal(await count('.wb-passthrough path'), 2, 'arrow + hit path')

  // --- Freehand
  await tool('Pen')
  const p0 = at(40, 420)
  await page.mouse.move(p0.x, p0.y)
  await page.mouse.down()
  for (let i = 1; i <= 20; i++) await page.mouse.move(p0.x + i * 7, p0.y + Math.sin(i / 2) * 25)
  await page.mouse.up()
  assert.equal(await count('polyline.wb-hit'), 1, 'stroke saved')
  assert.equal(await page.getByRole('button', { name: 'Pen' }).getAttribute('aria-pressed'), 'true', 'pen stays active')
  await snap(page, 'wb-01-board-dark')

  // --- Move the sticky
  await tool('Select')
  const s1 = await page.locator('.wb-sticky').boundingBox()
  await page.mouse.move(s1.x + 40, s1.y + 40)
  await page.mouse.down()
  await page.mouse.move(s1.x + 40, s1.y + 140, { steps: 8 })
  await page.mouse.up()
  const s2 = await page.locator('.wb-sticky').boundingBox()
  assert.ok(Math.abs(s2.y - s1.y - 100) < 3, 'sticky moved down 100px')

  // --- Resize the ellipse via its bottom-right handle
  const e1 = await page.locator('.wb-world ellipse').boundingBox()
  await page.mouse.click(e1.x + e1.width / 2, e1.y + 2)
  const h = await page.locator('[data-handle="se"]').boundingBox()
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + 30, h.y + 40, { steps: 6 })
  await page.mouse.up()
  const e2 = await page.locator('.wb-world ellipse').boundingBox()
  assert.ok(e2.width > e1.width + 20, 'ellipse wider')

  // --- Recolour + duplicate + delete + undo/redo (ellipse is selected)
  await page.getByRole('button', { name: 'Green' }).click()
  assert.match(await page.locator('.wb-world ellipse').getAttribute('stroke'), /ev-green/)
  await page.getByRole('button', { name: 'Duplicate' }).click()
  assert.equal(await count('ellipse'), 2)
  await page.getByRole('button', { name: 'Delete' }).click()
  assert.equal(await count('ellipse'), 1)
  await page.getByRole('button', { name: 'Undo' }).click()
  assert.equal(await count('ellipse'), 2)
  await page.getByRole('button', { name: 'Redo' }).click()
  assert.equal(await count('ellipse'), 1)
  await snap(page, 'wb-02-selected')

  // --- Edit existing sticky text: select then tap again
  const s3 = await page.locator('.wb-sticky').boundingBox()
  await page.mouse.click(s3.x + 30, s3.y + 30)
  await page.mouse.click(s3.x + 30, s3.y + 30)
  await page.locator('.wb-sticky .wb-textarea').waitFor()
  await page.keyboard.type(' 2027')
  await finish()
  await page.locator('.wb-sticky', { hasText: 'Ideas for the term 2027' }).waitFor()

  // --- Zoom (ctrl+wheel = trackpad pinch) and pan, then fit
  const c = at(200, 300)
  await page.mouse.move(c.x, c.y)
  for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 40)
  const z = parseInt(await page.locator('.wb-zoom').innerText())
  assert.equal(z, 100, 'plain wheel pans, does not zoom')
  await page.keyboard.down('Control')
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 40)
  await page.keyboard.up('Control')
  const zOut = parseInt(await page.locator('.wb-zoom').innerText())
  assert.ok(zOut <= 10, `zoomed far out (${zOut}%)`)
  await snap(page, 'wb-03-zoomed-out')
  await page.getByRole('button', { name: 'Zoom to fit' }).click()
  const zFit = parseInt(await page.locator('.wb-zoom').innerText())
  assert.ok(zFit > 40 && zFit <= 100, `fit zoom ${zFit}%`)

  // --- New elements made while zoomed out still look normal-sized on screen
  await page.keyboard.down('Control')
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 40)
  await page.keyboard.up('Control')
  await tool('Sticky note')
  await tap(200, 600)
  await page.keyboard.type('Zoomed')
  await finish()
  const zs = await page.locator('.wb-sticky', { hasText: 'Zoomed' }).boundingBox()
  assert.ok(Math.abs(zs.width - 200) < 4, `sticky is 200px on screen (${zs.width})`)
  await page.getByRole('button', { name: 'Zoom to fit' }).click()

  // --- Rename via the title
  await page.locator('.wb-title').click()
  await page.locator('.dialog-input').fill('Term planning')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.locator('.wb-title', { hasText: 'Term planning' }).waitFor()

  // --- Persistence
  await page.waitForTimeout(800)
  const zoomBefore = await page.locator('.wb-zoom').innerText()
  const elCount = await page.locator('.wb-world [data-el-id]').count()
  await page.reload()
  await page.locator('.wb-sticky').first().waitFor()
  assert.equal(await page.locator('.wb-world [data-el-id]').count(), elCount, 'elements saved')
  assert.equal(await page.locator('.wb-zoom').innerText(), zoomBefore, 'viewport saved')

  // --- List with preview, second board, rename/delete from list
  await page.getByRole('button', { name: 'Boards' }).click()
  await page.locator('.wb-card-name', { hasText: 'Term planning' }).waitFor()
  assert.ok((await page.locator('.wb-preview [data-el-id]').count()) >= 6, 'preview shows elements')
  await page.getByRole('button', { name: 'New whiteboard' }).click()
  await page.locator('.wb-viewport').waitFor()
  await tool('Text')
  await tap(80, 200)
  await page.keyboard.type('Second board')
  await finish()
  assert.equal(await count('.wb-text'), 1, 'one text box on the second board')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Boards' }).click()
  await page.locator('.wb-card').nth(1).waitFor()
  assert.deepEqual(await page.locator('.wb-card-name').allInnerTexts(), ['Untitled', 'Term planning'], 'newest edited first')
  await page.waitForTimeout(400)
  await snap(page, 'wb-04-list-dark')
  await page.getByRole('button', { name: 'Options for Untitled' }).click()
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await page.locator('.dialog').getByRole('button', { name: 'Delete' }).click()
  await page.waitForTimeout(300)
  assert.deepEqual(await page.locator('.wb-card-name').allInnerTexts(), ['Term planning'])

  // --- Light mode screenshots
  await page.emulateMedia({ colorScheme: 'light' })
  await page.waitForTimeout(200)
  await snap(page, 'wb-05-list-light')
  await page.locator('.wb-card-link').first().click()
  await page.locator('.wb-sticky').first().waitFor()
  await page.waitForTimeout(300)
  await snap(page, 'wb-06-board-light')

  assert.deepEqual(errors, [])
  await ctx.close()

  // --- iPad
  const ipad = await browser.newContext({ ...devices['iPad Pro 11 landscape'], colorScheme: 'dark' })
  const p2 = await ipad.newPage()
  await p2.goto(URL + '#/whiteboards')
  await p2.getByRole('button', { name: 'New whiteboard' }).click()
  await p2.locator('.wb-viewport').waitFor()
  await p2.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name: 'Sticky note', exact: true }).click()
  const v2 = await p2.locator('.wb-viewport').boundingBox()
  await p2.mouse.click(v2.x + 300, v2.y + 250)
  await p2.keyboard.type('Brainstorm')
  await p2.mouse.click(v2.x + 900, v2.y + 600)
  await p2.locator('.wb-sticky', { hasText: 'Brainstorm' }).waitFor()
  await ipad.close()

  await browser.close()
  console.log('ALL WHITEBOARD TESTS PASSED')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
