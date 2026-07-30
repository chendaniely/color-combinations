// CLAUDE.md's strongest structural rule, given a test.
//
// "Never hand-roll `<div role="dialog">` again: that shipped seven times with no
// focus trap, no Escape and no `aria-modal`." A rule stated seven failures deep
// deserves more than a paragraph — especially since the fix is invisible at the
// call site: a hand-rolled dialog LOOKS fine and only misbehaves for keyboard
// and screen-reader users.
//
// Written during a documentation audit, after an ad-hoc grep for the violation
// produced a false positive (Overlay.tsx's own comment describes what it
// replaced). Excluding comments is exactly the kind of thing a test should own
// rather than a person retyping the grep.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const components = walk('src').filter((p) => p.endsWith('.tsx'))

/** Lines with comment markers stripped, so prose about the rule stays legal. */
function codeLines(file: string): { line: string; n: number }[] {
  return readFileSync(file, 'utf8').split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line))
}

describe('every full-screen overlay goes through Overlay.tsx', () => {
  it('has components to check, so it cannot pass vacuously', () => {
    expect(components.length).toBeGreaterThan(10)
  })

  it('nothing hand-rolls role="dialog"', () => {
    const offenders: string[] = []
    for (const file of components) {
      for (const { line, n } of codeLines(file)) {
        if (/role\s*=\s*["'{]?\s*["']?dialog/.test(line)) offenders.push(`${file}:${n}`)
      }
    }
    expect(
      offenders,
      'use src/components/Overlay.tsx — a hand-rolled dialog has no focus trap, '
      + 'no Escape and no aria-modal, which shipped seven times before v1.6.0',
    ).toEqual([])
  })

  it('nothing else calls showModal, so Overlay stays the single owner', () => {
    const offenders: string[] = []
    for (const file of components) {
      if (file.endsWith('Overlay.tsx')) continue
      for (const { line, n } of codeLines(file)) {
        if (line.includes('showModal')) offenders.push(`${file}:${n}`)
      }
    }
    expect(offenders, 'only Overlay.tsx may open a modal dialog').toEqual([])
  })

  it('Overlay itself still uses a native dialog opened modally', () => {
    // The rule is worthless if Overlay stops being the real thing.
    const src = readFileSync('src/components/Overlay.tsx', 'utf8')
    expect(src).toContain('showModal()')
    expect(src).toContain('<dialog')
    expect(src, 'portalled to body, which removes the .search-box ancestor')
      .toContain('document.body')
  })
})
