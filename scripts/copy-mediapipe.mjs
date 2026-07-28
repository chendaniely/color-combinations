// Copies the MediaPipe runtime into public/ so it is served from our own
// origin. See CLAUDE.md: no third-party runtime requests, ever.
//
// The .tflite is vendored under vendor/mediapipe/ (like data/raw/ vendors the
// colour source) because Google ships it from cloud storage rather than inside
// the npm package — and `make install` must need npm and nothing else.
import { copyFileSync, mkdirSync } from 'node:fs'

const OUT = 'public/mediapipe'
mkdirSync(OUT, { recursive: true })

const COPIES = [
  ['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm', 'vision_wasm_internal.wasm'],
  ['node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.js', 'vision_wasm_internal.js'],
  ['vendor/mediapipe/blaze_face_short_range.tflite', 'blaze_face_short_range.tflite'],
]

for (const [from, name] of COPIES) {
  copyFileSync(from, `${OUT}/${name}`)
  console.log(`copied ${name}`)
}
