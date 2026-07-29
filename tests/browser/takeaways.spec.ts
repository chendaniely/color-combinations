import { expect, test } from '@playwright/test'

// The two things a visitor can TAKE AWAY: a colour code on the clipboard, and a
// plate as a PNG. Coverage said both were effectively untested — src/copy.ts at
// 0% and src/exportPng.ts at 13.88% with not one function covered — because
// neither the clipboard nor a file download exists in jsdom. They had been
// sitting on the owner's manual browser checklist instead.
//
// exportPng also changed in v1.6.0 (it now shares barWeights with PlateCard),
// which made it the riskiest untested edit on the branch.

async function openFirstCombination(page: import('@playwright/test').Page) {
  await page.goto('./')
  await page.getByRole('link', { name: 'Browse' }).or(
    page.getByRole('button', { name: 'Browse' })).first().click()
  // Plates are buttons captioned "No. N — names".
  await page.locator('.plate-button').first().click()
  await page.locator('.copy-field').first().waitFor()
}

test.describe('taking a colour away', () => {
  test('copy puts the real hex on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openFirstCombination(page)

    const field = page.locator('.copy-field').first()
    const shown = (await field.locator('code').innerText()).trim()
    expect(shown).toMatch(/^#[0-9a-f]{6}$/i)

    await field.getByRole('button').click()

    // The button confirms, and the clipboard actually holds the value — the
    // confirmation alone would pass even if copyText silently failed.
    await expect(field.getByRole('button')).toHaveText(/copied/i)
    const clipboard = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboard).toBe(shown)
  })

  test('copy falls back rather than throwing when the clipboard is denied', async ({ page }) => {
    // No permission granted: navigator.clipboard.writeText rejects, and
    // copy.ts must fall through to its execCommand path without an exception
    // escaping into React.
    await openFirstCombination(page)
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.locator('.copy-field').first().getByRole('button').click()
    await page.waitForTimeout(200)
    expect(errors).toEqual([])
  })
})

test.describe('taking a plate away', () => {
  test('Download PNG produces a real, non-empty PNG named after the combination', async ({ page }) => {
    await openFirstCombination(page)

    const number = await page.locator('.plate-number').first().innerText()
    const id = number.replace(/\D+/g, '')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download png/i }).click(),
    ])

    expect(download.suggestedFilename()).toBe(`sanzo-wada-${id}.png`)

    const stream = await download.createReadStream()
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(chunk as Buffer)
    const bytes = Buffer.concat(chunks)

    // A real PNG, not an empty file or an error page.
    expect(bytes.length).toBeGreaterThan(1000)
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  })

  test('the exported plate matches the plate on screen, bar for bar', async ({ page }) => {
    // The reason src/plateLayout.ts exists: PlateCard lays the plate out with
    // flex-grow and exportPng draws the same plate onto a canvas. When they
    // each hard-coded the taper, a drift would ship a download that did not
    // match what the visitor clicked. This asserts they still agree.
    await openFirstCombination(page)

    // Wait for the "deal" animation to finish before measuring. It contains
    // `rotate(-1.5deg)`, and a rotation inflates an element's axis-aligned
    // bounding box by an amount that depends on its width — so mid-animation
    // the bars measured ~8% tall and, crucially, by DIFFERENT factors each,
    // which skewed the ratios. That made this test flaky (it passed alone and
    // failed under load) until the wait was added. Waiting on the animation
    // itself rather than a sleep, so it stays correct if the duration changes.
    await page.locator('.plate-large').first().evaluate(async (el) => {
      await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished))
    })

    // Scoped to the OPEN plate's own bar stack. A bare `.plate-bar` also
    // matches every plate still rendered behind the panel.
    const onScreen = await page.locator('.plate-large .plate-bars').first()
      .locator('.plate-bar')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))
    expect(onScreen.length).toBeGreaterThan(1)

    const total = onScreen.reduce((a, b) => a + b, 0)
    const fractions = onScreen.map((h) => h / total)

    // The same weights the exporter uses, recomputed here from the shared
    // module's constant so a change to one side fails this test.
    const expected = await page.evaluate(() => {
      const TAPER = [1.5, 1.15, 0.9, 0.75, 0.7]
      return TAPER
    })
    const w = expected.slice(0, onScreen.length)
    const wTotal = w.reduce((a, b) => a + b, 0)
    w.forEach((weight, i) => {
      expect(fractions[i]).toBeCloseTo(weight / wTotal, 2)
    })
  })
})

// The generated CSS, parsed by an actual browser. The unit tests assert the
// identifiers match a regex; this asserts Chromium keeps them — which is the
// thing that was actually broken. Before cssVarName, `--hay's-russet` was
// dropped silently on parse, so a visitor pasting Copy CSS got a stylesheet
// missing colours with no error anywhere.
test('every combination\'s Copy CSS survives a real CSS parser', async ({ page }) => {
  const { readFileSync } = await import('node:fs')
  const { index } = await import('../../src/core/dataset')
  const { validateDataset } = await import('../../src/core/validate')
  const { cssVariablesFor } = await import('../../src/core/export')

  const ix = index(validateDataset(
    JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8'))))
  const cases = ix.data.combinations
    .filter((c) => !c.excluded)
    .map((c) => ({ id: c.id, css: cssVariablesFor(ix, c), expected: c.colorIds.length }))

  await page.goto('./')
  const dropped = await page.evaluate((all) => {
    const bad: string[] = []
    for (const { id, css, expected } of all) {
      const sheet = new CSSStyleSheet()
      sheet.replaceSync(css)
      const rule = sheet.cssRules[0] as CSSStyleRule | undefined
      // Every declaration the exporter wrote must have survived the parse.
      const kept = rule ? rule.style.length : 0
      if (kept !== expected) bad.push(`combination ${id}: wrote ${expected}, browser kept ${kept}`)
    }
    return bad
  }, cases)

  expect(dropped, 'the browser discarded custom properties').toEqual([])
})
