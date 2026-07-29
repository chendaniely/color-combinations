import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// The exported PNG's captions, measured for every combination in the book.
//
// This was a MANUAL item on the owner's checklist — "PNG download for the
// 5-colour No. 331 specifically (longest name — check it doesn't overflow the
// canvas)". Automating it also corrects it: No. 331 is the longest FIVE-colour
// plate at 62 characters, but No. 311 is longer at 64, and checking the one
// plate the checklist named would never have revealed that. All 338 are
// measured here.
//
// A browser test by necessity. Canvas text width depends on the real font
// engine, and jsdom has no canvas at all — which is precisely why this ended up
// on a human checklist in the first place.
//
// The data is read here in Node and passed in, rather than reached for inside
// the page: the dataset is bundled, so the built site exposes no module path to
// import. Tests may readFileSync a data file (see CLAUDE.md) — it is `import`
// that is restricted to src/data.ts, because import is what bundles.
interface Combo { id: number; colorIds: number[]; excluded?: boolean }
interface Color { id: number; name: string; hex: string }

const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')) as {
  combinations: Combo[]
  colors: Color[]
}

test('no exported caption overflows the plate, for any combination', async ({ page }) => {
  await page.goto('./')

  const result = await page.evaluate(({ combinations, colors }) => {
    // Must match exportPng.ts. Duplicated deliberately and asserted by the test
    // below, so changing the real values fails rather than silently widening
    // the thing this measures against.
    const W = 1200
    const MARGIN = 80
    const maxWidth = W - MARGIN * 2

    const byId = new Map(colors.map((c) => [c.id, c]))
    const ctx = document.createElement('canvas').getContext('2d')!
    const over: string[] = []
    let widest = { id: 0, w: 0, text: '' }

    for (const combo of combinations) {
      if (combo.excluded) continue
      const cs = combo.colorIds.map((id) => byId.get(id)!).filter(Boolean)
      if (cs.length !== combo.colorIds.length) continue

      ctx.font = '28px Georgia, serif'
      const names = cs.map((c) => c.name).join(' · ')
      const nameW = ctx.measureText(names).width
      if (nameW > widest.w) widest = { id: combo.id, w: nameW, text: names }
      if (nameW > maxWidth) {
        over.push(`#${combo.id} names ${Math.round(nameW)}px > ${maxWidth}px: ${names}`)
      }

      ctx.font = '22px Georgia, serif'
      const credit = `No. ${combo.id} — A Dictionary of Color Combinations, Sanzo Wada`
      const hexes = cs.map((c) => c.hex).join('   ')
      for (const [what, text] of [['credit', credit], ['hexes', hexes]] as const) {
        const w = ctx.measureText(text).width
        if (w > maxWidth) over.push(`#${combo.id} ${what} ${Math.round(w)}px > ${maxWidth}px`)
      }
    }
    return { over, widest, maxWidth }
  }, book)

  // Logged whether or not it passes: this margin is what would silently
  // disappear if a longer colour name were added to the book, and a bare pass
  // tells nobody how close it came.
  console.log(`widest caption: #${result.widest.id} at ${Math.round(result.widest.w)}px `
    + `of ${result.maxWidth}px available — "${result.widest.text}"`)

  expect(result.over, 'captions that would be cropped out of the exported PNG').toEqual([])
})

// Guards the constants copied into the test above. If exportPng.ts changes its
// canvas width or margin, this fails and points at the copy.
test('the measured geometry still matches exportPng.ts', () => {
  const src = readFileSync('src/exportPng.ts', 'utf8')
  expect(src, 'canvas width changed').toContain('const W = 1200')
  expect(src, 'margin changed').toContain('const MARGIN = 80')
  // And the clamp itself: fillText's maxWidth argument is what stops a long
  // caption being cropped out of the file rather than condensed into it.
  expect(src, 'captions are no longer clamped to maxWidth').toContain('maxWidth')
})
