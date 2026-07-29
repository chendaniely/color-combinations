import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The MediaPipe runtime must be served from our own origin (see CLAUDE.md:
// nothing user-derived leaves the device, and no third-party request may fire).
// This test guards the copy step that makes that true.
describe('mediapipe assets', () => {
  it('has a copy script', () => {
    expect(existsSync('scripts/copy-mediapipe.mjs')).toBe(true)
  })

  it('copies the wasm, its loader and the BlazeFace model into public/', () => {
    for (const f of [
      'public/mediapipe/vision_wasm_internal.wasm',
      'public/mediapipe/vision_wasm_internal.js',
      'public/mediapipe/blaze_face_short_range.tflite',
    ]) {
      expect(existsSync(f), `${f} missing — run "make install"`).toBe(true)
    }
  })

  it('the copy script names no third-party host', () => {
    const src = readFileSync('scripts/copy-mediapipe.mjs', 'utf8')
    expect(/https?:\/\//.test(src), 'copy script must not fetch from a CDN').toBe(false)
  })
})
