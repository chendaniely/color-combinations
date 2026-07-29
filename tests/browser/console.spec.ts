import { expect, test } from '@playwright/test'

// Nothing had ever checked whether the app complains while it runs. React logs
// key warnings, controlled/uncontrolled switches, invalid DOM nesting and bad
// prop types to console.error — none of which fails a test, shows in the UI, or
// is visible to an owner who does not open devtools. A clean console is cheap
// to keep and expensive to recover once it fills with noise.

type Captured = { errors: string[]; warnings: string[] }

function capture(page: import('@playwright/test').Page): Captured {
  const out: Captured = { errors: [], warnings: [] }
  page.on('console', (msg) => {
    if (msg.type() === 'error') out.errors.push(msg.text())
    if (msg.type() === 'warning') out.warnings.push(msg.text())
  })
  page.on('pageerror', (err) => out.errors.push(`UNCAUGHT: ${err.message}`))
  return out
}

const VIEWS = ['Wheel', 'Match', 'Browse', 'You', 'About']

test('the app says nothing to the console while you use it', async ({ page }) => {
  const log = capture(page)

  await page.goto('./')
  for (const view of VIEWS) {
    await page.getByRole('button', { name: view }).first().click()
    await page.waitForTimeout(150)
    // About opens a right-hand panel that covers the nav (z-index 10 over an
    // unlayered header), so it has to be dismissed before the next view.
    const close = page.locator('.panel-close')
    if (await close.count()) await close.first().click()
  }

  // Open a combination, copy a code, close it.
  await page.getByRole('button', { name: 'Browse' }).first().click()
  await page.locator('.plate-button').first().click()
  await page.locator('.copy-field').first().getByRole('button').click()
  await page.locator('.panel-close').click()

  // Walk the sampler, which is where most of the new code lives.
  await page.getByRole('button', { name: /sample a color/i }).first().click()
  await page.getByRole('button', { name: /pick a color/i }).click()
  await page.getByRole('dialog', { name: 'Pick a color' }).waitFor()
  await page.getByLabel('Brightness').fill('40')
  await page.getByRole('button', { name: /explore this color/i }).click()
  await page.getByRole('dialog', { name: 'Nearest colors' }).waitFor()
  await page.getByRole('button', { name: /^Browse / }).click()

  // Change granularity, which re-renders the D3 wheel.
  await page.getByRole('button', { name: 'Wheel' }).first().click()
  for (const level of ['SHADES', 'FAMILIES', 'GROUPS', 'COLORS']) {
    await page.getByRole('radio', { name: level }).click()
    await page.waitForTimeout(120)
  }

  expect(log.errors, 'console errors during normal use').toEqual([])
  expect(log.warnings, 'console warnings during normal use').toEqual([])
})

test('the search type-ahead stays quiet while typing and deleting', async ({ page }) => {
  const log = capture(page)
  await page.goto('./')
  const search = page.getByRole('combobox', { name: 'Search colors' })
  await search.pressSequentially('blue', { delay: 30 })
  await page.getByRole('option').first().waitFor()
  await search.press('ArrowDown')
  await search.press('ArrowUp')
  for (let i = 0; i < 4; i++) await search.press('Backspace')
  expect(log.errors).toEqual([])
  expect(log.warnings).toEqual([])
})
