// End-to-end test for repeating events and event colours (emulated iPhone).
// Usage: npm run build && npx vite preview --port 4173 &  node tests/recurrence.smoke.cjs [screenshotDir]
const { chromium, devices } = require('playwright')
const assert = require('assert')

const URL = process.env.APP_URL || 'http://localhost:4173/'
const shots = process.argv[2]
const snap = async (page, name) => shots && page.screenshot({ path: `${shots}/${name}.png` })
const NOW = new Date('2026-11-26T10:30:00') // Thursday

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ ...devices['iPhone 15'] })
  const page = await ctx.newPage()
  await page.clock.setFixedTime(NOW)
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const sheet = page.getByRole('dialog', { name: /Event/ })
  const alert = page.locator('.dialog')

  const showDay = async (date) => {
    await page.goto(`${URL}#/calendar?view=day&date=${date}`)
    await page.locator('.time-grid').waitFor()
    await page.waitForTimeout(250)
  }
  const eventsOn = async (date) => {
    await showDay(date)
    return page.locator('.time-event .time-event-title, .event-chip').allInnerTexts()
  }
  const colorOf = (loc) => loc.evaluate((el) => el.style.getPropertyValue('--event-color'))
  const newEvent = async (title) => {
    await page.getByRole('button', { name: 'New event' }).click()
    await sheet.waitFor()
    await page.getByLabel('Title').fill(title)
  }
  const add = async () => {
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await sheet.waitFor({ state: 'detached' })
  }

  await page.goto(URL + '#/calendar?view=month')
  await page.locator('.calendar-title').waitFor()

  // --- Weekly on Mon + Wed, starting Mon 23 Nov, blue
  await newEvent('Swim')
  await page.locator('#ev-date').fill('2026-11-23')
  await page.locator('#ev-start').fill('07:00')
  await page.getByLabel('Repeat', { exact: true }).selectOption('weekly')
  assert.equal(await page.getByRole('button', { name: 'Monday' }).getAttribute('aria-pressed'), 'true', 'defaults to start weekday')
  await page.getByRole('button', { name: 'Wednesday' }).click()
  await page.getByText('Every Mon and Wed').waitFor()
  await page.getByRole('radio', { name: 'Blue' }).click()
  await page.waitForTimeout(300)
  await snap(page, '20-repeat-weekly-form')
  await add()

  assert.deepEqual(await eventsOn('2026-11-23'), ['Swim'])
  assert.deepEqual(await eventsOn('2026-11-25'), ['Swim'])
  assert.deepEqual(await eventsOn('2026-11-24'), [])
  assert.deepEqual(await eventsOn('2026-11-16'), [], 'nothing before the start date')
  assert.deepEqual(await eventsOn('2029-06-13'), ['Swim'], 'far in the future (a Wednesday)')
  assert.match(await colorOf(page.locator('.time-event').first()), /--ev-blue/)

  // --- Weekly with an end date: Tuesdays until 15 Dec
  await newEvent('Course')
  await page.locator('#ev-date').fill('2026-12-01')
  await page.getByLabel('Repeat', { exact: true }).selectOption('weekly')
  await page.getByRole('button', { name: 'Never', exact: true }).click()
  await page.getByLabel('End repeat date').fill('2026-12-15')
  await page.getByText('Every Tue until 15 Dec 2026').waitFor()
  await add()
  assert.deepEqual(await eventsOn('2026-12-15'), ['Course'])
  assert.deepEqual(await eventsOn('2026-12-22'), [], 'stops after end date')

  // --- Specific dates, green
  await showDay('2026-11-26')
  await newEvent('Exam')
  await page.getByLabel('Repeat', { exact: true }).selectOption('dates')
  await page.getByRole('button', { name: /Remove .*26 November 2026/ }).click()
  for (const d of ['2026-12-10', '2026-12-03', '2026-12-19']) {
    await page.locator('#ev-from').fill(d)
    await page.getByRole('button', { name: 'Add Date', exact: true }).click()
  }
  await page.getByText('On 3 dates').waitFor()
  await page.getByRole('radio', { name: 'Green' }).click()
  await snap(page, '21-repeat-dates-form')
  await add()
  for (const d of ['2026-12-03', '2026-12-10', '2026-12-19']) assert.ok((await eventsOn(d)).includes('Exam'), d)
  assert.ok(!(await eventsOn('2026-12-04')).includes('Exam'))
  assert.ok(!(await eventsOn('2026-11-26')).includes('Exam'))

  // --- Specific dates with a start and end date (range)
  await newEvent('Holiday')
  await page.getByLabel('Repeat', { exact: true }).selectOption('dates')
  await page.getByRole('button', { name: /^Remove / }).click()
  await page.locator('#ev-from').fill('2026-12-21')
  await page.locator('#ev-to').fill('2026-12-24')
  await page.getByRole('button', { name: 'Add These Dates' }).click()
  await page.getByText('Mon 21 Dec – Thu 24 Dec 2026').waitFor()
  await page.locator('#ev-from').fill('2026-12-31')
  await page.getByRole('button', { name: 'Add Date', exact: true }).click()
  await page.getByText('On 5 dates').waitFor()
  await page.waitForTimeout(300)
  await snap(page, '25-dates-range-form')
  await add()
  for (const d of ['2026-12-21', '2026-12-22', '2026-12-24', '2026-12-31']) assert.ok((await eventsOn(d)).includes('Holiday'), d)
  assert.ok(!(await eventsOn('2026-12-25')).includes('Holiday'))
  // Remove the whole range in one tap
  await showDay('2026-12-31')
  await page.locator('.time-event', { hasText: 'Holiday' }).click()
  await page.getByRole('button', { name: 'Remove Mon 21 Dec – Thu 24 Dec 2026' }).click()
  await page.getByText('On 1 date').waitFor()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await alert.getByRole('button', { name: 'Save for All Events' }).click()
  await sheet.waitFor({ state: 'detached' })
  assert.ok(!(await eventsOn('2026-12-22')).includes('Holiday'))
  assert.ok((await eventsOn('2026-12-31')).includes('Holiday'))

  // --- Regression: dates picked in From/To are saved even without tapping "Add Date"
  await newEvent('Camp')
  await page.getByLabel('Repeat', { exact: true }).selectOption('dates')
  await page.locator('#ev-from').fill('2027-01-11')
  await page.locator('#ev-to').fill('2027-01-13')
  await page.getByText('On 4 dates').waitFor() // today + 3 picked days
  await add()
  for (const d of ['2027-01-11', '2027-01-12', '2027-01-13']) assert.ok((await eventsOn(d)).includes('Camp'), d)

  // --- Regression: a repeating event with no index entry still shows every week
  await page.evaluate(() => new Promise((res) => {
    const r = indexedDB.open('my-productivity')
    r.onsuccess = () => {
      const tx = r.result.transaction('events', 'readwrite')
      tx.objectStore('events').put({ id: 'legacy', title: 'Choir', date: '2027-02-01', allDay: false, startTime: '16:00', endTime: '17:00',
        notes: '', color: 'purple', recurrence: { kind: 'weekly', weekdays: [1], until: null }, exceptions: [], createdAt: 1, updatedAt: 1 })
      tx.oncomplete = () => { r.result.close(); res() }
    }
  }))
  assert.ok((await eventsOn('2027-02-15')).includes('Choir'))

  // --- Month view shows coloured dots and the repeat icon
  await page.goto(URL + '#/calendar?view=month&date=2026-12-02')
  await page.locator('.event-row', { hasText: 'Swim' }).waitFor()
  assert.equal(await page.locator('.event-row svg').count(), 1, 'repeat icon')
  await snap(page, '22-repeat-month')

  // --- Edit one occurrence only
  await showDay('2026-11-30')
  await page.locator('.time-event', { hasText: 'Swim' }).click()
  await page.getByLabel('Title').fill('Swim lesson')
  await sheet.getByRole('button', { name: 'Done' }).click()
  await alert.getByText('This is a repeating event.').waitFor()
  await page.waitForTimeout(400)
  await snap(page, '23-repeat-choose')
  await alert.getByRole('button', { name: 'Save for This Event Only' }).click()
  await sheet.waitFor({ state: 'detached' })
  assert.deepEqual(await eventsOn('2026-11-30'), ['Swim lesson'])
  assert.deepEqual(await eventsOn('2026-12-02'), ['Swim'])

  // --- Edit all events: change colour to purple
  await page.locator('.time-event', { hasText: 'Swim' }).click()
  await page.getByRole('radio', { name: 'Purple' }).click()
  await sheet.getByRole('button', { name: 'Done' }).click()
  await alert.getByRole('button', { name: 'Save for All Events' }).click()
  await sheet.waitFor({ state: 'detached' })
  await showDay('2026-12-07')
  assert.match(await colorOf(page.locator('.time-event', { hasText: 'Swim' })), /--ev-purple/)
  assert.deepEqual(await eventsOn('2026-11-23'), ['Swim'], 'series still starts on 23 Nov')
  await showDay('2026-11-30')
  assert.match(await colorOf(page.locator('.time-event', { hasText: 'Swim lesson' })), /--ev-blue/, 'detached one unchanged')

  // --- Cancel on the choice leaves things unchanged
  await showDay('2026-12-09')
  await page.locator('.time-event', { hasText: 'Swim' }).click()
  await sheet.getByRole('button', { name: 'Delete Event' }).click()
  await alert.getByRole('button', { name: 'Cancel' }).click()
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  assert.deepEqual(await eventsOn('2026-12-09'), ['Swim'])

  // --- Delete one occurrence only
  await page.locator('.time-event', { hasText: 'Swim' }).click()
  await sheet.getByRole('button', { name: 'Delete Event' }).click()
  await alert.getByRole('button', { name: 'Delete This Event Only' }).click()
  await sheet.waitFor({ state: 'detached' })
  assert.deepEqual(await eventsOn('2026-12-09'), [])
  assert.deepEqual(await eventsOn('2026-12-14'), ['Swim'])

  // --- Delete all events of a series
  await showDay('2026-12-10')
  await page.locator('.time-event', { hasText: 'Exam' }).click()
  await sheet.getByRole('button', { name: 'Delete Event' }).click()
  await alert.getByRole('button', { name: 'Delete All Events' }).click()
  await sheet.waitFor({ state: 'detached' })
  assert.deepEqual(await eventsOn('2026-12-03'), [])
  assert.deepEqual(await eventsOn('2026-12-19'), [])

  // --- Validation: weekly with no days
  await newEvent('Nothing')
  await page.getByLabel('Repeat', { exact: true }).selectOption('weekly')
  while (await page.locator('.weekday-toggle.on').count()) await page.locator('.weekday-toggle.on').first().click()
  await page.getByText('Choose at least one day of the week.').waitFor()
  assert.ok(await sheet.getByRole('button', { name: 'Add' }).isDisabled())
  await sheet.getByRole('button', { name: 'Cancel' }).click()

  // --- Persistence
  await page.reload()
  assert.ok((await eventsOn('2027-03-01')).includes('Swim'))

  // Week view with several colours
  await newEvent('Party')
  await page.locator('#ev-date').fill('2027-03-05')
  await page.locator('#ev-start').fill('18:00')
  await page.getByRole('radio', { name: 'Orange' }).click()
  await add()
  await newEvent('Lunch')
  await page.locator('#ev-date').fill('2027-03-03')
  await page.locator('#ev-start').fill('12:00')
  await page.getByRole('radio', { name: 'Green' }).click()
  await add()
  await page.goto(URL + '#/calendar?view=week&date=2027-03-03')
  await page.locator('.time-event', { hasText: 'Party' }).waitFor()
  await page.locator('.time-grid-scroll').evaluate((el) => (el.scrollTop = 6 * 52))
  await snap(page, '24-colours-week')

  assert.deepEqual(errors, [])
  await browser.close()
  console.log('ALL RECURRENCE TESTS PASSED')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
