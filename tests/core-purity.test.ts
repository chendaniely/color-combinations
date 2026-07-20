import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const CORE = 'src/core'

function coreFiles(dir = CORE): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return coreFiles(p)
    return p.endsWith('.ts') ? [p] : []
  })
}

describe('core purity (never weaken this test — see CLAUDE.md)', () => {
  it('src/core exists and has files', () => {
    expect(coreFiles().length).toBeGreaterThan(0)
  })

  it('core files import only other core files', () => {
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8')
      const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1])
      for (const spec of specs) {
        expect(
          spec.startsWith('./') || spec.startsWith('../'),
          `${file} imports package "${spec}" — core may only import core`,
        ).toBe(true)
        const target = resolve(dirname(file), spec)
        expect(
          target.startsWith(resolve(CORE)),
          `${file} imports "${spec}" which resolves outside src/core`,
        ).toBe(true)
      }
    }
  })

  it('core files never touch browser globals', () => {
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8')
      expect(
        /\b(window|document|navigator|localStorage|fetch)\s*[.([]/.test(src),
        `${file} references a browser global`,
      ).toBe(false)
    }
  })
})
