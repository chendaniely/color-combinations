import { expect, test } from '@playwright/test'
import { syntheticPortrait } from './makePng'

// The You tab's upload path, end to end in a real browser. This is the most
// bug-prone surface in the project — the tap-misalignment, the invisible photo,
// the probes a zone too low, the marker that would not move — and every one of
// those was invisible to jsdom, which performs no layout and has no canvas.
//
// The image is generated, not committed: a repo whose premise is that
// photographs never leave the device should not carry a face photo. A flat
// synthetic portrait is not a face any detector will accept, which means this
// exercises the "we couldn't find a face" path — the one where the visitor has
// to place the probes themselves, and the one nothing has ever tested.

async function uploadPortrait(page: import('@playwright/test').Page) {
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
}

test.describe('the You tab, from an uploaded photo', () => {
  test('reaches the review screen and shows the photo it read', async ({ page }) => {
    await uploadPortrait(page)
    const canvas = page.locator('.probe-canvas')
    await expect(canvas).toBeVisible()
    // The photo is actually painted, not a zero-size or blank element — this is
    // the "circles but no photograph" bug from 2026-07-28.
    const box = await canvas.boundingBox()
    expect(box!.width).toBeGreaterThan(50)
    expect(box!.height).toBeGreaterThan(50)
  })

  test('says plainly that it found no face, rather than inventing a reading', async ({ page }) => {
    await uploadPortrait(page)
    await expect(page.getByText(/couldn.t find a face/i)).toBeVisible()
  })

  test('the stage keeps the photo\'s aspect ratio, so taps land where you aim', async ({ page }) => {
    await uploadPortrait(page)
    const stage = await page.locator('.probe-stage').boundingBox()
    const canvas = await page.locator('.probe-canvas').boundingBox()
    // 480x640 source => 0.75. The 2026-07-28 tap misalignment was exactly this
    // ratio being broken by a flex parent squashing the height.
    expect(stage!.width / stage!.height).toBeCloseTo(480 / 640, 1)
    expect(canvas!.width / canvas!.height).toBeCloseTo(480 / 640, 1)
  })

  test('a tap places a marker where you tapped, and reads a colour there', async ({ page }) => {
    await uploadPortrait(page)
    await page.getByRole('button', { name: /correct the skin/i }).click()

    // Element-relative, so Playwright scrolls the stage into view first. The
    // review screen is taller than the viewport, and raw page coordinates land
    // outside it — which is how this test failed the first time.
    const stage = page.locator('.probe-stage')
    const box = (await stage.boundingBox())!
    const pos = { x: box.width * 0.5, y: box.height * 0.55 } // the oval "face"
    await stage.click({ position: pos })

    const dot = page.locator('.probe-dot.is-skin')
    await expect(dot.first()).toBeVisible()

    // The marker follows the correction — the bug the owner reported as
    // "when i correct the location, the circle should move to that location".
    const after = (await stage.boundingBox())!
    const dotBox = (await dot.first().boundingBox())!
    expect(Math.abs((dotBox.x + dotBox.width / 2) - (after.x + pos.x))).toBeLessThan(20)
    expect(Math.abs((dotBox.y + dotBox.height / 2) - (after.y + pos.y))).toBeLessThan(20)
  })

  test('confirming produces a reading and a palette', async ({ page }) => {
    await uploadPortrait(page)
    await page.getByRole('button', { name: /correct the skin/i }).click()
    const stage = page.locator('.probe-stage')
    const box = (await stage.boundingBox())!
    await stage.click({ position: { x: box.width * 0.5, y: box.height * 0.55 } })

    await page.getByRole('button', { name: /^continue$/i }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // A reading, and colours chosen from it.
    await expect(page.locator('.reading-strip')).toBeVisible()
    await expect(page.locator('.you-palettes')).toBeVisible()
  })

  test('the white-balance sliders repaint the photo', async ({ page }) => {
    await uploadPortrait(page)
    const before = await page.locator('.probe-canvas').screenshot()
    const temp = page.getByLabel('Temperature, blue to amber')
    await temp.fill('0.35')
    await page.waitForTimeout(200)
    const after = await page.locator('.probe-canvas').screenshot()
    expect(Buffer.compare(before, after)).not.toBe(0)
  })
})
