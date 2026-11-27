// End-to-end smoke test for the Notes tab on emulated iPhone + iPad.
// Usage: npm run build && npx vite preview --port 4173 &  node tests/notes.smoke.cjs [screenshotDir]
const { chromium, devices } = require('playwright')
const assert = require('assert')

const URL = process.env.APP_URL || 'http://localhost:4173/'
const shots = process.argv[2]
const snap = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png` })
// "+" opens the type picker; choose the plain rich-text Note.
const newNote = async (page) => {
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByRole('button', { name: /^Note Text with/ }).click()
}

;(async () => {
  const browser = await chromium.launch()

  // ---------- iPhone ----------
  const ctx = await browser.newContext({ ...devices['iPhone 15'] })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(URL + '#/notes')
  await page.getByRole('heading', { name: 'Notes' }).waitFor()
  assert.equal(await page.locator('.tab-bar-item').evaluateAll((els) => els.map((e) => e.textContent).join(',')), 'Calendar,Whiteboards,Notes')
  await page.getByText('No Notes').waitFor()
  await snap(page, '01-iphone-empty')

  // Create a note with title + formatted body
  await newNote(page)
  const title = page.getByLabel('Note title')
  await title.waitFor()
  assert.equal(await page.locator('.tab-bar').count(), 0, 'tab bar hidden in editor')
  await title.fill('Shopping list')
  await title.press('Enter')
  const body = page.locator('.note-body')
  await page.getByRole('button', { name: 'Heading' }).click()
  await page.keyboard.type('Groceries')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Checklist' }).click()
  await page.keyboard.type('Milk')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Bread')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter') // leave list
  await page.getByRole('button', { name: 'Bold' }).click()
  await page.keyboard.type('Bold text ')
  await page.getByRole('button', { name: 'Bold' }).click()
  await page.getByRole('button', { name: 'Italic' }).click()
  await page.keyboard.type('italic text')
  await page.getByRole('button', { name: 'Italic' }).click()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Bulleted list' }).click()
  await page.keyboard.type('Bullet one')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Bullet two')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Numbered list' }).click()
  await page.keyboard.type('First')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second')
  await body.locator('ul[data-type="taskList"] > li input').first().check()
  assert.equal(await body.locator('h2').textContent(), 'Groceries')
  assert.equal(await body.locator('ul[data-type="taskList"] > li').count(), 2)
  assert.equal(await body.locator('strong').innerText().then((t) => t.trim()), 'Bold text')
  assert.equal(await body.locator('em').innerText(), 'italic text')
  assert.equal(await body.locator('ul:not([data-type]) > li').count(), 2)
  assert.equal(await body.locator('ol > li').count(), 2)
  await snap(page, '02-iphone-editor')

  // Back to list – note saved and listed
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.locator('.note-row').first().waitFor()
  assert.equal(await page.locator('.note-row-title').first().innerText(), 'Shopping list')

  // Second note (title derived from first line), then an abandoned empty note
  await newNote(page)
  await page.getByLabel('Note title').press('Enter')
  await page.keyboard.type('Meeting ideas\nTalk about budget')
  await page.getByRole('button', { name: 'Notes' }).click()
  await newNote(page)
  await page.getByLabel('Note title').waitFor()
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.waitForTimeout(300)
  assert.deepEqual(await page.locator('.note-row-title').allInnerTexts(), ['Meeting ideas', 'Shopping list'])
  assert.equal(await page.locator('.notes-count').textContent(), '2 notes')
  await snap(page, '03-iphone-list')

  // Search
  await page.getByLabel('Search notes').fill('budget')
  assert.deepEqual(await page.locator('.note-row-title').allInnerTexts(), ['Meeting ideas'])
  await page.getByLabel('Search notes').fill('zzz')
  await page.getByText('No Results').waitFor()
  await page.getByLabel('Clear search').click()

  // Rename via row actions (right-click = swipe on desktop)
  await page.locator('.note-row', { hasText: 'Meeting ideas' }).click({ button: 'right' })
  await page.getByRole('button', { name: 'Rename' }).first().click()
  await page.locator('.dialog-input').fill('Team meeting')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.locator('.note-row-title', { hasText: 'Team meeting' }).waitFor()

  // Reload: everything persisted, formatting intact
  await page.reload()
  await page.locator('.note-row').first().waitFor()
  assert.deepEqual(await page.locator('.note-row-title').allInnerTexts(), ['Team meeting', 'Shopping list'])
  await page.locator('.note-row', { hasText: 'Shopping list' }).click()
  await page.locator('.note-body h2').waitFor()
  assert.equal(await page.locator('.note-body ul[data-type="taskList"] > li[data-checked="true"]').count(), 1)
  assert.equal(await page.locator('.note-body strong').innerText().then((t) => t.trim()), 'Bold text')

  // Delete via the ••• menu in the editor
  await page.getByRole('button', { name: 'Note options' }).click()
  await snap(page, '04-iphone-menu')
  await page.getByRole('menuitem', { name: 'Delete' }).click()
  await snap(page, '05-iphone-delete-confirm')
  await page.locator('.dialog').getByRole('button', { name: 'Delete' }).click()
  await page.locator('.note-row').first().waitFor()
  assert.deepEqual(await page.locator('.note-row-title').allInnerTexts(), ['Team meeting'])

  // Edit order: editing the older note moves it to the top
  await newNote(page)
  await page.getByLabel('Note title').fill('Newest')
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.locator('.note-row', { hasText: 'Team meeting' }).click()
  await page.locator('.note-body').click()
  await page.keyboard.type(' more')
  await page.getByRole('button', { name: 'Notes' }).click()
  await page.waitForTimeout(200)
  assert.deepEqual(await page.locator('.note-row-title').allInnerTexts(), ['Team meeting', 'Newest'])

  // Settings page
  await page.getByLabel('Settings').click()
  await page.getByText('Export Backup…').waitFor()
  await snap(page, '06-iphone-settings')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByText('Export Backup…').click()])
  const backup = JSON.parse(require('fs').readFileSync(await download.path(), 'utf8'))
  assert.equal(backup.tables.notes.length, 2)
  await page.getByRole('button', { name: 'Back', exact: true }).click()

  // Other tabs exist
  await page.getByRole('link', { name: 'Calendar' }).click()
  await page.getByRole('button', { name: 'New event' }).waitFor()
  await page.getByRole('link', { name: 'Notes' }).click()

  // Dark mode screenshot
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.locator('.note-row').first().waitFor()
  await snap(page, '07-iphone-dark-list')
  await page.locator('.note-row', { hasText: 'Team meeting' }).click()
  await page.locator('.note-body').waitFor()
  await snap(page, '08-iphone-dark-editor')
  assert.deepEqual(errors, [])
  await ctx.close()

  // ---------- iPad (landscape) ----------
  const ipad = await browser.newContext({ ...devices['iPad Pro 11 landscape'] })
  const p2 = await ipad.newPage()
  await p2.goto(URL + '#/notes')
  await p2.getByText('No note selected').waitFor()
  await newNote(p2)
  await p2.getByLabel('Note title').fill('iPad note')
  await p2.getByLabel('Note title').press('Enter')
  await p2.getByRole('button', { name: 'Checklist' }).click()
  await p2.keyboard.type('Split view works')
  await p2.locator('.note-row-title', { hasText: 'iPad note' }).waitFor()
  assert.equal(await p2.locator('.tab-bar').count(), 1, 'tab bar visible on iPad')
  await snap(p2, '09-ipad-split')
  await ipad.close()

  await browser.close()
  console.log('ALL NOTES TESTS PASSED')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
