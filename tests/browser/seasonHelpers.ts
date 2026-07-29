import { expect, type Page } from '@playwright/test'
import { syntheticPortrait } from './makePng'

// Getting to the season palette takes four screens and a photo upload, which is
// why it went unaudited until 2026-07-29. Shared so any spec can reach it
// without repeating the walk — a11y.spec.ts, mobile.spec.ts and
// seasonFit.spec.ts all need it.
export async function reachThePalette(page: Page) {
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
  await page.getByRole('dialog', { name: 'Check what we read' }).waitFor({ timeout: 30_000 })

  await page.getByRole('button', { name: /correct the skin/i }).click()
  const stage = page.locator('.probe-stage')
  const box = (await stage.boundingBox())!
  await stage.click({ position: { x: box.width * 0.5, y: box.height * 0.55 } })
  await page.getByRole('button', { name: /^continue$/i }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('.you-palettes').waitFor()
}
