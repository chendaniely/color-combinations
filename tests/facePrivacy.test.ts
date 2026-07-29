import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const FACE = 'src/face'

function faceFiles(dir = FACE): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return faceFiles(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

// The face model must always be served from our own origin. An absolute URL
// here would silently reintroduce a third-party request on a page that is
// processing a photograph of someone's face.
describe('face detection privacy (never weaken)', () => {
  it('has face source files', () => {
    expect(faceFiles().length).toBeGreaterThan(0)
  })

  it('never names an absolute http(s) URL', () => {
    for (const file of faceFiles()) {
      const src = readFileSync(file, 'utf8')
      expect(/https?:\/\//.test(src), `${file} names an absolute URL`).toBe(false)
    }
  })

  it('never persists anything', () => {
    for (const file of faceFiles()) {
      const src = readFileSync(file, 'utf8')
      for (const re of [/localStorage/, /sessionStorage/, /indexedDB/, /document\.cookie/, /sendBeacon/]) {
        expect(re.test(src), `${file} uses a storage or beacon API`).toBe(false)
      }
    }
  })
})
