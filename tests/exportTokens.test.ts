// The PNG export's colour fallbacks must match the tokens they stand in for.
//
// This is the guard for a bug that already happened. A canvas cannot use
// `var(--ink)`, so exportPng.ts once hardcoded the hex values. v1.6.0 re-solved
// the three ink tokens for WCAG AA contrast — moving --ink-muted from #7e7468
// to #554c41 — and this copy kept the old one. Every PNG the site exported
// carried caption text at 4.24:1 against the 4.50 AA requires, on the artefact
// people share and print.
//
// The export now READS the tokens at run time, so the live path cannot drift.
// But it keeps literal fallbacks for jsdom, which returns nothing for custom
// properties, and those fallbacks can go stale exactly as the originals did.
// This test is what stops that happening twice.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const tokensCss = readFileSync('src/styles/tokens.css', 'utf8')
const exportSrc = readFileSync('src/exportPng.ts', 'utf8')

function token(name: string): string {
  const m = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  if (!m) throw new Error(`--${name} is not a hex token in tokens.css`)
  return m[1].toLowerCase()
}

/** Every `token('--x', '#yyy')` call in the export, as [name, fallback]. */
function fallbacks(): [string, string][] {
  return [...exportSrc.matchAll(/token\('--([a-z0-9-]+)',\s*'(#[0-9a-fA-F]{6})'\)/g)]
    .map((m) => [m[1], m[2].toLowerCase()])
}

describe('the PNG export reads its colours rather than copying them', () => {
  it('calls getComputedStyle, so the live path uses the real tokens', () => {
    expect(exportSrc).toContain('getComputedStyle')
  })

  it('has a fallback for every colour it draws', () => {
    expect(fallbacks().length).toBeGreaterThanOrEqual(3)
  })

  it('names only tokens that exist', () => {
    for (const [name] of fallbacks()) {
      expect(() => token(name), `--${name} is not in tokens.css`).not.toThrow()
    }
  })

  // The assertion that would have caught the original bug.
  it('keeps every fallback equal to its current token value', () => {
    for (const [name, fallback] of fallbacks()) {
      expect(
        fallback,
        `exportPng.ts falls back to ${fallback} for --${name}, which is now ${token(name)} `
        + '— update the fallback, or exported PNGs will disagree with the site',
      ).toBe(token(name))
    }
  })
})

describe('no stale ink values survive anywhere in src/', () => {
  // The three values v1.6.0 retired for failing WCAG AA. Naming them
  // explicitly is worth more than a general rule: these exact strings are what
  // a copy-paste from an old file or an old commit would reintroduce.
  const RETIRED = {
    '#b8aea2': '--ink-faint, was 2.02:1',
    '#7e7468': '--ink-muted, was 4.24:1',
  }

  it('does not mention a retired ink value outside a comment', () => {
    const files = ['src/exportPng.ts', 'src/styles/app.css', 'src/styles/tokens.css']
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        // Comments may name them — the fix for this bug explains itself by
        // quoting the old value, and that documentation must stay legal.
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
        for (const [hex, what] of Object.entries(RETIRED)) {
          expect(
            line.toLowerCase(),
            `${file}:${i + 1} uses ${hex} (${what}), retired in v1.6.0 for failing WCAG AA`,
          ).not.toContain(hex)
        }
      })
    }
  })
})
