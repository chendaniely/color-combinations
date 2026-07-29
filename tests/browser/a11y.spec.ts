import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// An independent accessibility audit. Everything in v1.6.0's a11y work was
// done by reading specs and reasoning — combobox attributes, roving tabindex,
// the native <dialog> — with nothing checking the result. axe is the check.
//
// Scoped to WCAG 2.1 A/AA, which is the level the rest of the site's
// accessibility work targets (the goggles use WCAG AA contrast ratios).
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

function audit(page: Page) {
  return new AxeBuilder({ page }).withTags(TAGS)
}

async function expectClean(page: Page, where: string) {
  const { violations } = await audit(page).analyze()
  const summary = violations.map((v) =>
    `${v.id} (${v.impact}) — ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`)
  expect(summary, `${where} has accessibility violations`).toEqual([])
}

test.describe('every screen passes an automated WCAG audit', () => {
  test('the wheel', async ({ page }) => {
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    await expectClean(page, 'Wheel')
  })

  test('browse', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid').first().waitFor()
    await expectClean(page, 'Browse')
  })

  test('match', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Match' }).first().click()
    await page.getByRole('radiogroup', { name: /matching level/i }).waitFor()
    await expectClean(page, 'Match')
  })

  test('the You tab', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'You' }).first().click()
    await expectClean(page, 'You')
  })

  test('about', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'About' }).first().click()
    await expectClean(page, 'About')
  })

  test('a combination detail panel', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.plate-button').first().click()
    await page.locator('.copy-field').first().waitFor()
    await expectClean(page, 'Combination detail')
  })

  // The overlays, which is where this release changed the most.
  test('the sampler overlay', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: /sample a color/i }).first().click()
    await page.getByRole('dialog', { name: 'Sample a color' }).waitFor()
    await expectClean(page, 'Sampler overlay')
  })

  test('the colour picker overlay', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: /sample a color/i }).first().click()
    await page.getByRole('button', { name: /pick a color/i }).click()
    await page.getByRole('dialog', { name: 'Pick a color' }).waitFor()
    await expectClean(page, 'Colour picker overlay')
  })

  // The search type-ahead: rebuilt as an ARIA 1.2 combobox in this release.
  test('the search type-ahead with results open', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('combobox', { name: 'Search colors' }).fill('blue')
    await page.getByRole('option').first().waitFor()
    await expectClean(page, 'Search type-ahead')
  })
})
