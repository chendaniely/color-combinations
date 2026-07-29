import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

// The MediaPipe runtime must be served from our own origin (see CLAUDE.md:
// nothing user-derived leaves the device, and no third-party request may fire).
// This guards the copy step that makes that true.
//
// It RUNS the copy rather than checking whether someone else already did.
// The first version asserted that public/mediapipe/* existed, which is an
// environmental precondition, not behaviour: it passed on any machine where the
// copy had been run by hand and failed on a fresh checkout — including CI,
// which runs `npm test` before `npm run build`. A test that needs a manual step
// first is testing the operator, not the code.
const OUT = 'public/mediapipe'
const COPIED = [
  `${OUT}/vision_wasm_internal.wasm`,
  `${OUT}/vision_wasm_internal.js`,
  `${OUT}/blaze_face_short_range.tflite`,
]
const SOURCES = [
  'node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm',
  'node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js',
  'vendor/mediapipe/blaze_face_short_range.tflite',
]

describe('mediapipe assets', () => {
  beforeAll(() => {
    // Start from nothing, so this proves the copy works rather than that a
    // previous run left the files behind.
    rmSync(OUT, { recursive: true, force: true })
    execFileSync('node', ['scripts/copy-mediapipe.mjs'], { stdio: 'pipe' })
  })

  it('has every source it copies from', () => {
    for (const f of SOURCES) {
      expect(existsSync(f), `${f} missing — run "make install"`).toBe(true)
    }
  })

  it('copies the wasm, its loader and the BlazeFace model into public/', () => {
    for (const f of COPIED) {
      expect(existsSync(f), `${f} was not copied`).toBe(true)
      expect(statSync(f).size, `${f} is empty`).toBeGreaterThan(0)
    }
  })

  it('vendors the model in the repo, so `make install` needs only npm', () => {
    // Google ships the .tflite from cloud storage, not inside the npm package.
    // If it stopped being vendored, a fresh clone would silently lose face
    // detection until someone downloaded it by hand.
    expect(existsSync('vendor/mediapipe/blaze_face_short_range.tflite')).toBe(true)
  })

  it('the copy script names no third-party host', () => {
    const src = readFileSync('scripts/copy-mediapipe.mjs', 'utf8')
    expect(/https?:\/\//.test(src), 'copy script must not fetch from a CDN').toBe(false)
  })

  it('runs twice without complaint, so it is safe in install and build', () => {
    expect(() => execFileSync('node', ['scripts/copy-mediapipe.mjs'], { stdio: 'pipe' }))
      .not.toThrow()
    for (const f of COPIED) expect(existsSync(f)).toBe(true)
  })
})
