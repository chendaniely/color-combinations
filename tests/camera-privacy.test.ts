import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const CAMERA = 'src/components/camera'

function cameraFiles(dir = CAMERA): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return cameraFiles(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

// Camera imagery must never leave the device or be persisted. getImageData
// (local pixel read) and getUserMedia (the camera itself) are the only exceptions.
const FORBIDDEN: [string, RegExp][] = [
  ['fetch(', /\bfetch\s*\(/], ['XMLHttpRequest', /XMLHttpRequest/],
  ['sendBeacon', /sendBeacon/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/],
  ['localStorage', /localStorage/], ['sessionStorage', /sessionStorage/], ['indexedDB', /indexedDB/],
  ['document.cookie', /document\.cookie/], ['toDataURL', /toDataURL/], ['toBlob', /toBlob/],
  ['createObjectURL', /createObjectURL/], ['download attr', /<a[^>]*\sdownload\b/],
]

describe('camera privacy (never weaken — see the spec)', () => {
  it('has camera source files', () => {
    expect(cameraFiles().length).toBeGreaterThan(0)
  })
  it('never uploads or persists frames', () => {
    for (const file of cameraFiles()) {
      const src = readFileSync(file, 'utf8')
      for (const [name, re] of FORBIDDEN) {
        expect(re.test(src), `${file} uses forbidden API: ${name}`).toBe(false)
      }
    }
  })
})
