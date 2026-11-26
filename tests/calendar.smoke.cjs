// End-to-end smoke test for the Calendar tab on emulated iPhone + iPad.
// Usage: npm run build && npx vite preview --port 4173 &  node tests/calendar.smoke.cjs [screenshotDir]
const { chromium, devices } = require('playwright')
const assert = require('assert')

const URL = process.env.APP_URL || 'http://localhost:4173/'
const shots = process.argv[2]
const snap = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png` })
const NOW = new Date('2026-11-26T10:30:00') // a Thursday

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...devices['iPhone 15'] })
  const page = await ctx.newPage()
  await page.clock.setFixedTime(NOW)
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  const expectTitle = (t) =>
    page.waitForFunction((t) => document.querySelector('.calendar-title')?.textContent === t, t, { timeout: 5000 })
  const sheet = page.getByRole('dialog')

  await page.goto(URL + '#/calendar')
  await page.locator('.calendar-title').waitFor()
  await expectTitle('November 2026')
  assert.equal(await page.locator('.month-weekdays span').first().innerText(), 'MON', 'week starts Monday')
  assert.equal(await page.locator('.month-cell.today.selected .month-day-number').innerText(), '26')
  await page.getByText('No Events').waitFor()

  // --- Add a timed event (defaults to the next hour)
  await page.getByRole('button', { name: 'New event' }).click()
  await sheet.waitFor()
  assert.equal(await page.locator('#ev-start').inputValue(), '11:00')
  assert.equal(await page.locator('#ev-end').inputValue(), '12:00')
  await page.getByLabel('Title').fill('Dentist')
  await page.getByLabel('Notes').fill('Bring referral')
  await page.waitForTimeout(500)
  await snap(page, '10-cal-new-event')
  await sheet.getByRole('button', { name: 'Add' }).click()
  await page.locator('.event-row', { hasText: 'Dentist' }).waitFor()
  assert.match(await page.locator('.event-row-time').innerText(), /11 am – 12 pm/i)
  assert.equal(await page.locator('.month-cell.today .month-dots i').count(), 1)

  // --- Validation: end before start
  await page.getByRole('button', { name: 'New event' }).click()
  await page.locator('#ev-start').fill('15:00')
  assert.equal(await page.locator('#ev-end').inputValue(), '16:00', 'end follows start')
  await page.locator('#ev-end').fill('14:00')
  await page.getByText('The end time must be after the start time.').waitFor()
  assert.ok(await sheet.getByRole('button', { name: 'Add' }).isDisabled())
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await sheet.waitFor({ state: 'detached' })

  // --- All-day event on another date
  await page.getByRole('button', { name: 'New event' }).click()
  await page.getByLabel('Title').fill('Long weekend')
  await page.locator('#ev-date').fill('2026-11-28')
  await page.getByRole('switch', { name: 'All-day' }).check({ force: true })
  assert.equal(await page.locator('#ev-start').count(), 0, 'times hidden for all-day')
  await sheet.getByRole('button', { name: 'Add' }).click()
  await page.locator('.event-row', { hasText: 'Long weekend' }).waitFor()
  assert.equal(await page.locator('.month-cell.selected .month-day-number').innerText(), '28')
  assert.match(await page.locator('.event-row-time').innerText(), /All day/i)

  // --- Edit
  await page.getByRole('gridcell', { name: /^Thursday 26 November/ }).click()
  await page.locator('.event-row', { hasText: 'Dentist' }).click()
  await page.getByLabel('Title').fill('Dentist appointment')
  await snap(page, '11-cal-edit-event')
  await sheet.getByRole('button', { name: 'Done' }).click()
  await page.locator('.event-row', { hasText: 'Dentist appointment' }).waitFor()
  await snap(page, '12-cal-month')

  // --- Navigate far forward and back
  await page.getByRole('button', { name: 'Next month' }).click()
  await expectTitle('December 2026')
  for (let i = 0; i < 40; i++) await page.getByRole('button', { name: 'Next month' }).click()
  await expectTitle('April 2030')
  await page.getByRole('button', { name: 'Today' }).click()
  await expectTitle('November 2026')

  // --- Week view
  await page.getByRole('tab', { name: 'Week', exact: true }).click()
  await page.locator('.time-grid-header').waitFor()
  assert.equal(await page.locator('.time-grid-day-header').count(), 7)
  assert.match(await page.locator('.time-grid-day-header').first().innerText(), /Mon\s*23/)
  await page.locator('.time-event', { hasText: 'Dentist appointment' }).waitFor()
  await page.locator('.event-chip', { hasText: 'Long weekend' }).waitFor()
  await page.locator('.now-line').waitFor()

  // Tap an empty 2 pm slot on Friday 27th -> new event at 2 pm
  await page.locator('.time-grid-scroll').evaluate((el) => (el.scrollTop = 13 * 52))
  await page.locator('.time-grid-column[data-date="2026-11-27"]').click({ position: { x: 5, y: 14 * 52 + 20 } })
  assert.equal(await page.locator('#ev-start').inputValue(), '14:00')
  assert.equal(await page.locator('#ev-date').inputValue(), '2026-11-27')
  await page.getByLabel('Title').fill('Gym')
  await sheet.getByRole('button', { name: 'Add' }).click()
  await sheet.waitFor({ state: 'detached' })
  // Overlapping event
  await page.getByRole('button', { name: 'New event' }).click()
  await page.getByLabel('Title').fill('Call Mum')
  await page.locator('#ev-date').fill('2026-11-27')
  await page.locator('#ev-start').fill('14:30')
  await sheet.getByRole('button', { name: 'Add' }).click()
  await sheet.waitFor({ state: 'detached' })
  // Week view should stay on the same week after adding
  await page.locator('.time-event', { hasText: 'Call Mum' }).waitFor()
  const gym = await page.locator('.time-event', { hasText: 'Gym' }).boundingBox()
  const call = await page.locator('.time-event', { hasText: 'Call Mum' }).boundingBox()
  assert.ok(gym.width < 40 && call.x > gym.x, 'overlapping events side by side')
  await snap(page, '13-cal-week')

  // --- Day view
  await page.getByRole('tab', { name: 'Day', exact: true }).click()
  await page.getByRole('tab', { name: 'Friday 27 November' }).click()
  await expectTitle('Fri 27 Nov 2026')
  await page.locator('.time-event', { hasText: 'Gym' }).waitFor()
  await page.locator('.time-event', { hasText: 'Call Mum' }).waitFor()
  await snap(page, '14-cal-day')
  await page.getByRole('button', { name: 'Next day' }).click()
  await expectTitle('Sat 28 Nov 2026')
  await page.locator('.event-chip', { hasText: 'Long weekend' }).waitFor()
  await page.getByRole('button', { name: 'Previous day' }).click()

  // --- Delete
  await page.locator('.time-event', { hasText: 'Call Mum' }).click()
  await sheet.getByRole('button', { name: 'Delete Event' }).click()
  await page.locator('.dialog').getByRole('button', { name: 'Delete Event' }).click()
  await sheet.waitFor({ state: 'detached' })
  assert.equal(await page.locator('.time-event', { hasText: 'Call Mum' }).count(), 0)

  // --- Persistence + view remembered after reload
  await page.reload()
  await page.locator('.time-event', { hasText: 'Gym' }).waitFor()
  assert.equal(await page.getByRole('tab', { name: 'Day', exact: true }).getAttribute('aria-selected'), 'true')

  // --- App reopens on last-used tab
  await page.goto(URL)
  await page.locator('.calendar-title').waitFor()

  // Dark mode month
  await page.getByRole('tab', { name: 'Month', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByRole('gridcell', { name: /^Thursday 26 November/ }).click()
  await snap(page, '15-cal-month-dark')
  assert.deepEqual(errors, [])
  await ctx.close()

  // --- iPad month view shows titles in cells
  const ipad = await browser.newContext({ ...devices['iPad Pro 11 landscape'] })
  const p2 = await ipad.newPage()
  await p2.clock.setFixedTime(NOW)
  await p2.goto(URL + '#/calendar?view=month')
  for (const [t, d, s, e] of [['Team planning', '2026-11-24', '09:00', '10:30'], ['School pickup', '2026-11-26', '15:00', '15:30'], ['Dinner with Sam', '2026-11-27', '18:30', '20:00']]) {
    await p2.getByRole('button', { name: 'New event' }).click()
    await p2.getByLabel('Title').fill(t)
    await p2.locator('#ev-date').fill(d)
    await p2.locator('#ev-start').fill(s)
    await p2.locator('#ev-end').fill(e)
    await p2.getByRole('dialog').getByRole('button', { name: 'Add' }).click()
    await p2.getByRole('dialog').waitFor({ state: 'detached' })
  }
  await p2.locator('.month-chip', { hasText: 'Team planning' }).waitFor()
  await p2.getByRole('gridcell', { name: /^Thursday 26 November/ }).click()
  await snap(p2, '16-cal-ipad-month')
  await p2.getByRole('tab', { name: 'Week', exact: true }).click()
  await p2.locator('.time-event', { hasText: 'Dinner with Sam' }).waitFor()
  await snap(p2, '17-cal-ipad-week')
  await ipad.close()

  await browser.close()
  console.log('ALL CALENDAR TESTS PASSED')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
