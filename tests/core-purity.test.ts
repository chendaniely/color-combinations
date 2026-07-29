import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
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
      // Static `from '...'`, plus dynamic import() and require(). The first
      // version checked only static imports, so a single `await import('d3')`
      // would have walked straight through the guard.
      const specs = [
        ...[...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]),
        ...[...src.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
        ...[...src.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]),
      ]
      // A computed specifier cannot be checked statically, so it is banned
      // outright rather than waved through.
      expect(
        /\b(import|require)\s*\(\s*[^'")]/.test(src),
        `${file} has a dynamic import with a computed specifier — core imports must be literal`,
      ).toBe(false)
      for (const spec of specs) {
        expect(
          spec.startsWith('./') || spec.startsWith('../'),
          `${file} imports package "${spec}" — core may only import core`,
        ).toBe(true)
        const coreRoot = resolve(CORE) + sep
        const target = resolve(dirname(file), spec)
        expect(
          target.startsWith(coreRoot),
          `${file} imports "${spec}" which resolves outside src/core`,
        ).toBe(true)
      }
    }
  })

  it('core files never touch browser globals', () => {
    // Widened from the original five. The point of the kernel is that it runs
    // anywhere, so anything that only exists in a browser (or that reaches the
    // network or disk from either runtime) is out.
    const BROWSER = [
      'window', 'document', 'navigator', 'location', 'history',
      'localStorage', 'sessionStorage', 'indexedDB', 'caches',
      'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon',
      'alert', 'requestAnimationFrame', 'matchMedia',
      'Image', 'HTMLCanvasElement', 'CanvasRenderingContext2D', 'OffscreenCanvas',
    ]
    const re = new RegExp(`\\b(${BROWSER.join('|')})\\s*[.([]`)
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8')
      const hit = re.exec(src)
      expect(hit === null, `${file} references the browser global "${hit?.[1]}"`).toBe(true)
    }
  })
})
