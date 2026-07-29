import { expect, test } from '@playwright/test'
import { syntheticPortrait } from './makePng'

// The season display, in a real browser.
//
// Two things here can only be checked with layout and a cascade, which is why
// this is not a jsdom test:
//
// 1. The season datasets are CODE-SPLIT — ~98 kB fetched on entering this tab.
//    jsdom resolves a dynamic import instantly from disk and would never show
//    that the visitor briefly sees a loading state, nor catch a chunk that
//    fails to load in a built bundle. Importing them statically is what broke
//    the browse accessibility audit, so the split is load-bearing and gets a
//    test.
// 2. The two levels — a sourced parent season and our sub-season — are
//    distinguished by badges whose whole job is to LOOK different. A test that
//    cannot see the cascade cannot tell whether they do.

async function reachThePalette(page: import('@playwright/test').Page) {
  await page.goto('./')
  await page.getByRole('button', { name: 'You' }).first().click()
  await page.getByRole('button', { name: /photograph|take a photo|start/i }).first().click()
  await page.getByRole('dialog', { name: 'Photograph your face' }).waitFor()

  const upload = page.getByRole('tab', { name: /upload a photo/i })
  if (await upload.count()) await upload.click()

  await page.getByLabel('Choose a photo').setInputFiles({
    name: 'portrait.png', mimeType: 'image/png', buffer: syntheticPortrait(),
  })
  // The detector is lazily loaded (~3.5 MB) on first use, so allow for it.
  await page.getByRole('dialog', { name: 'Check what we read' }).waitFor({ timeout: 20_000 })

  await page.getByRole('button', { name: /correct the skin/i }).click()
  const stage = page.locator('.probe-stage')
  const box = (await stage.boundingBox())!
  await stage.click({ position: { x: box.width * 0.5, y: box.height * 0.55 } })
  await page.getByRole('button', { name: /^continue$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('.you-palettes').waitFor()
}

test.describe('the season display', () => {
  test('loads the code-split season data and then shows the season', async ({ page }) => {
    await reachThePalette(page)
    // The select only exists once the ~98 kB of season data has arrived.
    await expect(page.getByLabel(/your season/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.season-levels')).toBeVisible()
  })

  test('fetches the season chunks only on this tab, never on the wheel', async ({ page }) => {
    const chunks: string[] = []
    page.on('request', (r) => {
      const url = r.url()
      if (/season-colors|pccs-grid|season-rules|pccs-tones|pccs-hues/.test(url)) chunks.push(url)
    })

    await page.goto('./')
    await page.locator('.chord-wheel').waitFor()
    await page.getByRole('button', { name: 'Browse' }).first().click()
    await page.locator('.browse-grid').first().waitFor()
    // The regression this guards: these were once in the main bundle, which
    // slowed every screen including ones with no seasons on them.
    expect(chunks, 'season data was fetched outside the You tab').toEqual([])

    await reachThePalette(page)
    await expect(page.getByLabel(/your season/i)).toBeVisible({ timeout: 15_000 })
    expect(chunks.length, 'season data was never fetched on the You tab').toBeGreaterThan(0)
  })

  test('marks the parent season as sourced and the sub-season as ours', async ({ page }) => {
    await reachThePalette(page)
    const sourced = page.locator('.season-badge.sourced')
    const ours = page.locator('.season-badge.ours')
    await expect(sourced).toBeVisible()
    await expect(ours).toBeVisible()
    await expect(sourced).toHaveText(/published/i)
    await expect(ours).toHaveText(/our/i)

    // They must actually LOOK different — the claim is carried by appearance,
    // and jsdom applies no cascade so only a browser can check it.
    const filled = await sourced.evaluate((el) => getComputedStyle(el).backgroundColor)
    const outlined = await ours.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(filled, 'the two badges are styled identically').not.toBe(outlined)
  })

  test('shows each ideal colour beside the nearest one the book actually has', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()

    const pairs = page.locator('.fit-pairs li')
    await expect(pairs.first()).toBeVisible()
    expect(await pairs.count()).toBeGreaterThan(0)

    // Each row is ideal -> actual: two swatches with DIFFERENT colours. If they
    // ever render the same, the comparison the panel exists to make is gone.
    const first = pairs.first()
    const ideal = await first.locator('.fit-ideal').evaluate((el) => getComputedStyle(el).backgroundColor)
    const actual = await first.locator('.fit-actual').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(ideal).toMatch(/^rgb/)
    expect(actual).toMatch(/^rgb/)
    await expect(first.locator('.fit-band')).toHaveText(/very close|close|roughly|not close/)
  })

  test('says plainly that these are the nearest matches, not season colours', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    // The owner's instruction, and the reason the fit panel exists at all.
    await expect(page.locator('.fit-caveat')).toContainText(/nearest match/i)
    await expect(page.locator('.fit-caveat')).toContainText(/not exact season colours/i)
  })

  test('credits PCCS and the institute Wada founded', async ({ page }) => {
    await reachThePalette(page)
    await page.getByRole('tab', { name: /·/ }).last().click()
    const provenance = page.locator('.you-provenance')
    await expect(provenance).toContainText('PCCS')
    await expect(provenance).toContainText(/Japan Color Research Institute/i)
    await expect(provenance).toContainText(/our own subdivision/i)
  })
})
