import AxeBuilder from '@axe-core/playwright'
import { reachThePalette } from './seasonHelpers'
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
  // Let every running animation finish first.
  //
  // `.panel` opens with `@keyframes panel-in { from { opacity: 0 } }`, so a
  // panel audited immediately after a click is still half-transparent, and axe
  // computes contrast against the blended result. That produced a
  // colour-contrast failure on the group panel whose own measured values are
  // 7.08:1 — a false positive that looked exactly like a real defect and cost
  // an hour to disbelieve.
  //
  // Done here rather than at each call site so all thirteen audits are immune,
  // including the original nine, which were one CSS change away from the same
  // flake.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))
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

// The tenth screen, added 2026-07-29 after it shipped unaudited.
//
// "the You tab" above audits the LANDING screen — a heading and a "Take a
// photo" button. The season display is three screens deeper and needs a photo
// upload to reach, so nothing here ever saw it. That gap let a real violation
// through: the "not close" band was set in the NYC orange, which measures
// 2.92:1 against --paper-1 where AA small text needs 4.50, on a site that
// ships WCAG contrast goggles.
//
// Lives here rather than in seasonFit.spec.ts so it sits with the other nine
// and cannot be forgotten when a screen is added.
test.describe('the season display passes the same audit', () => {
  test('the season palette and its fit panel', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    await expectClean(page, 'Season palette')

    // And the fit panel, which is a different subtree.
    await page.getByRole('tab').nth(1).click()
    await page.locator('.fit-pairs li').first().waitFor()
    await expectClean(page, 'Season fit panel')
  })
})

// Screens the original nine missed, added 2026-07-29 after the season display
// turned out to be unaudited and to contain a real violation.
//
// These are not obscure states. A colour detail panel is where anyone lands
// from the wheel or from search; a group panel is one click further; Match with
// a palette in it is the whole point of Match. None had ever been audited,
// because the original list grew by hand and nobody enumerated what was left.
test.describe('the screens the first nine missed', () => {
  test('a colour detail panel', async ({ page }) => {
    await page.goto('./')
    await page.getByLabel('Search colors').fill('blue')
    await page.getByRole('option').first().waitFor()
    await page.getByRole('option').first().click()
    await page.getByRole('dialog').or(page.locator('.panel')).first().waitFor()
    await expectClean(page, 'Colour detail')
  })

  test('a group detail panel', async ({ page }) => {
    await page.goto('./')
    // Via the colour panel's family breadcrumb, not by clicking an arc: the
    // wheel puts a full-radius .wheel-hit circle over the arcs to drive
    // hover and touch-scrub, so it swallows the click. The breadcrumb is a
    // real route a visitor uses and a stable one for a test.
    await page.getByLabel('Search colors').fill('blue')
    await page.getByRole('option').first().waitFor()
    await page.getByRole('option').first().click()
    await page.locator('.family-chain').waitFor()
    await page.locator('.family-chain button').first().click()
    await page.locator('.crumb').waitFor()
    await expectClean(page, 'Group detail')
  })

  test('Match with a palette built', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Match' }).first().click()
    await page.getByRole('radiogroup', { name: /matching level/i }).waitFor()
    const first = page.locator('.match-view button').filter({ hasText: /\w/ })
    await first.nth(3).click()
    await page.waitForTimeout(300)
    await expectClean(page, 'Match with a palette')
  })

  // NOT audited here: MissingPanel. It is only reachable from app state naming
  // something the book has not got, which nothing outside the app can set until
  // deep links exist. A draft of this test "reached" it by opening an ordinary
  // panel from search and auditing that, which duplicated the colour-detail
  // test above and proved nothing. Its markup is covered by
  // tests/missingIds.test.tsx; audit it here once a URL can produce it.
})
