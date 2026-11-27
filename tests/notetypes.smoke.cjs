// End-to-end test for the note types (table, money, list, scoreboard, draft, plan).
// Usage: npm run build && npx vite preview --port 4173 &  node tests/notetypes.smoke.cjs [screenshotDir]
const { chromium, devices } = require('playwright')
const assert = require('assert')

const URL = process.env.APP_URL || 'http://localhost:4173/'
const shots = process.argv[2]
const snap = async (page, name) => {
  if (!shots) return
  await page.evaluate(() => {
    document.activeElement?.blur()
    document.querySelectorAll('.page-scroll, .nt-table-wrap, .nt-score').forEach((el) => {
      el.scrollTop = 0
      el.scrollLeft = 0
    })
  })
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${shots}/${name}.png` })
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...devices['iPhone 15'], colorScheme: 'dark' })
  const page = await ctx.newPage()
  await page.clock.setFixedTime(new Date('2026-11-27T10:00:00'))
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const dialog = page.locator('.dialog')
  const text = (sel) => page.locator(sel).first().textContent()

  const create = async (kind, title) => {
    await page.goto(URL + '#/notes')
    await page.getByRole('button', { name: 'New note' }).click()
    await page.getByRole('dialog', { name: 'New' }).waitFor()
    await page.getByRole('button', { name: new RegExp('^' + kind + ' ') }).click()
    await page.getByLabel('Note title').fill(title)
  }
  const back = async () => {
    await page.getByRole('button', { name: 'Notes', exact: true }).click()
    await page.locator('.notes-rows').first().waitFor()
  }

  // The picker shows all seven types
  await page.goto(URL + '#/notes')
  await page.getByRole('button', { name: 'New note' }).click()
  const kinds = await page.locator('.kind-label').allTextContents()
  assert.deepEqual(kinds, ['Note', 'Table', 'Money', 'List', 'Scoreboard', 'Draft', 'Plan'])
  await snap(page, 'nt-00-picker')
  await page.getByRole('button', { name: 'Cancel' }).click()

  // ---------- Table ----------
  await create('Table', 'Budget')
  await page.getByLabel('Column 1 name').fill('Item')
  await page.getByLabel('Column 2 name').fill('Cost')
  await page.getByLabel('Column 3 name').fill('Paid')
  await page.getByLabel('Options for column 2').click()
  await dialog.getByRole('button', { name: 'Make Number Column' }).click()
  await page.getByLabel('Options for column 3').click()
  await dialog.getByRole('button', { name: 'Make Tick-box Column' }).click()
  const rows = [['Rent', '1800'], ['Phone', '45.5'], ['Gym', '30']]
  for (let i = 0; i < rows.length; i++) {
    await page.getByLabel(`Row ${i + 1}, Item`).fill(rows[i][0])
    await page.getByLabel(`Row ${i + 1}, Cost`).fill(rows[i][1])
  }
  await page.getByLabel('Row 1, Paid').click()
  await page.getByRole('button', { name: '+ Row' }).click()
  assert.equal(await page.locator('.nt-table tbody tr').count(), 4)
  await page.getByRole('button', { name: 'Totals' }).click()
  assert.equal(await text('[data-testid="total-1"]'), '1,875.5')
  assert.equal(await text('[data-testid="total-2"]'), '1 / 4')
  await page.getByLabel('Options for column 2').click()
  await dialog.getByRole('button', { name: 'Sort A → Z' }).click()
  assert.equal(await page.getByLabel('Row 1, Item').inputValue(), '', 'empty row sorts first')
  assert.equal(await page.getByLabel('Row 2, Item').inputValue(), 'Gym')
  await page.getByRole('button', { name: '+ Column' }).click()
  assert.equal(await page.locator('.nt-table thead th').count(), 4 + 2)
  await snap(page, 'nt-01-table')
  await back()

  // ---------- Money ----------
  await create('Money', 'My money')
  page.once('dialog', () => {})
  await page.getByRole('button', { name: '+ Add' }).first().click()
  await page.locator('.dialog-input').fill('Bank')
  await dialog.getByRole('button', { name: 'Next' }).click()
  await page.locator('.dialog-input').fill('1000')
  await dialog.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('Amount').first().fill('50')
  await page.getByLabel('Description').fill('Groceries')
  await page.locator('.nt-entry-form').getByRole('button', { name: 'Add' }).click()
  assert.match(await text('.nt-row-amount'), /950\.00/)
  // Owed to me
  await page.locator('section[aria-label="Owed to me"]').getByRole('button', { name: '+ Add' }).click()
  await page.getByLabel('Person').fill('Sam')
  await page.locator('.nt-debt-form').getByLabel('Amount').fill('20')
  await page.getByLabel('Reason').fill('Concert tickets')
  await page.locator('.nt-debt-form').getByRole('button', { name: 'Add' }).click()
  // I owe
  await page.locator('section[aria-label="I owe"]').getByRole('button', { name: '+ Add' }).click()
  await page.getByLabel('Person').fill('Alex')
  await page.locator('.nt-debt-form').getByLabel('Amount').fill('30')
  await page.locator('.nt-debt-form').getByRole('button', { name: 'Add' }).click()
  assert.match(await text('[data-testid="money-net"]'), /940\.00/)
  await snap(page, 'nt-02-money')
  await page.getByRole('checkbox', { name: 'Mark Sam paid' }).click()
  assert.match(await text('[data-testid="money-net"]'), /920\.00/)
  await page.getByLabel('Currency').selectOption('AED')
  assert.match(await text('[data-testid="money-net"]'), /AED|د\.إ/)
  await page.getByLabel('Currency').selectOption('AUD')
  await back()

  // ---------- List ----------
  await create('List', 'Movies to watch')
  await page.getByLabel('List type').selectOption('movies')
  for (const m of ['Dune Part Two', 'Past Lives', 'Perfect Days']) {
    await page.getByLabel('Add a movie or show').fill(m)
    await page.keyboard.press('Enter')
  }
  await page.getByRole('checkbox', { name: 'Mark Past Lives done' }).click()
  await page.getByText('Watched (1)').waitFor()
  await page.getByRole('button', { name: 'Dune Part Two' }).click()
  await page.getByRole('radio', { name: '4 stars' }).click()
  await page.getByLabel('Tag').fill('Cinema')
  await page.getByRole('button', { name: /Dune Part Two/ }).first().click()
  await page.locator('.nt-tag', { hasText: 'Cinema' }).waitFor()
  await page.getByRole('button', { name: 'A–Z' }).click()
  assert.deepEqual(await page.locator('.nt-list .nt-rows').first().locator('.nt-row-title').allTextContents(), ['Dune Part Two', 'Perfect Days'])
  await snap(page, 'nt-03-list')
  await back()

  // ---------- Scoreboard ----------
  await create('Scoreboard', 'Uno night')
  await page.getByRole('button', { name: '+ Player' }).click()
  await page.locator('.dialog-input').fill('Sam')
  await dialog.getByRole('button', { name: 'Add' }).click()
  const scores = [
    ['10', '5', '8'],
    ['3', '12', '7'],
  ]
  for (let r = 0; r < scores.length; r++) {
    if (r > 0) await page.getByRole('button', { name: '+ Round' }).click()
    const names = ['Player 1', 'Player 2', 'Sam']
    for (let i = 0; i < 3; i++) await page.getByLabel(`Round ${r + 1}, ${names[i]}`).fill(scores[r][i])
  }
  assert.equal(await text('[data-testid="total-Player 2"]'), '17')
  assert.match(await page.locator('.nt-player.lead').getAttribute('aria-label'), /Player 2: 17, leading/)
  await page.getByRole('button', { name: 'Change how the winner is decided' }).click()
  assert.match(await page.locator('.nt-player.lead').getAttribute('aria-label'), /Player 1: 13, leading/)
  await snap(page, 'nt-04-score')
  await page.getByRole('button', { name: 'New game' }).click()
  await dialog.getByRole('button', { name: 'New Game' }).click()
  await page.getByText('Player 1 won').waitFor()
  assert.equal(await text('[data-testid="total-Sam"]'), '0')
  await back()

  // ---------- Draft ----------
  await create('Draft', 'Email to Sam')
  await page.getByLabel('To').fill('sam@example.com')
  await page.getByLabel('Subject').fill('Saturday plans')
  await page.getByLabel('Message').fill('Hi Sam, are we still on for Saturday? Let me know.')
  assert.equal(await text('[data-testid="word-count"]'), '11 words · 50 characters')
  const href = await page.getByRole('link', { name: 'Open in Mail' }).getAttribute('href')
  assert.ok(href.startsWith('mailto:sam%40example.com?subject=Saturday%20plans&body=Hi%20Sam'), href)
  await page.getByRole('button', { name: 'Mark sent' }).click()
  await page.getByRole('button', { name: 'Sent 27 Nov' }).waitFor()
  await snap(page, 'nt-05-draft')
  await back()

  // ---------- Plan (with calendar) ----------
  await create('Plan', 'Move house')
  for (const s of ['Book removalist', 'Pack kitchen', 'Change address']) {
    await page.getByLabel('Add a step').fill(s)
    await page.keyboard.press('Enter')
  }
  await page.getByRole('checkbox', { name: 'Mark step 1 done' }).click()
  assert.equal(await text('[data-testid="plan-progress"]'), '1 of 3 done')
  // Due date -> "Add to Calendar?" -> Add
  await page.getByRole('button', { name: 'Details for step 2' }).click()
  await page.getByLabel('Due date for step 2').fill('2026-12-05')
  await page.getByLabel('Note for step 2').click() // blur the date
  await dialog.getByText('Add to Calendar?').waitFor()
  await dialog.getByRole('button', { name: 'Add' }).click()
  await page.locator('.nt-due', { hasText: 'On calendar' }).waitFor()
  // Due date on step 3 -> No
  await page.getByRole('button', { name: 'Details for step 3' }).click()
  await page.getByLabel('Due date for step 3').fill('2026-12-10')
  await page.getByLabel('Note for step 3').click()
  await dialog.getByRole('button', { name: 'No' }).click()
  await snap(page, 'nt-06-plan')
  // Move step 3 up
  await page.getByRole('button', { name: 'Move step up' }).click()
  assert.equal(await page.getByLabel('Step 2', { exact: true }).inputValue(), 'Change address')
  await page.waitForTimeout(600)
  // Calendar has the event on 5 Dec, not on 10 Dec
  await page.goto(URL + '#/calendar?view=day&date=2026-12-05')
  await page.locator('.event-chip', { hasText: 'Pack kitchen' }).waitFor()
  await page.goto(URL + '#/calendar?view=day&date=2026-12-10')
  await page.locator('.time-grid').waitFor()
  await page.waitForTimeout(300)
  assert.equal(await page.locator('.event-chip').count(), 0)
  // Changing the step's date moves the event
  await page.goto(URL + '#/notes')
  await page.locator('.note-row', { hasText: 'Move house' }).click()
  await page.getByRole('button', { name: 'Details for step 3' }).click()
  await page.getByLabel('Due date for step 3').fill('2026-12-06')
  await page.getByLabel('Note for step 3').click()
  await page.waitForTimeout(400)
  await page.goto(URL + '#/calendar?view=day&date=2026-12-06')
  await page.locator('.event-chip', { hasText: 'Pack kitchen' }).waitFor()

  // ---------- List screen, search, persistence ----------
  await page.goto(URL + '#/notes')
  await page.locator('.note-row').first().waitFor()
  const labels = await page.locator('.note-row-kind').allTextContents()
  assert.ok(['Plan · ', 'Draft · ', 'Scoreboard · ', 'List · ', 'Money · ', 'Table · '].every((l) => labels.includes(l)), labels.join('|'))
  await page.getByLabel('Search notes').fill('Concert')
  assert.deepEqual(await page.locator('.note-row-title').allTextContents(), ['My money'])
  await page.getByLabel('Search notes').fill('')
  await snap(page, 'nt-07-list-screen')
  await page.reload()
  await page.locator('.note-row', { hasText: 'Budget' }).click()
  assert.equal(await page.getByLabel('Row 2, Item').inputValue(), 'Gym')

  // Untouched new typed note is cleaned up like empty notes
  await page.goto(URL + '#/notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByRole('button', { name: /^Plan / }).click()
  await page.getByLabel('Note title').waitFor()
  await back()
  await page.waitForTimeout(300)
  assert.equal(await page.locator('.note-row', { hasText: 'New Plan' }).count(), 0)

  assert.deepEqual(errors, [])
  await browser.close()
  console.log('ALL NOTE TYPE TESTS PASSED')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
