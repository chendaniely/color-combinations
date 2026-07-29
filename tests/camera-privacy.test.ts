import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { forbiddenSelfTest, IMAGE_EXPORT, matches, NETWORK_AND_STORAGE } from './support/forbidden'

const CAMERA = 'src/components/camera'

function cameraFiles(dir = CAMERA): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return cameraFiles(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

// Camera imagery must never leave the device or be persisted. getImageData (a
// local pixel read) and getUserMedia (the camera itself) are the only
// exceptions. The camera is held to a stricter standard than the sample
// components: it must not be able to serialise a frame at all.
const RULES = [...NETWORK_AND_STORAGE, ...IMAGE_EXPORT]

describe('camera privacy (never weaken — see the spec)', () => {
  it('has camera source files', () => {
    expect(cameraFiles().length).toBeGreaterThan(0)
  })

  // A guard that cannot demonstrate it detects its own target is a green tick
  // with nothing behind it.
  it('the patterns actually catch what they forbid, and nothing else', () => {
    expect(forbiddenSelfTest(RULES)).toEqual([])
  })

  it('never uploads or persists frames', () => {
    for (const file of cameraFiles()) {
      const src = readFileSync(file, 'utf8')
      for (const rule of RULES) {
        expect(matches(rule, src), `${file} uses forbidden API: ${rule.name}`).toBe(false)
      }
    }
  })
})
