import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SAMPLE = 'src/components/sample'
const FACE = 'src/face'

function sampleFiles(dir = SAMPLE): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sampleFiles(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

// A user's uploaded photo (and any sampled color) must never leave the device
// or be persisted across sessions. Local processing (URL.createObjectURL,
// canvas getImageData) is fine — these forbidden vectors transmit or persist.
const FORBIDDEN: [string, RegExp][] = [
  ['fetch(', /\bfetch\s*\(/], ['XMLHttpRequest', /XMLHttpRequest/],
  ['sendBeacon', /sendBeacon/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/],
  ['localStorage', /localStorage/], ['sessionStorage', /sessionStorage/], ['indexedDB', /indexedDB/],
  ['document.cookie', /document\.cookie/],
]

describe('sample privacy (never weaken)', () => {
  it('has sample source files', () => {
    expect(sampleFiles().length).toBeGreaterThan(0)
  })
  it('never uploads or persists user images', () => {
    for (const file of sampleFiles()) {
      const src = readFileSync(file, 'utf8')
      for (const [name, re] of FORBIDDEN) {
        expect(re.test(src), `${file} uses forbidden API: ${name}`).toBe(false)
      }
    }
  })

  // The face layer processes the same photographs, so it is held to the same
  // ban — otherwise a sample component could route around this guard by moving
  // the call one directory over. `fetch(` is exempt only because MediaPipe
  // loads its own self-hosted assets internally; tests/facePrivacy.test.ts
  // guards that those URLs stay on our origin.
  it('the face layer is held to the same network ban', () => {
    for (const file of sampleFiles(FACE)) {
      const src = readFileSync(file, 'utf8')
      for (const [name, re] of FORBIDDEN) {
        if (name === 'fetch(') continue
        expect(re.test(src), `${file} uses forbidden API: ${name}`).toBe(false)
      }
    }
  })
})
