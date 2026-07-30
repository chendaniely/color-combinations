import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { reachThePalette } from './seasonHelpers'

// The corner mark, and the You tab's doorways.
//
// Both are browser tests by necessity: "does this element stay put while the
// page scrolls" is a question about layout and scrolling, and jsdom has
// neither. That is exactly why the bug survived — the mark sat in a plain
// <footer>, which on the wheel lands at the bottom of the viewport and LOOKS
// pinned. The You tab, with fifty swatches, was the first page long enough to
// reveal it.
const version = JSON.parse(readFileSync('package.json', 'utf8')).version as string

test.describe('the corner mark', () => {
  test('stays in the corner while the page scrolls', async ({ page }) => {
    // The You tab specifically: it is the longest page on the site (fifty
    // swatches plus the combination grid) and the one the owner reported this
    // on. Browse at the test viewport is not tall enough to scroll at all,
    // which made a first version of this test pass vacuously by timing out.
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })

    const before = await page.locator('.site-mark').boundingBox()
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForFunction(() => window.scrollY > 200)
    const after = await page.locator('.site-mark').boundingBox()

    expect(after!.y, 'the mark scrolled away with the page').toBe(before!.y)
  })

  test('shows the released version, taken from package.json', async ({ page }) => {
    await page.goto('./')
    await expect(page.locator('.site-version')).toHaveText(`v${version}`)
  })

  test('links to what changed, not just to the repository', async ({ page }) => {
    await page.goto('./')
    const href = await page.locator('.site-version').getAttribute('href')
    expect(href).toContain('CHANGELOG.md')
  })

  test('does not swallow clicks meant for the page underneath', async ({ page }) => {
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    // The mark is fixed over the content, so only the link itself may be
    // clickable — otherwise it would block a corner of every screen.
    const events = await page.locator('.site-mark').evaluate(
      (el) => getComputedStyle(el).pointerEvents)
    expect(events).toBe('none')
    const link = await page.locator('.site-version').evaluate(
      (el) => getComputedStyle(el).pointerEvents)
    expect(link).toBe('auto')
  })
})

test.describe('the You tab doorways', () => {
  test('appear both above and below the combinations', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    // The colour list runs to fifty swatches. With one copy at the bottom,
    // somebody near the top scrolls past all of it AND the combination grid
    // before learning there is anywhere to go.
    await expect(page.locator('.you-doorways')).toHaveCount(2)

    const combos = await page.locator('.you-combo-grid').boundingBox()
    const boxes = await page.locator('.you-doorways').all()
    const first = await boxes[0].boundingBox()
    const last = await boxes[1].boundingBox()
    expect(first!.y, 'the first copy is not above the combinations')
      .toBeLessThan(combos!.y)
    expect(last!.y, 'the second copy is not below the combinations')
      .toBeGreaterThan(combos!.y)
  })

  test('starts a palette from the swatch the visitor picks', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })

    const button = page.getByRole('button', { name: /start a palette from/i }).first()
    const before = await button.innerText()

    // Picking any swatch retargets the button. It used to assume the first,
    // which is a guess about somebody looking at fifty colours.
    await page.locator('.you-swatch').nth(5).click()
    await expect(button).not.toHaveText(before)

    const name = await page.locator('.you-swatch').nth(5).innerText()
    expect(await button.innerText()).toContain(name.split('\n')[0])
  })

  test('the swatch grid is one tab stop, not fifty', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    // The defect useRovingFocus exists to prevent, and a fifty-swatch grid is
    // the worst case for it on the whole site.
    const tabbable = await page.locator('.you-swatches [role="option"]')
      .evaluateAll((els) => els.filter((e) => e.getAttribute('tabindex') === '0').length)
    expect(tabbable, 'more than one swatch is in the tab order').toBe(1)
  })

  test('arrow keys move the selection within the grid', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    const button = page.getByRole('button', { name: /start a palette from/i }).first()

    await page.locator('.you-swatch').first().click()
    const before = await button.innerText()
    await page.keyboard.press('ArrowRight')
    await expect(button).not.toHaveText(before)
  })
})
