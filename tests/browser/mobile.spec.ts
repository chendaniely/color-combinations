import AxeBuilder from '@axe-core/playwright'
import { reachThePalette } from './seasonHelpers'
import { expect, test } from '@playwright/test'

// Phone-sized checks. These were on the owner's manual browser checklist
// ("layout at 375px width", "prefers-reduced-motion actually suppresses the
// crossfade") — items a real browser can settle and jsdom never could.
//
// 375px is the iPhone SE / mini width, the narrowest mainstream viewport, and
// the one the You tab most needs to work at: people photograph their own face
// on a phone.
const PHONE = { width: 375, height: 667 }

test.describe('at phone width', () => {
  test.use({ viewport: PHONE })

  // The classic mobile defect: something a few pixels too wide makes the whole
  // page scroll sideways. Checked on every view because any one of them can
  // introduce it.
  for (const view of ['Wheel', 'Match', 'Browse', 'You', 'About']) {
    test(`${view} never scrolls sideways`, async ({ page }) => {
      await page.goto('./')
      await page.getByRole('button', { name: view }).first().click()
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(overflow.scrollWidth,
        `${view} is ${overflow.scrollWidth - overflow.clientWidth}px too wide`)
        .toBeLessThanOrEqual(overflow.clientWidth)
    })
  }

  test('the sampler overlay fits the screen', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: /sample a color/i }).first().click()
    await page.getByRole('dialog', { name: 'Sample a color' }).waitFor()
    const box = await page.getByRole('dialog').boundingBox()
    expect(box!.width).toBeLessThanOrEqual(PHONE.width)
  })

  // WCAG 2.2 target size (minimum) is 24x24 CSS px. The info tips were fixed
  // by hand during v1.5.0 after being measured at 18px; this stops that
  // regressing, and covers the other small controls at the same time.
  test('interactive controls are big enough to hit with a finger', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'You' }).first().click()
    const small = await page.evaluate(() => {
      const out: string[] = []
      for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue // not rendered
        // Allow for a padded hit area declared via ::before, which is how
        // .infotip-btn reaches 44px without looking 44px.
        const before = getComputedStyle(el, '::before')
        const hasHitArea = before.content !== 'none' && before.position === 'absolute'
        if (hasHitArea) continue
        if (r.width < 24 || r.height < 24) {
          out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
      }
      return out
    })
    expect(small, 'controls smaller than the 24x24 WCAG 2.2 minimum').toEqual([])
  })

  test('passes the same WCAG audit at phone width', async ({ page }) => {
    await page.goto('./')
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(violations.map((v) => `${v.id} — ${v.help}`)).toEqual([])
  })
})

test.describe('with reduced motion requested', () => {
  // Set per-page via emulateMedia rather than test.use — reducedMotion is not
  // in this Playwright version's `use` option types, and emulateMedia is the
  // documented equivalent.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  // app.css kills every animation and transition under this media query. The
  // owner's checklist asked whether it really does; nothing verified it.
  test('no animation runs when a panel opens', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.plate-button').first().click()
    await page.locator('.panel').waitFor()

    const running = await page.evaluate(() =>
      document.getAnimations()
        .filter((a) => a.playState === 'running')
        .map((a) => (a.effect as KeyframeEffect | null)?.target?.nodeName ?? 'unknown'))
    expect(running, 'animations ran despite prefers-reduced-motion').toEqual([])
  })

  test('the panel is still fully visible, not stuck mid-animation', async ({ page }) => {
    await page.goto('./')
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.plate-button').first().click()
    const panel = page.locator('.panel')
    await expect(panel).toBeVisible()
    // Suppressing the animation must not leave the opening transform applied.
    const opacity = await panel.evaluate((el) => getComputedStyle(el).opacity)
    expect(Number(opacity)).toBe(1)
  })
})

// The season display at phone width, added 2026-07-29.
//
// The loop above walks the five top-level views. The season palette is three
// screens past "You" and needs a photo upload, so it was never measured —
// exactly the gap that let an accessibility violation ship on the same screen.
//
// It is the most overflow-prone layout on the site: each fit row is a flex line
// holding two swatches, an arrow, a colour name and a band label, and some of
// Wada's names are long ("Mars Brown / Tobacco", "Light Pinkish Cinnamon").
test.describe('the season display at phone width', () => {
  test.use({ viewport: PHONE })

  test('never scrolls sideways, even with the longest colour names', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    await page.getByRole('tab').nth(1).click()
    await page.locator('.fit-pairs li').first().waitFor()

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth,
      `the season display is ${overflow.scrollWidth - overflow.clientWidth}px too wide`)
      .toBeLessThanOrEqual(overflow.clientWidth)
  })

  test('a fit row keeps both swatches and its band on screen', async ({ page }) => {
    await reachThePalette(page)
    await page.getByLabel(/your season/i).waitFor({ timeout: 20_000 })
    await page.getByRole('tab').nth(1).click()
    const row = page.locator('.fit-pairs li').first()
    await row.waitFor()

    // The comparison is the whole point of the panel: if the band label wraps
    // off or a swatch collapses to nothing, the row stops saying anything.
    for (const part of ['.fit-ideal', '.fit-actual', '.fit-band']) {
      const box = await row.locator(part).boundingBox()
      expect(box, `${part} is not rendered`).not.toBeNull()
      expect(box!.width, `${part} collapsed to ${box!.width}px`).toBeGreaterThan(4)
      expect(box!.x + box!.width, `${part} runs off the right edge`)
        .toBeLessThanOrEqual(PHONE.width)
    }
  })
})
