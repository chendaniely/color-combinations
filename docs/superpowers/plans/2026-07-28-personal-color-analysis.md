# Personal Color Analysis ("You" tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth tab, **You**, that photographs the visitor's face, measures their undertone / depth / contrast, and presents two palettes drawn from the book's 157 colors plus the combinations that suit them.

**Architecture:** MediaPipe BlazeFace is reachable from exactly one file (`src/face/detect.ts`) which returns a plain geometry object; everything downstream — probe placement, robust sampling, white balance, the three axes, the four scoring rules, season lookup, combination ranking — is pure and unit-tested without a browser. The season→color mapping is curated data (`data/curated/seasons.json`), not code, so it can be revised without touching TypeScript.

**Tech Stack:** TypeScript, React 19, Vite 7, Vitest 3 + jsdom + @testing-library/react, culori, and one new runtime dependency: `@mediapipe/tasks-vision` (Apache-2.0, zero transitive deps).

**Spec:** `docs/superpowers/specs/2026-07-28-personal-color-analysis-design.md`
**Mockups:** `docs/superpowers/specs/2026-07-28-personal-color-harmony-comparison.html`, `docs/superpowers/specs/2026-07-28-personal-color-result-layout.html`
**Branch:** `feat/personal-color-analysis` (already created; spec committed at `6eac880`)

---

## Global Constraints

Every task's requirements implicitly include this section.

- **`tests/core-purity.test.ts` must never be weakened.** Files in `src/core/` may import only other `src/core/` files by relative path, and may never reference `window`, `document`, `navigator`, `localStorage` or `fetch`.
- **`tests/sample-privacy.test.ts` must never be weakened.** No `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie` anywhere under `src/components/sample/`.
- **`tests/analytics.test.ts` must never be weakened.** Analytics stays build-only, in `vite.config.ts`.
- **The photograph never enters app state and is never persisted.** Only derived numbers survive a capture.
- **No third-party runtime requests.** MediaPipe assets are self-hosted under `public/mediapipe/`. No absolute `http(s)` URL may appear in `src/face/`.
- **App state stays one serializable object** (`src/core/state.ts`) — numbers, strings, booleans and arrays only.
- **Design tokens.** No hard-coded colors in components; everything comes from `src/styles/tokens.css`. Wada's data colors are the only exception.
- **Aesthetic:** "Washi & Ink" — japandi/wabi-sabi, NYC orange `#F26522` sparingly, blue `#236192` for links/selection, warm neutrals. EB Garamond for names, Atkinson Hyperlegible for UI, Hyperlegible Mono for codes.
- **Measured constants, copied verbatim from the spec:**
  - Undertone: skin CIELAB hue angle **> 55° warm**, **< 48° cool**, otherwise neutral.
  - Depth: **L\* > 70 light**, **< 50 deep**, otherwise medium.
  - Contrast: `abs(L*skin − L*hair)` — **> 40 high**, **< 22 low**, otherwise medium.
  - Color temperature: `cos(hue − 60°)`. Warm keeps **≥ −0.15**; cool keeps **≤ +0.15**; neutral keeps all.
  - Separation from skin: **≥ 15 L\***.
  - Chroma band: high contrast **22–75**, medium **14–55**, low **6–38**.
  - Sallow band (rejected for everyone): hue **70–100°** with chroma **< 25**; hue **300–340°** with chroma **< 15**.
  - Floor stops: `0` every color · `1` all but one · `2` half or more (**default**) · `3` any match.
- **Verify before claiming done:** `make test` and `make build` both pass.
- **Commit style:** conventional commits, ending with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `scripts/copy-mediapipe.mjs` | Copies WASM + `.tflite` from `node_modules` into `public/mediapipe/`. |
| `scripts/seed-seasons.ts` | One-time seeder for `data/curated/seasons.json`. Not part of the build. |
| `data/curated/seasons.json` | The twelve season→color mappings. Hand-editable; the app reads it directly. |
| `src/face/detect.ts` | **Only file importing MediaPipe.** Lazy-loads BlazeFace, returns `FaceGeometry \| null`. |
| `src/core/facePlan.ts` | Pure geometry: `FaceGeometry` + image size → probe rectangles. |
| `src/core/robustSample.ts` | Pure statistics: many samples → one median color, outliers rejected. |
| `src/core/whiteRef.ts` | Pure: pick the best white-reference patch from a coarse grid. |
| `src/core/seasons.ts` | Loads/validates `seasons.json`, classifies a reading, returns a season's color ids. |
| `src/core/combinationMatch.ts` | Fraction-of-combination-that-is-yours; ranking and the four floor stops. |
| `src/color/skinMetrics.ts` | White-balance correction, Lab/OKLCh/ITA°, the three axes. |
| `src/color/personalPalette.ts` | The four scoring rules; keeps with reason sentences. |
| `src/components/sample/FaceCapture.tsx` | Camera/upload, oval guide, capture. |
| `src/components/sample/ProbeReview.tsx` | Show the patches; tap to correct. |
| `src/components/you/YouView.tsx` | The result page shell. |
| `src/components/you/ReadingStrip.tsx` | Skin/hair swatches, three axes, white-balance badge. |
| `src/components/you/PaletteTabs.tsx` | Segmented control + provenance line + color grid. |
| `src/components/you/MatchedCombinations.tsx` | Ranked plates, floor control, outlined outsiders. |

**Modified:** `package.json`, `Makefile`, `.gitignore`, `src/core/types.ts`, `src/core/state.ts`, `src/data.ts`, `src/App.tsx`, `src/components/Header.tsx`, `src/components/AboutPanel.tsx`, `src/styles/app.css`, `src/color/culori.d.ts`, `tests/sample-privacy.test.ts`, `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `TODO.md`, `PROMPTS.md`.

---

# STAGE 1 — Capture and measurement

Ends with a runnable You tab that captures a face and shows the reading. **The owner reviews the camera flow here before Stage 2 builds on it.**

---

### Task 1: MediaPipe dependency and self-hosted assets

**Files:**
- Modify: `package.json`
- Modify: `Makefile`
- Modify: `.gitignore`
- Create: `scripts/copy-mediapipe.mjs`
- Test: `tests/mediapipeAssets.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `public/mediapipe/vision_wasm_internal.wasm`, `public/mediapipe/vision_wasm_internal.js`, `public/mediapipe/blaze_face_short_range.tflite` — the paths `src/face/detect.ts` will load in Task 4.

- [ ] **Step 1: Write the failing test**

```ts
// tests/mediapipeAssets.test.ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/mediapipeAssets.test.ts`
Expected: FAIL — `scripts/copy-mediapipe.mjs` does not exist.

- [ ] **Step 3: Install the dependency**

```bash
npm install @mediapipe/tasks-vision
```

Then download the model once (it is not shipped inside the npm package) and vendor it next to the script's other inputs:

```bash
mkdir -p vendor/mediapipe
curl -fsSL -o vendor/mediapipe/blaze_face_short_range.tflite \
  https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
```

`vendor/mediapipe/blaze_face_short_range.tflite` is **committed** (0.22 MB), exactly as `data/raw/` vendors the color source. This keeps constraint 2 true: `make install` needs npm and nothing else.

- [ ] **Step 4: Write the copy script**

```js
// scripts/copy-mediapipe.mjs
// Copies the MediaPipe runtime into public/ so it is served from our own
// origin. See CLAUDE.md: no third-party runtime requests, ever.
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
```

- [ ] **Step 5: Wire it into install and build**

In `package.json` scripts, add `"copy-mediapipe": "node scripts/copy-mediapipe.mjs"` and change `build` to `"copy-mediapipe && tsc --noEmit && vite build"` — expressed as `"build": "npm run copy-mediapipe && tsc --noEmit && vite build"`.

In `Makefile`, change the `install` target body to:

```make
install: ## Install dependencies (needs Node.js >= 20 — see README)
	$(NPM) install
	$(NPM) run copy-mediapipe
```

In `.gitignore`, add `public/mediapipe/` — the assets are generated, not authored.

- [ ] **Step 6: Run the copy and the test**

Run: `npm run copy-mediapipe && npx vitest run tests/mediapipeAssets.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Confirm the bundle is unaffected**

Run: `make build`
Expected: succeeds. `dist/assets/*.js` should still be ≈400 KB — nothing imports MediaPipe yet, so the main bundle must not have grown.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json Makefile .gitignore scripts/copy-mediapipe.mjs vendor/mediapipe tests/mediapipeAssets.test.ts
git commit -m "$(cat <<'EOF'
build(mediapipe): vendor BlazeFace and self-host the tasks-vision runtime

Adds @mediapipe/tasks-vision and a copy step that puts the wasm, its loader
and the BlazeFace model under public/mediapipe/, so the model is served from
our own origin and no third-party request ever fires. The .tflite is vendored
under vendor/ (like data/raw/) so `make install` needs npm and nothing else.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Probe placement (pure geometry)

**Files:**
- Create: `src/core/facePlan.ts`
- Modify: `src/core/types.ts`
- Test: `tests/facePlan.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface FaceGeometry { box: { x: number; y: number; width: number; height: number }; leftEye: Point; rightEye: Point; nose: Point; mouth: Point; leftEar: Point; rightEar: Point }` where `interface Point { x: number; y: number }` — both exported from `src/core/types.ts`. All values are **pixels in the source image**.
  - `type ProbeKind = 'forehead' | 'leftCheek' | 'rightCheek' | 'jaw' | 'hair'`
  - `interface Probe { kind: ProbeKind; cx: number; cy: number; radius: number }`
  - `planProbes(face: FaceGeometry, imageWidth: number, imageHeight: number): Probe[]`
  - `MIN_FACE_FRACTION = 0.15` — the minimum `box.width / imageWidth` below which the caller must ask the visitor to move closer.
  - `faceTooSmall(face: FaceGeometry, imageWidth: number): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// tests/facePlan.test.ts
import { describe, expect, it } from 'vitest'
import { faceTooSmall, planProbes } from '../src/core/facePlan'
import type { FaceGeometry } from '../src/core/types'

// A synthetic upright face, 200px wide, centred in a 600x800 image.
const FACE: FaceGeometry = {
  box: { x: 200, y: 200, width: 200, height: 260 },
  leftEye: { x: 255, y: 290 },
  rightEye: { x: 345, y: 290 },
  nose: { x: 300, y: 340 },
  mouth: { x: 300, y: 395 },
  leftEar: { x: 205, y: 320 },
  rightEar: { x: 395, y: 320 },
}

describe('planProbes', () => {
  it('returns all five probe kinds', () => {
    const kinds = planProbes(FACE, 600, 800).map((p) => p.kind).sort()
    expect(kinds).toEqual(['forehead', 'hair', 'jaw', 'leftCheek', 'rightCheek'])
  })

  it('puts the forehead above the eye line', () => {
    const forehead = planProbes(FACE, 600, 800).find((p) => p.kind === 'forehead')!
    expect(forehead.cy).toBeLessThan(FACE.leftEye.y)
    expect(forehead.cy).toBeGreaterThan(FACE.box.y)
  })

  it('puts the hair band above the face box', () => {
    const hair = planProbes(FACE, 600, 800).find((p) => p.kind === 'hair')!
    expect(hair.cy).toBeLessThan(FACE.box.y)
  })

  it('puts cheeks between the eye line and the mouth, outside the nose', () => {
    const probes = planProbes(FACE, 600, 800)
    const left = probes.find((p) => p.kind === 'leftCheek')!
    const right = probes.find((p) => p.kind === 'rightCheek')!
    for (const c of [left, right]) {
      expect(c.cy).toBeGreaterThan(FACE.leftEye.y)
      expect(c.cy).toBeLessThan(FACE.mouth.y)
    }
    expect(left.cx).toBeLessThan(FACE.nose.x)
    expect(right.cx).toBeGreaterThan(FACE.nose.x)
  })

  it('puts the jaw below the mouth', () => {
    const jaw = planProbes(FACE, 600, 800).find((p) => p.kind === 'jaw')!
    expect(jaw.cy).toBeGreaterThan(FACE.mouth.y)
  })

  it('scales the probe radius with face size', () => {
    const big = planProbes(FACE, 600, 800)[0].radius
    const small = planProbes(
      { ...FACE, box: { ...FACE.box, width: 100, height: 130 } }, 600, 800,
    )[0].radius
    expect(big).toBeGreaterThan(small)
    expect(small).toBeGreaterThanOrEqual(1)
  })

  it('drops probes that fall outside the image instead of clamping them', () => {
    // Face pushed to the very top: the hair band would be off-image.
    const high: FaceGeometry = {
      ...FACE,
      box: { ...FACE.box, y: 2 },
      leftEye: { x: 255, y: 92 }, rightEye: { x: 345, y: 92 },
      nose: { x: 300, y: 142 }, mouth: { x: 300, y: 197 },
      leftEar: { x: 205, y: 122 }, rightEar: { x: 395, y: 122 },
    }
    expect(planProbes(high, 600, 800).some((p) => p.kind === 'hair')).toBe(false)
  })
})

describe('faceTooSmall', () => {
  it('is false for a face filling a third of the frame', () => {
    expect(faceTooSmall(FACE, 600)).toBe(false)
  })
  it('is true for a distant face', () => {
    const tiny = { ...FACE, box: { ...FACE.box, width: 60 } }
    expect(faceTooSmall(tiny, 600)).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/facePlan.test.ts`
Expected: FAIL — cannot resolve `../src/core/facePlan`.

- [ ] **Step 3: Add the shared types**

Append to `src/core/types.ts`:

```ts
export interface Point { x: number; y: number }
export interface FaceBox { x: number; y: number; width: number; height: number }
// A face as located by the detector, in source-image pixels. Deliberately the
// small BlazeFace keypoint set — see the spec for why not 478 landmarks.
export interface FaceGeometry {
  box: FaceBox
  leftEye: Point
  rightEye: Point
  nose: Point
  mouth: Point
  leftEar: Point
  rightEar: Point
}
```

- [ ] **Step 4: Write the implementation**

```ts
// src/core/facePlan.ts
// Where to sample a face. Pure geometry — proportions from the BlazeFace box
// and keypoints, no colour and no browser. Core kernel: no imports outside
// src/core.
import type { FaceGeometry, Point } from './types'

export type ProbeKind = 'forehead' | 'leftCheek' | 'rightCheek' | 'jaw' | 'hair'

export interface Probe {
  kind: ProbeKind
  cx: number
  cy: number
  radius: number
}

// Below this share of the frame the probes would be a handful of pixels and
// the reading would be noise; the caller asks the visitor to move closer.
export const MIN_FACE_FRACTION = 0.15

export function faceTooSmall(face: FaceGeometry, imageWidth: number): boolean {
  return face.box.width / imageWidth < MIN_FACE_FRACTION
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function planProbes(
  face: FaceGeometry, imageWidth: number, imageHeight: number,
): Probe[] {
  const eyeMid = midpoint(face.leftEye, face.rightEye)
  const eyeSpan = Math.abs(face.rightEye.x - face.leftEye.x)
  // A patch about a sixth of the eye span keeps cheeks clear of nose and ear.
  const radius = Math.max(1, Math.round(eyeSpan / 6))

  const browToBoxTop = eyeMid.y - face.box.y
  const cheekY = eyeMid.y + (face.mouth.y - eyeMid.y) * 0.55

  const candidates: Probe[] = [
    // Above the eyes but below the hairline: 40% of the way up to the box top.
    { kind: 'forehead', cx: eyeMid.x, cy: eyeMid.y - browToBoxTop * 0.4, radius },
    { kind: 'leftCheek', cx: (face.leftEye.x + face.leftEar.x) / 2, cy: cheekY, radius },
    { kind: 'rightCheek', cx: (face.rightEye.x + face.rightEar.x) / 2, cy: cheekY, radius },
    { kind: 'jaw', cx: face.mouth.x, cy: face.mouth.y + (face.box.y + face.box.height - face.mouth.y) * 0.55, radius },
    // A band above the box top — hair if there is any.
    { kind: 'hair', cx: face.box.x + face.box.width / 2, cy: face.box.y - radius * 1.5, radius },
  ]

  // Drop, never clamp: a clamped probe silently samples the wrong thing.
  return candidates.filter((p) =>
    p.cx - p.radius >= 0 && p.cx + p.radius < imageWidth &&
    p.cy - p.radius >= 0 && p.cy + p.radius < imageHeight)
}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/facePlan.test.ts tests/core-purity.test.ts`
Expected: PASS — including core purity, which now scans the new file.

- [ ] **Step 6: Commit**

```bash
git add src/core/facePlan.ts src/core/types.ts tests/facePlan.test.ts
git commit -m "$(cat <<'EOF'
feat(core): place face probes by proportion from the BlazeFace keypoints

Pure geometry: forehead above the eye line, cheeks between eyes and mouth
outside the nose, jaw below the mouth, and a hair band above the box. Probes
that fall outside the image are dropped rather than clamped — a clamped probe
silently samples the wrong thing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Robust sampling (pure statistics)

**Files:**
- Create: `src/core/robustSample.ts`
- Test: `tests/robustSample.test.ts`

**Interfaces:**
- Consumes: `RGB` from `src/core/colorMath.ts`.
- Produces:
  - `medianColor(samples: RGB[]): RGB | null` — per-channel median; `null` for an empty input.
  - `rejectOutliers(samples: RGB[], maxDistance?: number): RGB[]` — drops samples further than `maxDistance` (default `60`, plain RGB Euclidean) from the per-channel median.
  - `robustColor(samples: RGB[]): RGB | null` — reject then median. **This is what callers use.**
  - `samplesInPatch(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number): RGB[]` — every pixel in the patch as its own sample, so outlier rejection has something to work on. (`averagePatch` in `sampling.ts` returns only the mean and is kept for the existing eyedropper.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/robustSample.test.ts
import { describe, expect, it } from 'vitest'
import { medianColor, rejectOutliers, robustColor, samplesInPatch } from '../src/core/robustSample'
import type { RGB } from '../src/core/colorMath'

describe('medianColor', () => {
  it('returns null for no samples', () => {
    expect(medianColor([])).toBeNull()
  })
  it('takes the per-channel median', () => {
    const s: RGB[] = [[10, 20, 30], [50, 60, 70], [90, 100, 110]]
    expect(medianColor(s)).toEqual([50, 60, 70])
  })
  it('averages the two middle values for an even count', () => {
    const s: RGB[] = [[10, 10, 10], [20, 20, 20], [30, 30, 30], [40, 40, 40]]
    expect(medianColor(s)).toEqual([25, 25, 25])
  })
})

describe('rejectOutliers', () => {
  it('drops a far sample and keeps the cluster', () => {
    const skin: RGB[] = [[200, 150, 120], [202, 152, 118], [198, 148, 122], [201, 151, 119]]
    const withBrow: RGB[] = [...skin, [20, 15, 12]]
    expect(rejectOutliers(withBrow)).toHaveLength(4)
  })
  it('keeps everything when the samples agree', () => {
    const s: RGB[] = [[200, 150, 120], [202, 152, 118], [198, 148, 122]]
    expect(rejectOutliers(s)).toHaveLength(3)
  })
})

describe('robustColor', () => {
  it('a single dark eyebrow pixel cannot move the reading', () => {
    const skin: RGB[] = Array.from({ length: 20 }, (_, i) => [200 + (i % 3), 150, 120] as RGB)
    const clean = robustColor(skin)!
    const dirty = robustColor([...skin, [10, 8, 6]])!
    expect(dirty).toEqual(clean)
  })
  it('returns null when there is nothing to sample', () => {
    expect(robustColor([])).toBeNull()
  })
})

describe('samplesInPatch', () => {
  it('returns one sample per pixel in the patch', () => {
    // 5x5 image, every pixel mid-grey.
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(128)
    const got = samplesInPatch(data, 5, 5, 2, 2, 1)
    expect(got).toHaveLength(9)          // 3x3 patch
    expect(got[0]).toEqual([128, 128, 128])
  })
  it('clips the patch to the image bounds', () => {
    const data = new Uint8ClampedArray(5 * 5 * 4).fill(128)
    expect(samplesInPatch(data, 5, 5, 0, 0, 2)).toHaveLength(9)  // 3x3 of the 5x5 corner
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/robustSample.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/robustSample.ts
// Many pixel samples in, one trustworthy colour out. A stray eyebrow, shadow
// or specular highlight inside a probe must not move the reading, so we reject
// outliers before taking the median. Core kernel: no imports outside src/core.
import type { RGB } from './colorMath'

const DEFAULT_MAX_DISTANCE = 60

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}

export function medianColor(samples: RGB[]): RGB | null {
  if (samples.length === 0) return null
  return [
    median(samples.map((s) => s[0])),
    median(samples.map((s) => s[1])),
    median(samples.map((s) => s[2])),
  ]
}

export function rejectOutliers(samples: RGB[], maxDistance = DEFAULT_MAX_DISTANCE): RGB[] {
  const centre = medianColor(samples)
  if (!centre) return []
  const kept = samples.filter(([r, g, b]) =>
    Math.hypot(r - centre[0], g - centre[1], b - centre[2]) <= maxDistance)
  // Never return nothing: if the patch is genuinely bimodal, the median still
  // describes it better than an empty set does.
  return kept.length ? kept : samples
}

export function robustColor(samples: RGB[]): RGB | null {
  if (samples.length === 0) return null
  return medianColor(rejectOutliers(samples))
}

export function samplesInPatch(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number,
): RGB[] {
  const x0 = Math.max(0, Math.floor(cx) - radius)
  const x1 = Math.min(width - 1, Math.floor(cx) + radius)
  const y0 = Math.max(0, Math.floor(cy) - radius)
  const y1 = Math.min(height - 1, Math.floor(cy) + radius)
  const out: RGB[] = []
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      out.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  return out
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/robustSample.test.ts tests/core-purity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/robustSample.ts tests/robustSample.test.ts
git commit -m "$(cat <<'EOF'
feat(core): robust colour sampling — reject outliers, then take the median

A probe covers many pixels; a stray eyebrow, shadow or specular highlight in
one of them must not move the reading. Rejection falls back to the full set for
a genuinely bimodal patch rather than returning nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: The MediaPipe seam

**Files:**
- Create: `src/face/detect.ts`
- Modify: `tests/sample-privacy.test.ts`
- Test: `tests/facePrivacy.test.ts`

**Interfaces:**
- Consumes: `FaceGeometry` from `src/core/types.ts`.
- Produces:
  - `detectFace(source: HTMLCanvasElement): Promise<FaceGeometry | null>` — `null` when no face is found.
  - `class FaceModelError extends Error` — thrown when the model cannot load, so the UI can distinguish "no face in this photo" from "the model never loaded".
  - `MEDIAPIPE_BASE = '/mediapipe'` — resolved against Vite's `import.meta.env.BASE_URL`.

**Note for the implementer:** `src/face/` is a new non-core layer, exactly like `src/color/`. It is *not* scanned by `core-purity`, but it *is* newly scanned by the privacy guard below.

- [ ] **Step 1: Write the failing privacy test**

```ts
// tests/facePrivacy.test.ts
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
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/facePrivacy.test.ts`
Expected: FAIL — `src/face` does not exist.

- [ ] **Step 3: Write the seam**

```ts
// src/face/detect.ts
// The ONLY file that imports MediaPipe. Everything downstream depends on the
// plain FaceGeometry shape, not on the detector — so swapping BlazeFace for
// the 478-point Face Landmarker is a change to this file alone.
//
// The model and wasm are served from our own origin (see the copy step in
// scripts/copy-mediapipe.mjs). tests/facePrivacy.test.ts forbids an absolute
// URL here, so this can never be silently repointed at a CDN.
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision'
import type { FaceGeometry, Point } from '../core/types'

export class FaceModelError extends Error {
  constructor(cause?: unknown) {
    super('The face model could not be loaded.')
    this.name = 'FaceModelError'
    this.cause = cause
  }
}

const BASE = `${import.meta.env.BASE_URL}mediapipe`.replace(/\/{2,}/g, '/')

let detector: FaceDetector | null = null
let loading: Promise<FaceDetector> | null = null

// Lazily loaded so the ~3.5 MB runtime is paid for only by visitors who open
// the You tab (CLAUDE.md: weight is paid by the feature that incurs it).
async function getDetector(): Promise<FaceDetector> {
  if (detector) return detector
  if (!loading) {
    loading = (async () => {
      try {
        const files = await FilesetResolver.forVisionTasks(BASE)
        detector = await FaceDetector.createFromOptions(files, {
          baseOptions: { modelAssetPath: `${BASE}/blaze_face_short_range.tflite` },
          runningMode: 'IMAGE',
        })
        return detector
      } catch (err) {
        loading = null
        throw new FaceModelError(err)
      }
    })()
  }
  return loading
}

// BlazeFace keypoint order is fixed: right eye, left eye, nose, mouth, right
// ear, left ear — "right"/"left" being the subject's, so they appear mirrored.
// Coordinates come back normalised 0..1; callers want source pixels.
function toPoint(kp: { x: number; y: number }, w: number, h: number): Point {
  return { x: kp.x * w, y: kp.y * h }
}

export async function detectFace(source: HTMLCanvasElement): Promise<FaceGeometry | null> {
  const d = await getDetector()
  const { detections } = d.detect(source)
  if (!detections.length) return null

  // Largest face wins — the subject is the one nearest the camera.
  const best = [...detections].sort(
    (a, b) => (b.boundingBox!.width * b.boundingBox!.height)
            - (a.boundingBox!.width * a.boundingBox!.height))[0]

  const bb = best.boundingBox!
  const kp = best.keypoints
  const { width: w, height: h } = source

  return {
    box: { x: bb.originX, y: bb.originY, width: bb.width, height: bb.height },
    rightEye: toPoint(kp[0], w, h),
    leftEye: toPoint(kp[1], w, h),
    nose: toPoint(kp[2], w, h),
    mouth: toPoint(kp[3], w, h),
    rightEar: toPoint(kp[4], w, h),
    leftEar: toPoint(kp[5], w, h),
  }
}
```

- [ ] **Step 4: Extend the sample privacy guard to cover `src/face`**

In `tests/sample-privacy.test.ts`, add a note and a second scanned root so a component under `src/components/sample/` cannot route around the guard by putting a network call in `src/face/`:

```ts
// after the existing SAMPLE constant
const FACE = 'src/face'
```

and inside `describe('sample privacy (never weaken)')`, add:

```ts
  it('the face layer is held to the same network ban', () => {
    for (const file of sampleFiles(FACE)) {
      const src = readFileSync(file, 'utf8')
      for (const [name, re] of FORBIDDEN) {
        // MediaPipe loads its own assets internally; what this forbids is OUR
        // code doing so. See tests/facePrivacy.test.ts for the URL guard.
        if (name === 'fetch(') continue
        expect(re.test(src), `${file} uses forbidden API: ${name}`).toBe(false)
      }
    }
  })
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/facePrivacy.test.ts tests/sample-privacy.test.ts`
Expected: PASS.

- [ ] **Step 6: Confirm the type-check passes**

Run: `npx tsc --noEmit`
Expected: no errors. (`@mediapipe/tasks-vision` ships its own `.d.ts`, so no declaration file is needed — unlike culori.)

- [ ] **Step 7: Commit**

```bash
git add src/face tests/facePrivacy.test.ts tests/sample-privacy.test.ts
git commit -m "$(cat <<'EOF'
feat(face): BlazeFace detection behind a one-file seam

detectFace() lazily loads the self-hosted model and returns a plain
FaceGeometry, so nothing downstream knows MediaPipe exists and swapping in the
478-point Landmarker later touches this file only. FaceModelError lets the UI
tell "no face in this photo" apart from "the model never loaded".

Guarded by a new tests/facePrivacy.test.ts forbidding absolute URLs in
src/face/, so the model can never be silently repointed at a CDN.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: White reference selection (pure)

**Files:**
- Create: `src/core/whiteRef.ts`
- Test: `tests/whiteRef.test.ts`

**Interfaces:**
- Consumes: `RGB` from `src/core/colorMath.ts`, `FaceBox` from `src/core/types.ts`.
- Produces: `findWhiteRef(data: Uint8ClampedArray, width: number, height: number, exclude: FaceBox | null): { cx: number; cy: number; rgb: RGB } | null`

**Rules, from the spec:** scan a coarse grid **outside** the face box; keep patches below a low chroma ceiling; reject any patch with a channel at 255 (clipped) or too dark to be a lit white; return the surviving patch with the highest lightness, or `null`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/whiteRef.test.ts
import { describe, expect, it } from 'vitest'
import { findWhiteRef } from '../src/core/whiteRef'
import type { RGB } from '../src/core/colorMath'

// Build a WxH image, then paint a rectangle a given colour.
function image(w: number, h: number, bg: RGB): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    d[i * 4] = bg[0]; d[i * 4 + 1] = bg[1]; d[i * 4 + 2] = bg[2]; d[i * 4 + 3] = 255
  }
  return d
}
function paint(d: Uint8ClampedArray, w: number, x0: number, y0: number, x1: number, y1: number, c: RGB) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * w + x) * 4
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]
  }
}

describe('findWhiteRef', () => {
  it('finds a neutral bright patch', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 70, 70, 95, 95, [232, 231, 229])   // a sheet of paper
    const got = findWhiteRef(d, 100, 100, null)!
    expect(got).not.toBeNull()
    expect(got.rgb[0]).toBeGreaterThan(200)
    expect(got.cx).toBeGreaterThan(65)
    expect(got.cy).toBeGreaterThan(65)
  })

  it('ignores a bright but saturated patch', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 70, 70, 95, 95, [240, 90, 20])     // NYC orange, not white
    expect(findWhiteRef(d, 100, 100, null)).toBeNull()
  })

  it('rejects a clipped patch', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 70, 70, 95, 95, [255, 255, 254])   // blown out
    expect(findWhiteRef(d, 100, 100, null)).toBeNull()
  })

  it('rejects a patch too dark to be a lit white', () => {
    const d = image(100, 100, [10, 10, 10])
    paint(d, 100, 70, 70, 95, 95, [70, 70, 70])      // grey in shadow
    expect(findWhiteRef(d, 100, 100, null)).toBeNull()
  })

  it('never returns a patch inside the face box', () => {
    const d = image(100, 100, [40, 38, 36])
    paint(d, 100, 20, 20, 60, 60, [235, 234, 232])   // a bright forehead
    const box = { x: 15, y: 15, width: 50, height: 50 }
    expect(findWhiteRef(d, 100, 100, box)).toBeNull()
  })

  it('returns null for a frame with nothing white in it', () => {
    expect(findWhiteRef(image(100, 100, [40, 38, 36]), 100, 100, null)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/whiteRef.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/core/whiteRef.ts
// Find something white to balance against. Pure — no browser, no colour
// library: "near-neutral and bright" is decided in plain RGB so this stays in
// the kernel. Core kernel: no imports outside src/core.
import type { RGB } from './colorMath'
import { robustColor, samplesInPatch } from './robustSample'
import type { FaceBox } from './types'

const GRID = 16          // probes across the frame's shorter side
const PATCH = 4          // patch radius in pixels
const MAX_SPREAD = 18    // max(channel) - min(channel): the chroma ceiling
const MIN_LEVEL = 110    // below this it is shadow, not a lit white
const CLIP = 255         // any channel at 255 means the highlight is blown

function inside(box: FaceBox, x: number, y: number): boolean {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
}

export function findWhiteRef(
  data: Uint8ClampedArray, width: number, height: number, exclude: FaceBox | null,
): { cx: number; cy: number; rgb: RGB } | null {
  const step = Math.max(1, Math.floor(Math.min(width, height) / GRID))
  let best: { cx: number; cy: number; rgb: RGB } | null = null

  for (let cy = step; cy < height - step; cy += step) {
    for (let cx = step; cx < width - step; cx += step) {
      if (exclude && inside(exclude, cx, cy)) continue
      const rgb = robustColor(samplesInPatch(data, width, height, cx, cy, PATCH))
      if (!rgb) continue
      const [r, g, b] = rgb
      const hi = Math.max(r, g, b)
      const lo = Math.min(r, g, b)
      if (hi >= CLIP) continue                 // blown out — carries no colour
      if (hi - lo > MAX_SPREAD) continue       // too saturated to be white
      if (hi < MIN_LEVEL) continue             // too dark to be a lit white
      if (!best || hi > Math.max(...best.rgb)) best = { cx, cy, rgb }
    }
  }
  return best
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/whiteRef.test.ts tests/core-purity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/whiteRef.ts tests/whiteRef.test.ts
git commit -m "$(cat <<'EOF'
feat(core): propose a white reference from a coarse grid outside the face

Neutral, bright, not clipped, not in shadow, and never inside the face box —
a bright forehead is not a white balance target. Returns null when the frame
has nothing usable, which is the honest "rough reading" path.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Skin metrics — white balance and the three axes

**Files:**
- Create: `src/color/skinMetrics.ts`
- Modify: `src/color/culori.d.ts`
- Modify: `src/core/types.ts`
- Test: `tests/skinMetrics.test.ts`

**Interfaces:**
- Consumes: `RGB` from `src/core/colorMath.ts`.
- Produces (types in `src/core/types.ts` so `state.ts` can use them without leaving the kernel):
  - `type Undertone = 'warm' | 'neutral' | 'cool'`
  - `type Depth = 'light' | 'medium' | 'deep'`
  - `type ContrastBand = 'high' | 'medium' | 'low'`
  - `interface SkinReading { skin: string; hair: string | null; undertone: Undertone; depth: Depth; contrast: ContrastBand; skinL: number; skinHue: number; ita: number; contrastGap: number | null; whiteBalanced: boolean }` — all hex strings `#rrggbb`.
  - From `src/color/skinMetrics.ts`:
    - `whiteBalance(rgb: RGB, whiteRef: RGB | null): RGB` — von Kries-style per-channel scaling; identity when `whiteRef` is `null`.
    - `readSkin(skin: RGB, hair: RGB | null, whiteRef: RGB | null): SkinReading`
    - `labOf(rgb: RGB): { L: number; C: number; h: number }` — exported for the palette rules in Task 10.

- [ ] **Step 1: Declare the culori functions we need**

`src/color/culori.d.ts` currently declares only `differenceEuclidean`, `wcagContrast`, `filterDeficiencyProt` and `filterDeficiencyDeuter`. Add:

```ts
export function converter(mode: 'lab'): (color: unknown) => { l: number; a: number; b: number }
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/skinMetrics.test.ts
import { describe, expect, it } from 'vitest'
import { labOf, readSkin, whiteBalance } from '../src/color/skinMetrics'
import type { RGB } from '../src/core/colorMath'

// Fixtures spanning the tonal range. A regression that degrades deeper tones
// must fail here — see the spec: this is a correctness requirement.
const DEEP_WARM: RGB = [161, 103, 63]
const MID_WARM: RGB = [198, 145, 105]
const LIGHT_COOL: RGB = [237, 196, 189]
const BLACK_HAIR: RGB = [26, 17, 16]
const ASH_HAIR: RGB = [107, 85, 69]

describe('whiteBalance', () => {
  it('is the identity when there is no reference', () => {
    expect(whiteBalance(MID_WARM, null)).toEqual(MID_WARM)
  })
  it('is the identity when the reference is already neutral white', () => {
    expect(whiteBalance(MID_WARM, [255, 255, 255])).toEqual(MID_WARM)
  })
  it('cools a warm-lit photo when the reference is warm', () => {
    // Tungsten light: the "white" object came out orange.
    const corrected = whiteBalance(MID_WARM, [240, 210, 180])
    expect(corrected[2]).toBeGreaterThan(MID_WARM[2])   // blue is lifted
  })
  it('never exceeds the channel range', () => {
    const c = whiteBalance([250, 250, 250], [100, 200, 255])
    for (const v of c) { expect(v).toBeLessThanOrEqual(255); expect(v).toBeGreaterThanOrEqual(0) }
  })
})

describe('readSkin', () => {
  it('reads a deep warm face with black hair', () => {
    const r = readSkin(DEEP_WARM, BLACK_HAIR, null)
    expect(r.undertone).toBe('warm')
    expect(r.depth).toBe('deep')
    expect(r.contrast).toBe('high')
    expect(r.whiteBalanced).toBe(false)
    expect(r.skin).toMatch(/^#[0-9a-f]{6}$/)
    expect(r.hair).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('reads a light cool face', () => {
    const r = readSkin(LIGHT_COOL, ASH_HAIR, [250, 250, 250])
    expect(r.undertone).toBe('cool')
    expect(r.depth).toBe('light')
    expect(r.whiteBalanced).toBe(true)
  })

  it('handles a face with no visible hair', () => {
    const r = readSkin(MID_WARM, null, null)
    expect(r.hair).toBeNull()
    expect(r.contrastGap).toBeNull()
    expect(['high', 'medium', 'low']).toContain(r.contrast)
  })

  it('reports ITA in degrees', () => {
    const deep = readSkin(DEEP_WARM, null, null)
    const light = readSkin(LIGHT_COOL, null, null)
    expect(light.ita).toBeGreaterThan(deep.ita)   // ITA rises as skin lightens
  })

  it('contrast survives a bad white balance but undertone need not', () => {
    // Same face, same hair, photographed under a strong colour cast.
    const cast = (c: RGB): RGB => [Math.min(255, c[0] * 1.2), c[1], Math.round(c[2] * 0.8)] as RGB
    const honest = readSkin(DEEP_WARM, BLACK_HAIR, null)
    const casted = readSkin(cast(DEEP_WARM), cast(BLACK_HAIR), null)
    expect(casted.contrast).toBe(honest.contrast)
  })
})

describe('labOf', () => {
  it('gives L 100 for white and 0 for black', () => {
    expect(labOf([255, 255, 255]).L).toBeCloseTo(100, 0)
    expect(labOf([0, 0, 0]).L).toBeCloseTo(0, 0)
  })
  it('gives a hue angle in 0..360', () => {
    const h = labOf([200, 60, 40]).h
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(360)
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run tests/skinMetrics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Add the reading types**

Append to `src/core/types.ts`:

```ts
export type Undertone = 'warm' | 'neutral' | 'cool'
export type Depth = 'light' | 'medium' | 'deep'
export type ContrastBand = 'high' | 'medium' | 'low'

// Everything the analysis keeps. Numbers and short strings only — the
// photograph itself is discarded, never stored (see README Privacy).
export interface SkinReading {
  skin: string             // #rrggbb, white-balanced if we had a reference
  hair: string | null      // null when no hair was visible
  undertone: Undertone
  depth: Depth
  contrast: ContrastBand
  skinL: number
  skinHue: number
  ita: number
  contrastGap: number | null
  whiteBalanced: boolean
}
```

- [ ] **Step 5: Write the implementation**

```ts
// src/color/skinMetrics.ts
// Turn sampled pixels into the three axes the palettes are built from.
// Lives in src/color (not the pure core kernel) because it uses culori for
// Lab — the project rule is not to hand-roll colour science.
import { converter } from 'culori'
import type { RGB } from '../core/colorMath'
import type { ContrastBand, Depth, SkinReading, Undertone } from '../core/types'

const toLab = converter('lab')

// Constants from the spec. Every one is a dial.
const WARM_ABOVE = 55
const COOL_BELOW = 48
const LIGHT_ABOVE = 70
const DEEP_BELOW = 50
const CONTRAST_HIGH = 40
const CONTRAST_LOW = 22

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, '0')).join('')
}

export function labOf([r, g, b]: RGB): { L: number; C: number; h: number } {
  const { l, a, b: bb } = toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360
  return { L: l, C: Math.hypot(a, bb), h }
}

// Von Kries-style: scale each channel so the reference would read as white.
// Crude next to a full chromatic-adaptation transform, but it is the correction
// the visitor actually consented to by holding up a white object, and it is
// honest about what it does.
export function whiteBalance(rgb: RGB, whiteRef: RGB | null): RGB {
  if (!whiteRef) return rgb
  const peak = Math.max(...whiteRef)
  return rgb.map((v, i) =>
    clamp255(v * (peak / Math.max(1, whiteRef[i])))) as RGB
}

function undertoneOf(hue: number): Undertone {
  if (hue > WARM_ABOVE) return 'warm'
  if (hue < COOL_BELOW) return 'cool'
  return 'neutral'
}

function depthOf(L: number): Depth {
  if (L > LIGHT_ABOVE) return 'light'
  if (L < DEEP_BELOW) return 'deep'
  return 'medium'
}

function contrastOf(gap: number | null, skinL: number): ContrastBand {
  // With no hair to compare against, fall back to how far the skin itself sits
  // from mid-grey. Weaker, and the page says so.
  const g = gap ?? Math.abs(skinL - 50)
  if (g > CONTRAST_HIGH) return 'high'
  if (g < CONTRAST_LOW) return 'low'
  return 'medium'
}

export function readSkin(skin: RGB, hair: RGB | null, whiteRef: RGB | null): SkinReading {
  const balancedSkin = whiteBalance(skin, whiteRef)
  const balancedHair = hair ? whiteBalance(hair, whiteRef) : null

  const s = labOf(balancedSkin)
  const hairL = balancedHair ? labOf(balancedHair).L : null
  const gap = hairL === null ? null : Math.abs(s.L - hairL)

  // ITA° — Chardon et al. 1991, the standard dermatological depth measure.
  const { b } = toLab({ mode: 'rgb', r: balancedSkin[0] / 255, g: balancedSkin[1] / 255, b: balancedSkin[2] / 255 })
  const ita = (Math.atan2(s.L - 50, b) * 180) / Math.PI

  return {
    skin: toHex(balancedSkin),
    hair: balancedHair ? toHex(balancedHair) : null,
    undertone: undertoneOf(s.h),
    depth: depthOf(s.L),
    contrast: contrastOf(gap, s.L),
    skinL: Math.round(s.L * 10) / 10,
    skinHue: Math.round(s.h * 10) / 10,
    ita: Math.round(ita * 10) / 10,
    contrastGap: gap === null ? null : Math.round(gap * 10) / 10,
    whiteBalanced: whiteRef !== null,
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/skinMetrics.test.ts tests/core-purity.test.ts`
Expected: PASS. If an undertone fixture disagrees, **do not move the thresholds to fit the fixture** — check the fixture is a plausible skin colour first, and raise it if the constants genuinely need revising.

- [ ] **Step 7: Commit**

```bash
git add src/color/skinMetrics.ts src/color/culori.d.ts src/core/types.ts tests/skinMetrics.test.ts
git commit -m "$(cat <<'EOF'
feat(color): white balance and the three axes from sampled skin and hair

Von Kries per-channel correction, then Lab: hue angle -> undertone, L* -> depth,
skin/hair gap -> contrast, plus ITA degrees for reporting. Fixtures span light
to deep and warm to cool so a regression that degrades deeper tones fails the
suite. Includes the test showing contrast survives a colour cast that would
destroy undertone.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: App state for the You tab

**Files:**
- Modify: `src/core/state.ts`
- Test: `tests/state.test.ts`

**Interfaces:**
- Consumes: `SkinReading` from `src/core/types.ts`.
- Produces:
  - `AppState['view']` gains `'you'`.
  - `AppState.you: { reading: SkinReading | null; season: string | null; floor: FloorStop }`
  - `type FloorStop = 0 | 1 | 2 | 3`
  - Actions: `{ type: 'setReading'; reading: SkinReading }`, `{ type: 'setSeason'; season: string | null }`, `{ type: 'setFloor'; floor: FloorStop }`, `{ type: 'clearReading' }`.

- [ ] **Step 1: Write the failing test**

Append to `tests/state.test.ts`:

```ts
describe('the You tab', () => {
  const reading: SkinReading = {
    skin: '#a1673f', hair: '#1a1110',
    undertone: 'warm', depth: 'deep', contrast: 'high',
    skinL: 50.2, skinHue: 58.1, ita: 0.4, contrastGap: 40.6,
    whiteBalanced: true,
  }

  it('starts with no reading and the default floor', () => {
    expect(initialState.you.reading).toBeNull()
    expect(initialState.you.season).toBeNull()
    expect(initialState.you.floor).toBe(2)      // "half or more"
  })

  it('stores a reading', () => {
    const s = reducer(initialState, { type: 'setReading', reading })
    expect(s.you.reading).toEqual(reading)
  })

  it('a new reading clears any season override', () => {
    const withSeason = reducer(
      reducer(initialState, { type: 'setReading', reading }),
      { type: 'setSeason', season: 'soft-summer' })
    expect(withSeason.you.season).toBe('soft-summer')
    const reread = reducer(withSeason, { type: 'setReading', reading })
    expect(reread.you.season).toBeNull()
  })

  it('clearReading resets the whole slice', () => {
    const s = reducer(reducer(initialState, { type: 'setReading', reading }),
                      { type: 'clearReading' })
    expect(s.you).toEqual(initialState.you)
  })

  it('setFloor changes only the floor', () => {
    const s = reducer(initialState, { type: 'setFloor', floor: 0 })
    expect(s.you.floor).toBe(0)
    expect(s.you.reading).toBeNull()
  })

  it('never holds image data', () => {
    const s = reducer(initialState, { type: 'setReading', reading })
    // The whole state must round-trip through JSON — no canvas, no blob, no File.
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })
})
```

Add `SkinReading` to the file's imports from `../src/core/types`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL — `you` is not on `initialState`.

- [ ] **Step 3: Extend the state**

In `src/core/state.ts`: add `SkinReading` to the type import from `./types`, add `'you'` to the `view` union, add the `you` slice to `AppState` and `initialState` (`{ reading: null, season: null, floor: 2 }`), add `export type FloorStop = 0 | 1 | 2 | 3`, add the four actions to the `Action` union, and add the cases:

```ts
    case 'setReading':
      // A fresh reading invalidates any season the visitor had picked for the
      // previous one.
      return { ...state, you: { ...state.you, reading: action.reading, season: null } }
    case 'setSeason':
      return { ...state, you: { ...state.you, season: action.season } }
    case 'setFloor':
      return { ...state, you: { ...state.you, floor: action.floor } }
    case 'clearReading':
      return { ...state, you: { reading: null, season: null, floor: state.you.floor } }
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/state.test.ts tests/core-purity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/state.ts tests/state.test.ts
git commit -m "$(cat <<'EOF'
feat(core): app state for the You tab

Adds the 'you' view and a slice holding the reading, an optional season
override and the combinations floor. A fresh reading clears a stale override.
Includes a test that the whole state round-trips through JSON — the guarantee
that no image data can ever be parked in it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: FaceCapture — camera, upload and the oval guide

**Files:**
- Create: `src/components/sample/FaceCapture.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/faceCapture.test.tsx`

**Interfaces:**
- Consumes: `cameraSupported` from `src/components/camera/cameraStream.ts`, `detectFace` / `FaceModelError` from `src/face/detect.ts`, `planProbes` / `faceTooSmall` from `src/core/facePlan.ts`, `findWhiteRef` from `src/core/whiteRef.ts`, `samplesInPatch` / `robustColor` from `src/core/robustSample.ts`.
- Produces: `interface CaptureResult { probes: { kind: ProbeKind; cx: number; cy: number; radius: number; rgb: RGB }[]; whiteRef: { cx: number; cy: number; rgb: RGB } | null; canvas: HTMLCanvasElement; faceFound: boolean }` and `FaceCapture({ onCapture, onClose }: { onCapture: (r: CaptureResult) => void; onClose: () => void })`.

**Implementer notes:**
- Follow `ImagePicker.tsx` for the upload path and `ColorCapture.tsx` for the camera path — same `.cam-overlay` / `.cam-stage` / `.cam-canvas` structure, same privacy footer line.
- The detector is imported lazily (`const { detectFace } = await import('../../face/detect')`) so the 3.5 MB runtime is not in the main chunk.
- On `FaceModelError`, set `faceFound: false` and surface the manual-tap fallback — never a dead spinner.
- The oval guide and the instruction line ("hold something white next to your face — paper, a mug, a wall, a t-shirt") are CSS + copy; put new strings in `src/copy.ts` if that is where the project keeps them, otherwise inline.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/faceCapture.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FaceCapture } from '../src/components/sample/FaceCapture'
import type { FaceGeometry } from '../src/core/types'

const FACE: FaceGeometry = {
  box: { x: 40, y: 40, width: 120, height: 150 },
  leftEye: { x: 75, y: 90 }, rightEye: { x: 125, y: 90 },
  nose: { x: 100, y: 120 }, mouth: { x: 100, y: 150 },
  leftEar: { x: 42, y: 110 }, rightEar: { x: 158, y: 110 },
}

const detectFace = vi.fn()
vi.mock('../src/face/detect', () => ({
  detectFace: (...a: unknown[]) => detectFace(...a),
  FaceModelError: class FaceModelError extends Error {},
}))

beforeEach(() => { detectFace.mockReset() })

describe('FaceCapture', () => {
  it('offers upload, and camera only when supported', () => {
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/choose a photo/i)).toBeInTheDocument()
  })

  it('tells the visitor to hold up something white', () => {
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText(/something white/i)).toBeInTheDocument()
  })

  it('reports faceFound false when no face is detected', async () => {
    detectFace.mockResolvedValue(null)
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    // The harness helper loads a synthetic image and clicks Capture.
    await captureSyntheticPhoto()
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0].faceFound).toBe(false)
  })

  it('returns one probe per placed patch when a face is found', async () => {
    detectFace.mockResolvedValue(FACE)
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    await captureSyntheticPhoto()
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    const result = onCapture.mock.calls[0][0]
    expect(result.faceFound).toBe(true)
    expect(result.probes.length).toBeGreaterThan(0)
    for (const p of result.probes) expect(p.rgb).toHaveLength(3)
  })

  it('asks the visitor to move closer when the face is tiny', async () => {
    detectFace.mockResolvedValue({ ...FACE, box: { ...FACE.box, width: 10 } })
    render(<FaceCapture onCapture={vi.fn()} onClose={vi.fn()} />)
    await captureSyntheticPhoto()
    expect(await screen.findByText(/move closer/i)).toBeInTheDocument()
  })

  it('falls back to manual tapping when the model will not load', async () => {
    detectFace.mockRejectedValue(new Error('no wasm'))
    const onCapture = vi.fn()
    render(<FaceCapture onCapture={onCapture} onClose={vi.fn()} />)
    await captureSyntheticPhoto()
    await waitFor(() => expect(onCapture).toHaveBeenCalled())
    expect(onCapture.mock.calls[0][0].faceFound).toBe(false)
  })
})
```

Write `captureSyntheticPhoto()` as a helper in `tests/helpers/syntheticPhoto.ts`, modelled on `tests/helpers/mockCamera.ts`: it stubs `HTMLCanvasElement.prototype.getContext` to return a context whose `getImageData` yields a flat skin-coloured buffer, fires a `change` on the file input with a `File`, stubs `Image` so `onload` fires synchronously, then clicks the Capture button.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/faceCapture.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component and the helper**

Build `FaceCapture.tsx` per the implementer notes above, and `tests/helpers/syntheticPhoto.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/faceCapture.test.tsx tests/sample-privacy.test.ts`
Expected: PASS — privacy included, since the new file lives under `src/components/sample/`.

- [ ] **Step 5: Commit**

```bash
git add src/components/sample/FaceCapture.tsx src/styles/app.css tests/faceCapture.test.tsx tests/helpers/syntheticPhoto.ts
git commit -m "$(cat <<'EOF'
feat(you): FaceCapture — camera or upload, oval guide, probe sampling

Lazily imports the detector so the 3.5 MB runtime stays out of the main chunk.
A missing face, an unloadable model and a too-small face each have their own
path; none of them dead-ends.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: ProbeReview — show what we read, tap to correct

**Files:**
- Create: `src/components/sample/ProbeReview.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/probeReview.test.tsx`

**Interfaces:**
- Consumes: `CaptureResult` from `FaceCapture.tsx`, `readSkin` from `src/color/skinMetrics.ts`, `sampleCanvasAt` from `src/components/camera/sampleCanvas.ts`.
- Produces: `ProbeReview({ capture, onConfirm, onRetake }: { capture: CaptureResult; onConfirm: (r: SkinReading) => void; onRetake: () => void })`.

**Behaviour, from the spec — this step is mandatory and unskippable:**
- Show the photo with each probe marked and its sampled color beside it.
- Tapping the photo in "correct the skin" / "correct the hair" / "correct the white" mode re-samples that point and updates the swatch.
- A **there's nothing white in this shot** button clears the white reference.
- **Continue** calls `onConfirm` with the `SkinReading` from `readSkin(skin, hair, whiteRef)`.
- Skin is the robust median across all skin probes (forehead, cheeks, jaw); hair is the hair probe if present.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/probeReview.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProbeReview } from '../src/components/sample/ProbeReview'

function capture(overrides = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = 200; canvas.height = 200
  return {
    canvas, faceFound: true,
    probes: [
      { kind: 'forehead' as const, cx: 100, cy: 70, radius: 8, rgb: [198, 145, 105] as [number, number, number] },
      { kind: 'leftCheek' as const, cx: 70, cy: 120, radius: 8, rgb: [200, 147, 107] as [number, number, number] },
      { kind: 'hair' as const, cx: 100, cy: 30, radius: 8, rgb: [26, 17, 16] as [number, number, number] },
    ],
    whiteRef: { cx: 180, cy: 180, rgb: [240, 239, 237] as [number, number, number] },
    ...overrides,
  }
}

describe('ProbeReview', () => {
  it('shows the colours it read', () => {
    render(<ProbeReview capture={capture()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(screen.getByText(/skin/i)).toBeInTheDocument()
    expect(screen.getByText(/hair/i)).toBeInTheDocument()
  })

  it('confirms a white-balanced reading', async () => {
    const onConfirm = vi.fn()
    render(<ProbeReview capture={capture()} onConfirm={onConfirm} onRetake={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm).toHaveBeenCalled()
    expect(onConfirm.mock.calls[0][0].whiteBalanced).toBe(true)
  })

  it('dismissing the white reference produces a rough reading', async () => {
    const onConfirm = vi.fn()
    render(<ProbeReview capture={capture()} onConfirm={onConfirm} onRetake={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /nothing white/i }))
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm.mock.calls[0][0].whiteBalanced).toBe(false)
  })

  it('reports no hair when there is no hair probe', async () => {
    const onConfirm = vi.fn()
    const noHair = capture({ probes: capture().probes.filter((p) => p.kind !== 'hair') })
    render(<ProbeReview capture={noHair} onConfirm={onConfirm} onRetake={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /continue/i }))
    expect(onConfirm.mock.calls[0][0].hair).toBeNull()
  })

  it('offers a retake', async () => {
    const onRetake = vi.fn()
    render(<ProbeReview capture={capture()} onConfirm={vi.fn()} onRetake={onRetake} />)
    await userEvent.click(screen.getByRole('button', { name: /retake/i }))
    expect(onRetake).toHaveBeenCalled()
  })

  it('offers correction controls for skin, hair and white', () => {
    render(<ProbeReview capture={capture()} onConfirm={vi.fn()} onRetake={vi.fn()} />)
    expect(screen.getByRole('button', { name: /correct.*skin/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /correct.*hair/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /correct.*white/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/probeReview.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the component**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/probeReview.test.tsx tests/sample-privacy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/sample/ProbeReview.tsx src/styles/app.css tests/probeReview.test.tsx
git commit -m "$(cat <<'EOF'
feat(you): ProbeReview — show every colour we read, let the visitor fix it

The mandatory trust step: the patches and their sampled colours are shown, any
of skin, hair or white can be re-tapped, and "there's nothing white in this
shot" drops the reference and marks the reading rough.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Wire the You tab (Stage 1 end state)

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/you/YouView.tsx`
- Create: `src/components/you/ReadingStrip.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/youView.test.tsx`, `tests/appSmoke.test.tsx`

**Interfaces:**
- Produces: `YouView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void })` — for Stage 1 it renders `FaceCapture` → `ProbeReview` → `ReadingStrip`, with a visible "the palettes land here in the next stage" placeholder. `ReadingStrip({ reading }: { reading: SkinReading })` is final and reused in Stage 2.

- [ ] **Step 1: Write the failing test**

```tsx
// tests/youView.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReadingStrip } from '../src/components/you/ReadingStrip'
import type { SkinReading } from '../src/core/types'

const READING: SkinReading = {
  skin: '#a1673f', hair: '#1a1110',
  undertone: 'warm', depth: 'deep', contrast: 'high',
  skinL: 50.2, skinHue: 58.1, ita: 0.4, contrastGap: 40.6,
  whiteBalanced: true,
}

describe('ReadingStrip', () => {
  it('names the three axes in words', () => {
    render(<ReadingStrip reading={READING} />)
    expect(screen.getByText(/warm/i)).toBeInTheDocument()
    expect(screen.getByText(/deep/i)).toBeInTheDocument()
    expect(screen.getByText(/high contrast/i)).toBeInTheDocument()
  })

  it('badges a white-balanced reading', () => {
    render(<ReadingStrip reading={READING} />)
    expect(screen.getByText(/white-balanced/i)).toBeInTheDocument()
  })

  it('badges a rough reading and warns that undertone is unverified', () => {
    render(<ReadingStrip reading={{ ...READING, whiteBalanced: false }} />)
    expect(screen.getByText(/rough reading/i)).toBeInTheDocument()
    expect(screen.getByText(/undertone/i)).toBeInTheDocument()
  })

  it('says the contrast reading is weaker when no hair was visible', () => {
    render(<ReadingStrip reading={{ ...READING, hair: null, contrastGap: null }} />)
    expect(screen.getByText(/no hair visible/i)).toBeInTheDocument()
  })
})
```

Add to `tests/appSmoke.test.tsx`:

```tsx
  it('renders the You tab', () => {
    const html = renderToString(<App />)
    expect(html).toContain('You')
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/youView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Add the `You` button to `Header.tsx` beside Match and Browse (`aria-pressed={state.view === 'you'}`), branch to `<YouView>` in `App.tsx`, and write `YouView.tsx` and `ReadingStrip.tsx`.

- [ ] **Step 4: Run the full suite and build**

Run: `make test && make build`
Expected: all pass; `dist/` main chunk still ≈400 KB with MediaPipe in a separate lazy chunk. **Check this** — if the main chunk jumped by megabytes, the dynamic import in `FaceCapture.tsx` is not actually lazy.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Header.tsx src/components/you src/styles/app.css tests/youView.test.tsx tests/appSmoke.test.tsx
git commit -m "$(cat <<'EOF'
feat(you): wire the You tab — capture, review, and the reading strip

Stage 1 end state: the tab captures a face, shows what was read, lets the
visitor correct it, and reports the three axes with an honest badge. The
palettes arrive in stage 2.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

## ⏸ CHECKPOINT — owner reviews the camera flow

**Stop here. Do not begin Stage 2 until the owner has looked.**

Run `make dev` and ask the owner to check, on a phone if possible:

1. Does the oval guide make it obvious what to do, without reading the text?
2. Is "hold something white next to your face" clear, and is the auto-found white reference usually right?
3. Does the probe review read as *"here's what we measured, fix it if it's wrong"* or as *"something went wrong"*?
4. Are the three axes and the white-balance badge understandable to someone who has never heard of undertone?
5. A deep skin tone and a light one, hat and no hat, and the no-face fallback.
6. The 375px phone layout.

Fold the feedback in before Stage 2 — the result page depends on the vocabulary settled here.

---

# STAGE 2 — Palettes, seasons and the result page

*(Tasks 11–17: `data/curated/seasons.json` + seeder + validation; `src/color/personalPalette.ts` (the four rules); `src/core/combinationMatch.ts` (ranking + floor stops); `PaletteTabs.tsx` (segmented control + provenance lines); `MatchedCombinations.tsx` (ranked plates, floor control, outlined outsiders); the → Match / → Browse doorways and About text; then the documentation sweep and the v1.5.0 release.)*

**Stage 2 is deliberately left to be written after the checkpoint.** The result page's copy, vocabulary and control shapes depend on what the owner concludes at the checkpoint, and writing detailed tasks now would mean rewriting them then. The spec sections *Palette one*, *Palette two*, *The result page* and *Documentation* are complete and authoritative; the tasks get written against them once Stage 1 has been seen.

---

## Self-Review

**Spec coverage.** Stage 1 covers: the dependency and self-hosting (Task 1), probe placement (2), robust sampling (3), the detector seam and its privacy guard (4), white-reference selection (5), white balance and the three axes (6), state (7), capture UI (8), the mandatory review step (9), and the tab wiring (10). Every Stage 1 error case in the spec's table has a test: no face (8), model failure (8), too-small face (8), no white object (9), no hair (9), camera absent (8). Stage 2 requirements are enumerated above and deferred by explicit decision, not omission.

**Placeholders.** None in Stage 1 — every code step carries real code, every test step real tests, every run step the exact command and expected result. Stage 2's deferral is a stated decision with a reason, not a "TBD".

**Type consistency.** `FaceGeometry`, `Point`, `FaceBox`, `SkinReading`, `Undertone`, `Depth`, `ContrastBand` all live in `src/core/types.ts` and are used identically across tasks 2, 4, 6 and 7. `Probe` / `ProbeKind` are defined in Task 2 and consumed in 8 and 9. `robustColor` and `samplesInPatch` are defined in Task 3 and consumed in 5 and 8. `readSkin` and `labOf` are defined in Task 6; `readSkin` is consumed in 9, and `labOf` is the interface Stage 2's scoring rules will use. `CaptureResult` is defined in Task 8 and consumed in Task 9.

**Two risks worth naming for the implementer.** `findWhiteRef` scans the whole frame at radius 4 on a 16-step grid — on a large photo that is a few thousand `robustColor` calls, so if capture feels slow, downscale before scanning rather than loosening the thresholds. And BlazeFace keypoint order is asserted from the documented contract in Task 4; if probes land visibly wrong on real faces, verify that order first before adjusting the proportions in `facePlan.ts`.
