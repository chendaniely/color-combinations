import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { reachThePalette } from './seasonHelpers'

// Deep links, end to end in a real browser.
//
// The pure encoder is covered exhaustively in tests/urlState.test.ts, including
// 21 hostile inputs, so nothing here re-tests string handling. What only a
// browser has is a HISTORY STACK and real navigation: jsdom has a `history`
// object but no back and forward, so a Back test there would be testing the
// polyfill rather than the feature.
//
// It also has an address bar, which is how the one defect in this feature was
// found: URLSearchParams percent-encoded the `:` in `open=combination:1` and
// every round-trip test stayed green, because decoding is symmetric.

const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')) as {
  colors: { id: number; name: string }[]
}
const aColor = book.colors[0]

test.describe('the address bar follows the state', () => {
  test('the default page has no hash at all', async ({ page }) => {
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    // The front page should keep the address it has always had; a trailing "#"
    // in a pasted link looks like a mistake.
    expect(page.url()).not.toContain('#')
  })

  test('changing the view, a filter and a panel each show up', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid').first().waitFor()
    expect(page.url()).toContain('#/browse')

    await page.getByLabel('Color family').selectOption({ index: 1 })
    await page.waitForTimeout(150)
    expect(page.url()).toContain('family=')

    await page.locator('.plate-button').first().click()
    await page.locator('.copy-field').first().waitFor()
    expect(page.url()).toContain('open=combination:')
  })

  // The defect the address bar revealed. Both characters are legal unencoded,
  // and the whole argument for this format is that a person can read the link.
  test('keeps colons and commas readable, not percent-encoded', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid').first().waitFor()
    await page.getByRole('button', { name: '2', exact: true }).click()
    await page.locator('.plate-button').first().click()
    await page.locator('.copy-field').first().waitFor()
    expect(page.url()).not.toContain('%3A')
    expect(page.url()).not.toContain('%2C')
  })
})

test.describe('a pasted link restores what it points at', () => {
  test('a view and a filter', async ({ page }) => {
    await page.goto('./#/browse?sizes=2')
    await page.locator('.browse-grid').first().waitFor()
    // The size chip the link asked for is the pressed one.
    await expect(page.getByRole('button', { name: '2', exact: true }))
      .toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: '3', exact: true }))
      .toHaveAttribute('aria-pressed', 'false')
  })

  test('an open colour panel, on the first paint', async ({ page }) => {
    await page.goto(`./#/wheel?open=color:${aColor.id}`)
    // Seeded into useReducer rather than applied in an effect, so the panel is
    // there immediately instead of flashing the default view first.
    await expect(page.locator('.panel').first()).toBeVisible()
    await expect(page.locator('.panel')).toContainText(aColor.name)
  })

  test('a season, with no reading and no photo prompt in the way', async ({ page }) => {
    await page.goto('./#/you?season=deep-autumn')
    await expect(page.getByLabel(/your season/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.season-sub')).toContainText(/deep autumn/i)
    await expect(page.locator('.shared-season')).toContainText(/opened from a shared link/i)
    // No measurement of the reader happened, so no tab strip claims one.
    await expect(page.getByRole('tab')).toHaveCount(0)
  })

  test('the goggles', async ({ page }) => {
    await page.goto('./#/browse?lens=colorblind')
    await page.locator('.browse-grid').first().waitFor()
    expect(page.url()).toContain('lens=colorblind')
  })
})

// The owner's decision: panels push, everything else replaces.
test.describe('the Back button', () => {
  test('closes an open panel and leaves the view alone', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid').first().waitFor()
    await page.locator('.plate-button').first().click()
    await page.locator('.copy-field').first().waitFor()

    await page.goBack()
    await expect(page.locator('.copy-field')).toHaveCount(0)
    await expect(page.locator('.browse-grid').first()).toBeVisible()
    expect(page.url()).toContain('#/browse')
  })

  test('does not stack an entry per filter change', async ({ page }) => {
    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    // Three granularity changes. If each pushed, Back would walk them.
    for (const level of ['Shades', 'Families', 'Groups']) {
      await page.getByRole('radio', { name: new RegExp(level, 'i') }).click()
      await page.waitForTimeout(120)
    }
    await page.goBack()
    // Back leaves the site rather than retracing, so we are off the app.
    await page.waitForTimeout(300)
    expect(page.url()).not.toContain('#/')
  })

  test('forward reopens what Back closed', async ({ page }) => {
    await page.goto(`./#/wheel?open=color:${aColor.id}`)
    await expect(page.locator('.panel').first()).toBeVisible()
    await page.goBack()
    await expect(page.locator('.panel')).toHaveCount(0)
    await page.goForward()
    await expect(page.locator('.panel').first()).toBeVisible()
  })
})

test.describe('a stale or hostile link never breaks the page', () => {
  test('an id the book has not got explains itself', async ({ page }) => {
    await page.goto('./#/wheel?open=color:999999')
    await expect(page.locator('.panel')).toContainText(/not in this book/i)
    // And the rest of the site still works, which is the point — the
    // ErrorBoundary is at the root, so a throw here would have cost everything.
    await expect(page.locator('.chord-wheel')).toBeVisible()
  })

  test('a palette key that no longer exists drops out, and Match still renders',
    async ({ page }) => {
      await page.goto('./#/match?keys=not-a-shade')
      await expect(page.getByRole('radiogroup', { name: /matching level/i })).toBeVisible()
      // keyName throws on an unknown key and PaletteTray renders every key, so
      // before sanitising this took the whole app down.
      await expect(page.locator('.chip')).toHaveCount(0)
    })

  test('pure nonsense lands on the default view', async ({ page }) => {
    await page.goto('./#/nonsense?g=99&open=color:abc&sizes=9')
    await expect(page.locator('.chord-wheel')).toBeVisible()
    await expect(page.locator('.panel')).toHaveCount(0)
  })
})

test.describe('the Share button', () => {
  test('copies the address for the screen it is on', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(`./#/wheel?open=combination:331`)
    await page.locator('.copy-field').first().waitFor()
    await page.getByRole('button', { name: /copy link to this combination/i }).click()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toContain('open=combination:331')
  })

  test('a You link carries the season and no measurement of anybody',
    async ({ page, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await reachThePalette(page)
      await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
      await page.getByRole('tab').nth(1).click()
      await page.getByRole('button', { name: /copy link to/i }).click()

      const copied = await page.evaluate(() => navigator.clipboard.readText())
      expect(copied).toContain('season=')
      // The owner's privacy decision, checked on the real thing a visitor
      // would paste rather than on the encoder's output.
      for (const leak of ['skin', 'hair', 'ita', 'skinL', 'skinHue']) {
        expect(copied, `${leak} appears in a shared link`).not.toContain(leak)
      }
      expect(copied, 'a hex colour appears in a shared link').not.toMatch(/[0-9a-f]{6}/i)
    })
})
