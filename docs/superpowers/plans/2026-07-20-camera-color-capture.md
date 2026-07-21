# Camera Color Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mobile/fashion user point the camera at a garment, sample its color, match it perceptually to the closest Sanzo Wada book colors, and jump into Match or Browse at Color / Shade / Family level.

**Architecture:** A pure core layer computes perceptual color distance (OKLab behind a single swappable seam), nearest book colors, and pixel-patch averaging. A reusable `ColorCapture` React component owns the camera and emits one `RGB`; a `CaptureResult` component turns that into a hero + near-match list + level/destination choice. The first doorway is the header search box; Match and Browse gain the levels they were missing so every destination works at all three granularities.

**Tech Stack:** Vite + React 19 + TypeScript (strict) + D3 (unchanged) + Vitest. Camera via native `getUserMedia` + `<canvas>`. No new dependencies.

## Global Constraints

Every task implicitly includes these. Copy exact values.

- **Dependencies (already installed; justified in CLAUDE.md):** runtime `culori` (color-difference math — used ONLY in `src/color/`, never in `src/core/`); dev `jsdom`, `@testing-library/react`, `@testing-library/dom` (camera UI interaction tests). No other deps; the camera uses native `getUserMedia` + `<canvas>`.
- **`src/core/` is a pure, dependency-free kernel.** Core files import only other core files (relative paths) and never touch browser globals (`window|document|navigator|localStorage|fetch`) or npm packages. `tests/core-purity.test.ts` must stay green — never weaken it. **Color-library code lives in the new `src/color/` layer, not core.**
- **The app reads only `data/processed/colors-data.json`** via the `dataset` singleton (`src/data`), an `Indexed`.
- **All style values come from `src/styles/tokens.css`.** No hard-coded colors in components except Sanzo Wada data colors (swatches). Orange (`--accent`) is for the aiming reticle and the active level only; blue (`--link`) is the primary Match action.
- **Privacy is a hard requirement.** No upload; no persistence (`localStorage`/`sessionStorage`/`indexedDB`/`document.cookie`/downloads); camera `MediaStreamTrack`s stopped on close/unmount. `tests/camera-privacy.test.ts` source-scans `src/components/camera/*` and fails on any of `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `toDataURL`, `toBlob`, `createObjectURL`, `<a … download`. Allowed: `getImageData`, `getUserMedia`.
- **Exact copy:** search placeholder is `Find a color…`. Closeness cue words are `very close` / `close` / `roughly`. Default result level is **Shade**.
- **Match levels are `0 | 1 | 2`** = Color / Shade / Family. Browse gains a **shade** filter.
- **Per task:** `npx tsc --noEmit` and `make test` pass; core-purity and camera-privacy tests green.
- **Documentation contract:** any change to setup/commands/structure/behavior updates README / Makefile / PROMPTS / TODO / TODO-completed in the SAME commit (handled in Task 14 for user-facing behavior; note it as you go).

## File Structure

**Core (pure kernel, no deps — new/extended):**
- `src/core/sampling.ts` (new) — `averagePatch(...)` (pixel math, dependency-free).
- `src/core/dataset.ts` (extend) — key display helpers: `isColorKey`, `keyColorId`, `keyName`, `keySwatches`.
- `src/core/state.ts` (extend) — `MatchLevel = 0|1|2`; `AppState.browse`; `setBrowseFilter` action.
- `src/core/matching.ts` (extend) — `remapKeysToLevel` for 0/1/2; `suggestPartners` level-0 ordering.
- (`src/core/colorMath.ts` unchanged — OKLab now comes from culori in `src/color/`.)

**Color layer (`src/color/`, new — portable JS, may import npm libs):**
- `src/color/colorDistance.ts` (new) — **the metric seam** (culori `differenceEuclidean('oklab')`): `colorDistance(a,b)`, `closenessLabel(d)`.
- `src/color/nearestColor.ts` (new) — `nearestColors(ix, rgb, count)`.
- `src/color/culori.d.ts` (new) — minimal `declare module 'culori'` (culori 4 ships no types).

**Components (browser):**
- `src/components/camera/cameraStream.ts` (new) — `cameraSupported()`, `stopStream()`.
- `src/components/camera/ColorCapture.tsx` (new) — camera overlay → `onSample(rgb)`.
- `src/components/camera/CaptureResult.tsx` (new) — hero + near list + level/destination.
- `src/components/camera/CameraSearch.tsx` (new) — doorway container (capture → result → dispatch).
- `src/components/SearchBox.tsx` (modify) — camera icon (feature-detected) + placeholder.
- `src/components/PaletteTray.tsx`, `src/components/SuggestionList.tsx` (modify) — color-key support via helpers.
- `src/components/MatchPage.tsx` (modify) — Colors level + empty prompt.
- `src/components/BrowseView.tsx` (modify) — state-driven filters + shade filter + chip.
- `src/styles/app.css` (extend) — overlay, result, level selector, shade chip.

**Tests:** `tests/colorDistance.test.ts`, `tests/nearestColor.test.ts`, `tests/sampling.test.ts`, `tests/dataset.test.ts` (extend), `tests/state.test.ts` (extend), `tests/matching.test.ts` (extend), `tests/cameraStream.test.ts`, `tests/camera-privacy.test.ts`, `tests/helpers/mockCamera.ts` (jsdom mocks), `tests/colorCapture.test.tsx` (jsdom interaction), `tests/captureResult.test.tsx` (jsdom interaction), `tests/appSmoke.test.tsx` (extend, node/renderToString).

---

### Task 1: Color-distance seam (culori, in `src/color/`)

**Files:**
- Create: `src/color/colorDistance.ts`, `src/color/culori.d.ts`
- Test: `tests/colorDistance.test.ts` (new)

**Interfaces:**
- Consumes: `RGB` from `src/core/colorMath` (type only); `differenceEuclidean` from `culori`.
- Produces: `colorDistance(a: RGB, b: RGB): number`, `closenessLabel(d: number): 'very close' | 'close' | 'roughly'` — the ONLY place that knows the metric.

`culori` is already in `package.json`. `src/color/` is NOT scanned by `tests/core-purity.test.ts`, so importing an npm package here is allowed — importing culori into `src/core/` would fail that test, so never do it.

- [ ] **Step 1: Write the failing test**

Create `tests/colorDistance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hexToRgb } from '../src/core/colorMath'
import { closenessLabel, colorDistance } from '../src/color/colorDistance'

describe('colorDistance seam', () => {
  it('is zero for identical colors and symmetric', () => {
    const a = hexToRgb('#7e8743'), b = hexToRgb('#236192')
    expect(colorDistance(a, a)).toBeCloseTo(0)
    expect(colorDistance(a, b)).toBeCloseTo(colorDistance(b, a))
  })
  it('grows with perceptual difference', () => {
    const black = hexToRgb('#000000')
    expect(colorDistance(black, hexToRgb('#ffffff')))
      .toBeGreaterThan(colorDistance(black, hexToRgb('#222222')))
  })
  it('labels closeness in plain words', () => {
    expect(closenessLabel(0)).toBe('very close')
    expect(closenessLabel(0.07)).toBe('close')
    expect(closenessLabel(0.2)).toBe('roughly')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/colorDistance.test.ts`
Expected: FAIL — module `src/color/colorDistance` not found.

- [ ] **Step 3: Implement**

Create `src/color/culori.d.ts` (culori 4 ships no types — declare only what we use):

```ts
declare module 'culori' {
  export interface CuloriColor {
    mode: string
    r?: number; g?: number; b?: number; alpha?: number
    [channel: string]: number | string | undefined
  }
  export function differenceEuclidean(mode?: string): (a: CuloriColor, b: CuloriColor) => number
}
```

Create `src/color/colorDistance.ts`:

```ts
// The color-difference SEAM — the ONLY place that decides how far apart two
// colors are. Default: Euclidean distance in OKLab (culori). Swap to
// differenceCiede2000() etc. here and nothing downstream changes: nearestColor
// and the UI depend on these signatures, not on the metric. Lives in src/color
// (not the pure core kernel) because it imports culori.
import { differenceEuclidean } from 'culori'
import type { RGB } from '../core/colorMath'

const oklabDistance = differenceEuclidean('oklab')

// culori works in 0..1 channels; our RGB is 0..255.
function culoriRgb([r, g, b]: RGB) {
  return { mode: 'rgb' as const, r: r / 255, g: g / 255, b: b / 255 }
}

export function colorDistance(a: RGB, b: RGB): number {
  return oklabDistance(culoriRgb(a), culoriRgb(b))
}

const VERY_CLOSE = 0.05
const CLOSE = 0.10

export function closenessLabel(distance: number): 'very close' | 'close' | 'roughly' {
  if (distance <= VERY_CLOSE) return 'very close'
  if (distance <= CLOSE) return 'close'
  return 'roughly'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/colorDistance.test.ts` → PASS. Then `npx tsc --noEmit && make test` — all green (core-purity unaffected; nothing in `src/core/` imports culori).

- [ ] **Step 5: Commit**

```bash
git add src/color/colorDistance.ts src/color/culori.d.ts tests/colorDistance.test.ts
git commit -m "feat(color): colorDistance seam via culori OKLab distance"
```

---

### Task 2: Nearest book colors

**Files:**
- Create: `src/color/nearestColor.ts`
- Test: `tests/nearestColor.test.ts` (new)

**Interfaces:**
- Consumes: `Indexed` (`src/core/dataset`), `colorDistance` (`src/color/colorDistance`), `RGB` (`src/core/colorMath`), `ColorRecord` (`src/core/types`).
- Produces: `interface NearMatch { color: ColorRecord; distance: number }`; `nearestColors(ix: Indexed, rgb: RGB, count: number): NearMatch[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/nearestColor.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { hexToRgb } from '../src/core/colorMath'
import { nearestColors } from '../src/color/nearestColor'
import { dataset } from '../src/data'

describe('nearestColors', () => {
  it('returns an exact book color first at distance 0', () => {
    // #7e8743 is the book color "Dark Citrine"
    const out = nearestColors(dataset, hexToRgb('#7e8743'), 5)
    expect(out).toHaveLength(5)
    expect(out[0].color.hex).toBe('#7e8743')
    expect(out[0].distance).toBeCloseTo(0)
  })
  it('ranks by increasing distance', () => {
    const out = nearestColors(dataset, hexToRgb('#7c7b3f'), 6)
    for (let i = 1; i < out.length; i++) {
      expect(out[i].distance).toBeGreaterThanOrEqual(out[i - 1].distance)
    }
  })
  it('caps at count', () => {
    expect(nearestColors(dataset, hexToRgb('#123456'), 3)).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nearestColor.test.ts`
Expected: FAIL — module `nearestColor` not found.

- [ ] **Step 3: Implement**

Create `src/color/nearestColor.ts`:

```ts
// Rank book colors by perceptual distance to a sampled RGB. Depends on the
// colorDistance SEAM, never on the metric directly. In src/color (imports core types).
import { colorDistance } from './colorDistance'
import type { RGB } from '../core/colorMath'
import type { Indexed } from '../core/dataset'
import type { ColorRecord } from '../core/types'

export interface NearMatch { color: ColorRecord; distance: number }

export function nearestColors(ix: Indexed, rgb: RGB, count: number): NearMatch[] {
  return ix.data.colors
    .map((color) => ({ color, distance: colorDistance(rgb, color.rgb) }))
    .sort((a, b) => a.distance - b.distance || a.color.id - b.color.id)
    .slice(0, count)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nearestColor.test.ts` → PASS. Then `npx tsc --noEmit && make test`.

- [ ] **Step 5: Commit**

```bash
git add src/color/nearestColor.ts tests/nearestColor.test.ts
git commit -m "feat(color): nearestColors ranks book colors via the distance seam"
```

---

### Task 3: Pixel-patch averaging

**Files:**
- Create: `src/core/sampling.ts`
- Test: `tests/sampling.test.ts` (new)

**Interfaces:**
- Consumes: `RGB` (`src/core/colorMath`).
- Produces: `averagePatch(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number): RGB` — averages RGBA pixel data over a square patch clamped to bounds.

- [ ] **Step 1: Write the failing test**

Create `tests/sampling.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { averagePatch } from '../src/core/sampling'

// helper: build a width×height RGBA buffer from a per-pixel color fn
function buf(w: number, h: number, fn: (x: number, y: number) => [number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y); const i = (y * w + x) * 4
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255
  }
  return d
}

describe('averagePatch', () => {
  it('returns the solid color of a uniform patch', () => {
    const d = buf(4, 4, () => [200, 40, 10])
    expect(averagePatch(d, 4, 4, 2, 2, 1)).toEqual([200, 40, 10])
  })
  it('averages a two-tone patch and rounds', () => {
    const d = buf(2, 1, (x) => (x === 0 ? [0, 0, 0] : [100, 100, 100]))
    expect(averagePatch(d, 2, 1, 0, 0, 1)).toEqual([50, 50, 50])
  })
  it('clamps the patch to the image bounds (corner tap)', () => {
    const d = buf(3, 3, () => [10, 20, 30])
    expect(averagePatch(d, 3, 3, 0, 0, 5)).toEqual([10, 20, 30]) // no out-of-range read
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sampling.test.ts`
Expected: FAIL — module `sampling` not found.

- [ ] **Step 3: Implement**

Create `src/core/sampling.ts`:

```ts
// Average an ImageData-style RGBA buffer over a small square patch, clamped to
// the image. Pure (no browser globals) so the sampling math is unit-tested;
// the camera component only reads pixels and calls this. Core kernel.
import type { RGB } from './colorMath'

export function averagePatch(
  data: Uint8ClampedArray, width: number, height: number,
  cx: number, cy: number, radius: number,
): RGB {
  const x0 = Math.max(0, Math.floor(cx) - radius)
  const x1 = Math.min(width - 1, Math.floor(cx) + radius)
  const y0 = Math.max(0, Math.floor(cy) - radius)
  const y1 = Math.min(height - 1, Math.floor(cy) + radius)
  let r = 0, g = 0, b = 0, n = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 4
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
  }
  if (n === 0) return [0, 0, 0]
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sampling.test.ts` → PASS. Then `npx tsc --noEmit && make test`.

- [ ] **Step 5: Commit**

```bash
git add src/core/sampling.ts tests/sampling.test.ts
git commit -m "feat(core): averagePatch samples a clamped RGBA patch"
```

---

### Task 4: Key display helpers (color keys vs group keys)

Match/Browse keys are group ids today; the Color level introduces color keys `c{id}`. One place resolves either kind to a name + swatch hexes, so `PaletteTray`, `SuggestionList`, and `CaptureResult` stay DRY.

**Files:**
- Modify: `src/core/dataset.ts`
- Test: `tests/dataset.test.ts` (extend)

**Interfaces:**
- Consumes: `Indexed`, `groupMembers` (same file).
- Produces: `isColorKey(key: string): boolean`, `keyColorId(key: string): number`, `keyName(ix: Indexed, key: string): string`, `keySwatches(ix: Indexed, key: string): string[]`. A color key matches `/^c\d+$/`; group ids (kebab words) never do.

- [ ] **Step 1: Write the failing test**

Append to `tests/dataset.test.ts` (add imports as needed):

```ts
import { isColorKey, keyColorId, keyName, keySwatches } from '../src/core/dataset'

describe('key display helpers', () => {
  it('detects color keys but not group ids', () => {
    expect(isColorKey('c1')).toBe(true)
    expect(isColorKey('olives')).toBe(false)
    expect(isColorKey('cool')).toBe(false) // starts with c, not /^c\d+$/
    expect(keyColorId('c1')).toBe(1)
  })
  it('names and swatches a color key', () => {
    expect(keyName(dataset, 'c1')).toBe('Hermosa Pink')
    expect(keySwatches(dataset, 'c1')).toEqual(['#ffb3f0'])
  })
  it('names and swatches a group key', () => {
    expect(keyName(dataset, 'blue')).toBe('Blue')
    expect(keySwatches(dataset, 'blue').length).toBeGreaterThan(1)
  })
})
```

(If `dataset` and `describe`/`it` are already imported at the top of the file, reuse them — don't duplicate imports.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dataset.test.ts`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Implement**

Append to `src/core/dataset.ts`:

```ts
// A palette/match key is either a group id (kebab word) or a single color: `c{id}`.
export function isColorKey(key: string): boolean {
  return /^c\d+$/.test(key)
}
export function keyColorId(key: string): number {
  return Number(key.slice(1))
}
export function keyName(ix: Indexed, key: string): string {
  return isColorKey(key)
    ? ix.colorById.get(keyColorId(key))!.name
    : ix.groupById.get(key)!.name
}
export function keySwatches(ix: Indexed, key: string): string[] {
  return isColorKey(key)
    ? [ix.colorById.get(keyColorId(key))!.hex]
    : groupMembers(ix, key).map((c) => c.hex)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dataset.test.ts` → PASS. Then `npx tsc --noEmit && make test`.

- [ ] **Step 5: Commit**

```bash
git add src/core/dataset.ts tests/dataset.test.ts
git commit -m "feat(core): keyName/keySwatches resolve color-or-group keys"
```

---

### Task 5: State — Color match level + Browse filters in app state

**Files:**
- Modify: `src/core/state.ts`
- Test: `tests/state.test.ts` (extend)

**Interfaces:**
- Produces: `MatchLevel = 0 | 1 | 2`; `AppState.browse: { family: string; shade: string; colorId: string }`; action `{ type: 'setBrowseFilter'; browse: { family: string; shade: string; colorId: string } }`. `seedPalette` now accepts `level: 0` (color key like `c12`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/state.test.ts`:

```ts
it('initial state carries empty browse filters', () => {
  expect(initialState.browse).toEqual({ family: '', shade: '', colorId: '' })
})
it('seedPalette works at the color level', () => {
  const s = reducer(initialState, { type: 'seedPalette', key: 'c12', level: 0 })
  expect(s.view).toBe('match')
  expect(s.palette).toEqual({ level: 0, keys: ['c12'] })
})
it('setBrowseFilter replaces the browse filter object', () => {
  const s = reducer(initialState, { type: 'setBrowseFilter', browse: { family: 'green', shade: '', colorId: '' } })
  expect(s.browse).toEqual({ family: 'green', shade: '', colorId: '' })
})
```

Also update the existing `starts on the wheel…` test's expected object to include `browse: { family: '', shade: '', colorId: '' }`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL — `browse` undefined / `setBrowseFilter` unhandled.

- [ ] **Step 3: Implement**

In `src/core/state.ts`:

1. Change the level type:
```ts
export type MatchLevel = 0 | 1 | 2
```
2. Add `browse` to `AppState` (after `palette`):
```ts
  palette: { level: MatchLevel; keys: string[] }
  browse: { family: string; shade: string; colorId: string }
```
3. Add the action to the `Action` union:
```ts
  | { type: 'setBrowseFilter'; browse: { family: string; shade: string; colorId: string } }
```
4. Add `browse` to `initialState`:
```ts
  palette: { level: 1, keys: [] },
  browse: { family: '', shade: '', colorId: '' },
```
5. Add the reducer case (anywhere in the switch):
```ts
    case 'setBrowseFilter':
      return { ...state, browse: action.browse }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/state.test.ts` → PASS. Then `npx tsc --noEmit` — expect type errors in `MatchPage.tsx`/`ShadePicker.tsx`/`BrowseView.tsx` only if they compare `level` to `0` incorrectly; those are fixed in Tasks 8–9. If tsc fails ONLY in files owned by later tasks, that is expected — but to keep each commit green, this task also nudges `remapKeysToLevel`'s call sites via Task 6. **Order note:** do Task 6 immediately after this one; run `make test` after Task 6 to confirm the suite is green. (Committing Task 5 with a red typecheck is acceptable only because Task 6 lands in the same review batch — if you need each commit green in isolation, fold Tasks 5 and 6 into one commit.)

- [ ] **Step 5: Commit**

```bash
git add src/core/state.ts tests/state.test.ts
git commit -m "feat(core): color match level + browse filters in app state"
```

---

### Task 6: Matching — remap and suggestions at the color level

**Files:**
- Modify: `src/core/matching.ts`
- Test: `tests/matching.test.ts` (extend)

**Interfaces:**
- Consumes: `MatchLevel` (`src/core/state`), `ancestorAtLevel`, `keyColorId` (`src/core/dataset`).
- Produces: `remapKeysToLevel(ix, keys, from: MatchLevel, to: MatchLevel): string[]` (was `1|2`); `suggestPartners` returns `c{id}` candidate keys ordered by color id when `level === 0`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/matching.test.ts` (reuse existing `dataset` import; add `remapKeysToLevel`, `suggestPartners` to imports if not present):

```ts
import { keyColorId } from '../src/core/dataset'

describe('level 0 matching', () => {
  const sizes = new Set<2 | 3 | 4>([2, 3, 4])
  it('remaps a color key up to shade and family, and refuses to go finer', () => {
    const fine = ancestorAtLevel(dataset, 1, 1)
    const broad = ancestorAtLevel(dataset, 1, 2)
    expect(remapKeysToLevel(dataset, ['c1'], 0, 1)).toEqual([fine])
    expect(remapKeysToLevel(dataset, ['c1'], 0, 2)).toEqual([broad])
    expect(remapKeysToLevel(dataset, [fine], 1, 0)).toEqual([])   // finer: cannot pick
    expect(remapKeysToLevel(dataset, ['c1'], 0, 0)).toEqual(['c1'])
  })
  it('suggests partner colors as color keys', () => {
    const out = suggestPartners(dataset, 0, ['c1'], sizes)
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((s) => /^c\d+$/.test(s.key))).toBe(true)
    expect(out.every((s) => keyColorId(s.key) !== 1)).toBe(true) // never suggests itself
  })
})
```

(`ancestorAtLevel` is already imported in this test file if used; if not, add it from `../src/core/dataset`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/matching.test.ts`
Expected: FAIL — `remapKeysToLevel` typed `1|2` / level-0 order wrong.

- [ ] **Step 3: Implement**

In `src/core/matching.ts`:

1. Add imports:
```ts
import { ancestorAtLevel, displayableCombinations, keyColorId, sizeBucket, type Indexed } from './dataset'
import type { MatchLevel } from './state'
```
(extend the existing `./dataset` import; add the `MatchLevel` import.)

2. Replace `remapKeysToLevel`:
```ts
export function remapKeysToLevel(
  ix: Indexed, keys: readonly string[], from: MatchLevel, to: MatchLevel,
): string[] {
  if (to === from) return [...keys]
  if (to < from) return [] // finer: cannot uniquely pick a narrower key
  // coarser: lift each key up to `to`
  if (from === 0) {
    return [...new Set(keys.map((k) => ancestorAtLevel(ix, keyColorId(k), to)))]
  }
  // from === 1, to === 2
  return [...new Set(keys.map((k) => ix.broadOfFine.get(k)!))]
}
```

3. In `suggestPartners`, replace the display-order block:
```ts
  // Display order for deterministic tie-break.
  const order = new Map<string, number>()
  if (level === 0) {
    ix.data.colors.forEach((c, i) => order.set(`c${c.id}`, i))
  } else {
    const groups = level === 1 ? ix.data.groups.fine : level === 2 ? ix.data.groups.broad : ix.data.groups.super
    groups.forEach((g, i) => order.set(g.id, i))
  }
```

(`groupKeysOfCombo`/`combosForSet` already accept `GranularityLevel`, so level-0 keys `c{id}` flow through `ancestorAtLevel(id, 0)` unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/matching.test.ts` → PASS. Then `npx tsc --noEmit && make test` — full suite green.

- [ ] **Step 5: Commit**

```bash
git add src/core/matching.ts tests/matching.test.ts
git commit -m "feat(core): remap + partner suggestions at the color level"
```

---

### Task 7: PaletteTray & SuggestionList render color keys

**Files:**
- Modify: `src/components/PaletteTray.tsx`, `src/components/SuggestionList.tsx`
- Test: covered by Task 8's smoke test (a level-0 palette renders a color name).

**Interfaces:**
- Consumes: `keyName`, `keySwatches` (`src/core/dataset`).

- [ ] **Step 1: Replace `PaletteTray.tsx`**

```tsx
import { keyName, keySwatches } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'

function Swatches({ hexes }: { hexes: string[] }) {
  return (
    <span className="cl">
      {hexes.map((h, i) => <span key={i} style={{ background: h }} />)}
    </span>
  )
}

export function PaletteTray({ keys, dispatch }: { keys: string[]; dispatch: (a: Action) => void }) {
  return (
    <div className="tray">
      <div className="lab">
        Your palette · {keys.length} item{keys.length === 1 ? '' : 's'}
        <button className="tray-clear" onClick={() => dispatch({ type: 'clearPalette' })}>Start over</button>
      </div>
      <div className="chips">
        {keys.map((k) => (
          <div key={k} className="chip">
            <Swatches hexes={keySwatches(dataset, k)} />
            <div className="row">
              <span className="nm">{keyName(dataset, k)}</span>
              <button className="x" aria-label={`Remove ${keyName(dataset, k)}`}
                onClick={() => dispatch({ type: 'removeFromPalette', key: k })}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

(Copy changed from "N shades" to "N items" so it reads correctly across Color/Shade/Family — the label was already level-agnostic for Families.)

- [ ] **Step 2: Replace the body of `SuggestionList.tsx`**

```tsx
import { keyName, keySwatches } from '../core/dataset'
import type { PartnerSuggestion } from '../core/matching'
import type { Action } from '../core/state'
import { dataset } from '../data'

export function SuggestionList({ suggestions, dispatch }:
  { suggestions: PartnerSuggestion[]; dispatch: (a: Action) => void }) {
  return (
    <div className="sugs">
      {suggestions.map((s) => (
        <button key={s.key} className="sug" onClick={() => dispatch({ type: 'addToPalette', key: s.key })}>
          <span className="cl">
            {keySwatches(dataset, s.key).map((h, i) => <span key={i} style={{ background: h }} />)}
          </span>
          <span className="meta">
            <span className="nm">{keyName(dataset, s.key)}</span>
            <span className="sc">{s.bookVerified ? '★ book-verified' : 'pairs with all'}</span>
          </span>
          <span className="plus" aria-hidden="true">+</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit` → clean. `make test` → still 100+ green (no behavior change for group keys).

- [ ] **Step 4: Commit**

```bash
git add src/components/PaletteTray.tsx src/components/SuggestionList.tsx
git commit -m "feat(ui): palette tray + suggestions render color keys via helpers"
```

---

### Task 8: Match page gains the Colors level

**Files:**
- Modify: `src/components/MatchPage.tsx`
- Test: `tests/appSmoke.test.tsx` (extend)

**Interfaces:**
- Consumes: `remapKeysToLevel` (0/1/2), `MatchLevel` (0|1|2), `keyName`.

- [ ] **Step 1: Write the failing smoke tests**

Append to `tests/appSmoke.test.tsx` (inside `describe('app shell'…)`):

```ts
it('match page offers a Colors level with a snap/search prompt when empty', () => {
  const empty = { ...initialState, view: 'match' as const, palette: { level: 0 as const, keys: [] } }
  const html = renderToString(<MatchPage state={empty} dispatch={() => {}} />)
  expect(html).toContain('Colors')
  expect(html).toContain('snap a color')
})
it('match page renders a color-key palette by color name', () => {
  const seeded = { ...initialState, view: 'match' as const, palette: { level: 0 as const, keys: ['c1'] } }
  expect(renderToString(<MatchPage state={seeded} dispatch={() => {}} />)).toContain('Hermosa Pink')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/appSmoke.test.tsx`
Expected: FAIL — no "Colors" level / prompt.

- [ ] **Step 3: Implement**

In `src/components/MatchPage.tsx`:

1. Extend the levels list and the notice labels:
```ts
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Colors' }, { level: 1, label: 'Shades' }, { level: 2, label: 'Families' },
]
const LEVEL_LABEL: Record<MatchLevel, string> = { 0: 'Colors', 1: 'Shades', 2: 'Families' }
```

2. Update `switchLevel` to use the label map and to allow level 0:
```ts
function switchLevel(to: MatchLevel) {
  if (to === level) return
  const remapped = remapKeysToLevel(dataset, keys, level, to)
  setLevelNotice(keys.length > 0 && remapped.length === 0
    ? `Switched to ${LEVEL_LABEL[to]} — your previous palette doesn't map here, so pick a new one to start.`
    : null)
  dispatch({ type: 'setMatchLevel', level: to, keys: remapped })
}
```

3. Replace the empty-state branch so Colors shows a prompt instead of the shade picker:
```tsx
{keys.length === 0 ? (
  <>
    {levelNotice && <p className="empty-note">{levelNotice}</p>}
    {level === 0
      ? <p className="lede">Search a color name above, or snap a color with the camera — exact colors land here.</p>
      : <ShadePicker level={level} dispatch={dispatch} />}
  </>
) : (
```

(The `level === 0 ? … : <ShadePicker level={level} … />` narrows `level` to `1 | 2` in the else branch, matching `ShadePicker`'s prop type — leave `ShadePicker`'s prop as `1 | 2`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/appSmoke.test.tsx` → PASS. `npx tsc --noEmit && make test`.

**Owner browser checklist (not asserted):** the Match level toggle shows Colors · Shades · Families; picking Colors with an empty palette shows the prompt; a color-seeded palette lists partner colors and book palettes; switching Colors→Shades remaps sensibly.

- [ ] **Step 5: Commit**

```bash
git add src/components/MatchPage.tsx tests/appSmoke.test.tsx
git commit -m "feat(ui): Match page Colors level with snap/search empty prompt"
```

---

### Task 9: Browse filters live in state; add a shade filter + chip

**Files:**
- Modify: `src/components/BrowseView.tsx`
- Test: `tests/appSmoke.test.tsx` (extend)

**Interfaces:**
- Consumes: `state.browse`, `setBrowseFilter`, `ancestorAtLevel`, `keyName`.

- [ ] **Step 1: Write the failing smoke test**

Append to `tests/appSmoke.test.tsx`:

```ts
it('browse view shows a dismissible chip for an active shade filter', () => {
  const olives = dataset.data.groups.fine.find((g) => g.name === 'Olives')!.id
  const state = { ...initialState, view: 'browse' as const, browse: { family: '', shade: olives, colorId: '' } }
  const html = renderToString(<BrowseView state={state} dispatch={() => {}} />)
  expect(html).toContain('Olives')
  expect(html).toContain('Clear shade')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/appSmoke.test.tsx`
Expected: FAIL — BrowseView ignores `state.browse.shade`.

- [ ] **Step 3: Replace `BrowseView.tsx`**

```tsx
import { ancestorAtLevel, displayableCombinations, keyName, sizeBucket } from '../core/dataset'
import type { Action, AppState } from '../core/state'
import type { SizeBucket } from '../core/types'
import { dataset } from '../data'
import { PlateCard } from './PlateCard'

const SIZES: SizeBucket[] = [2, 3, 4]

export function BrowseView({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { family, shade, colorId } = state.browse
  const setFilter = (patch: Partial<AppState['browse']>) =>
    dispatch({ type: 'setBrowseFilter', browse: { ...state.browse, ...patch } })

  const combos = displayableCombinations(dataset).filter((c) => {
    if (!state.sizes.includes(sizeBucket(c))) return false
    if (family && !c.colorIds.some((id) => ancestorAtLevel(dataset, id, 2) === family)) return false
    if (shade && !c.colorIds.some((id) => ancestorAtLevel(dataset, id, 1) === shade)) return false
    if (colorId && !c.colorIds.includes(Number(colorId))) return false
    return true
  })

  const comboCount = `${combos.length} combinations`
  const sections = SIZES
    .map((s) => ({ size: s, heading: s === 4 ? '4+ colors' : `${s} colors`, combos: combos.filter((c) => sizeBucket(c) === s) }))
    .filter((sec) => sec.combos.length > 0)

  return (
    <div className="browse-view">
      <div className="browse-filters">
        <div className="size-filter" aria-label="Colors per combination">
          {SIZES.map((s) => (
            <button key={s} aria-pressed={state.sizes.includes(s)}
              onClick={() => dispatch({ type: 'toggleSize', size: s })}>
              {s === 4 ? '4+' : s}
            </button>
          ))}
        </div>
        <select value={family} onChange={(e) => setFilter({ family: e.target.value })} aria-label="Color family">
          <option value="">any family</option>
          {dataset.data.groups.broad.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={colorId} onChange={(e) => setFilter({ colorId: e.target.value })} aria-label="Contains color">
          <option value="">contains any color</option>
          {[...dataset.data.colors].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {shade && (
          <button className="filter-chip" onClick={() => setFilter({ shade: '' })}>
            {keyName(dataset, shade)} <span aria-label="Clear shade" title="Clear shade">×</span>
          </button>
        )}
        <span className="muted">{comboCount}</span>
      </div>
      <p className="hint">Taller bars suggest the dominant color — the main garment, the page background; slivers are accents.</p>
      {sections.map((sec) => (
        <section key={sec.size} className="browse-section">
          <h2 className="browse-section-head">
            {sec.heading} <span className="muted">{`— ${sec.combos.length}`}</span>
          </h2>
          <div className="browse-grid">
            {sec.combos.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
          </div>
        </section>
      ))}
    </div>
  )
}
```

Add to `src/styles/app.css`:

```css
.filter-chip {
  font: inherit; font-size: 0.85rem;
  background: var(--paper-2); color: var(--ink);
  border: 1px solid var(--hairline); border-radius: 999px;
  padding: 0.25rem 0.6rem; cursor: pointer;
}
.filter-chip span { color: var(--ink-muted); margin-left: 0.25rem; }
.filter-chip:hover { border-color: var(--accent); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/appSmoke.test.tsx` → PASS (the existing "338 combinations" test still passes: `initialState.browse` is empty). `npx tsc --noEmit && make test`.

**Owner browser checklist:** family + contains-color dropdowns still work and persist across view switches; a shade chip appears only when a shade filter is set (from the camera) and clears on click.

- [ ] **Step 5: Commit**

```bash
git add src/components/BrowseView.tsx src/styles/app.css tests/appSmoke.test.tsx
git commit -m "feat(ui): browse filters in state + shade filter chip"
```

---

### Task 10: Camera stream helpers + privacy guard test

**Files:**
- Create: `src/components/camera/cameraStream.ts`
- Test: `tests/cameraStream.test.ts` (new), `tests/camera-privacy.test.ts` (new)

**Interfaces:**
- Produces: `cameraSupported(): boolean`, `stopStream(stream: MediaStream | null): void`.

- [ ] **Step 1: Write the failing tests**

Create `tests/cameraStream.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { cameraSupported, stopStream } from '../src/components/camera/cameraStream'

describe('cameraStream', () => {
  it('stops every track', () => {
    const t1 = { stop: vi.fn() }, t2 = { stop: vi.fn() }
    stopStream({ getTracks: () => [t1, t2] } as unknown as MediaStream)
    expect(t1.stop).toHaveBeenCalledOnce()
    expect(t2.stop).toHaveBeenCalledOnce()
  })
  it('tolerates a null stream', () => {
    expect(() => stopStream(null)).not.toThrow()
  })
  it('reports unsupported outside a secure browser (node)', () => {
    expect(cameraSupported()).toBe(false) // no window/navigator in the node test env
  })
})
```

Create `tests/camera-privacy.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cameraStream.test.ts tests/camera-privacy.test.ts`
Expected: FAIL — module/dir missing.

- [ ] **Step 3: Implement**

Create `src/components/camera/cameraStream.ts`:

```ts
// Camera lifecycle helpers, kept out of the React component so the safety-critical
// bits are unit-testable in the node test env. NOTE: this file is scanned by
// tests/camera-privacy.test.ts — never add network/storage APIs here.

export function cameraSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && window.isSecureContext
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => t.stop())
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cameraStream.test.ts tests/camera-privacy.test.ts` → PASS. `npx tsc --noEmit && make test`.

- [ ] **Step 5: Commit**

```bash
git add src/components/camera/cameraStream.ts tests/cameraStream.test.ts tests/camera-privacy.test.ts
git commit -m "feat(camera): stream helpers + privacy source-scan guard"
```

---

### Task 11: ColorCapture component (camera → RGB)

**Files:**
- Create: `src/components/camera/ColorCapture.tsx`
- Modify: `src/styles/app.css`
- Create: `tests/helpers/mockCamera.ts` (jsdom mocks), `tests/colorCapture.test.tsx` (jsdom interaction)

**Interfaces:**
- Consumes: `RGB` (`src/core/colorMath`), `averagePatch` (`src/core/sampling`), `cameraSupported`, `stopStream`.
- Produces: `ColorCapture({ onSample, onClose }: { onSample: (rgb: RGB) => void; onClose: () => void })`.

- [ ] **Step 1: Write the mock helper and the failing jsdom test**

Create `tests/helpers/mockCamera.ts` (jsdom's canvas is a stub and it has no `getUserMedia`, so mock both):

```ts
import { vi } from 'vitest'
import type { RGB } from '../../src/core/colorMath'

// Install jsdom-friendly camera + canvas mocks; returns the fake track so tests
// can assert it was stopped. `sampleColor` is what getImageData returns.
export function installCameraMocks(sampleColor: RGB = [126, 135, 67]) {
  const track = { stop: vi.fn() }
  const stream = { getTracks: () => [track] }
  const getUserMedia = vi.fn().mockResolvedValue(stream)

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  ;(HTMLMediaElement.prototype as unknown as { play: () => Promise<void> }).play =
    vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { value: 4, configurable: true })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { value: 4, configurable: true })

  const [r, g, b] = sampleColor
  const data = new Uint8ClampedArray(4 * 4 * 4)
  for (let i = 0; i < data.length; i += 4) { data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255 }
  const ctx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data, width: 4, height: 4 })) }
  ;(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = vi.fn(() => ctx)
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

  return { track, getUserMedia }
}
```

Create `tests/colorCapture.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorCapture } from '../src/components/camera/ColorCapture'
import { installCameraMocks } from './helpers/mockCamera'

afterEach(cleanup)

describe('ColorCapture (jsdom)', () => {
  it('freeze → tap → "Use this color" emits the sampled RGB', async () => {
    installCameraMocks([126, 135, 67])
    const onSample = vi.fn()
    render(<ColorCapture onSample={onSample} onClose={() => {}} />)
    fireEvent.click(await screen.findByLabelText('Freeze the frame'))
    fireEvent.pointerDown(document.querySelector('canvas')!, { clientX: 50, clientY: 50 })
    fireEvent.click(screen.getByText('Use this color'))
    expect(onSample).toHaveBeenCalledWith([126, 135, 67])
  })
  it('stops the camera tracks on unmount', async () => {
    const { track } = installCameraMocks()
    const { unmount } = render(<ColorCapture onSample={() => {}} onClose={() => {}} />)
    await screen.findByLabelText('Freeze the frame')
    unmount()
    expect(track.stop).toHaveBeenCalled()
  })
  it('calls onClose from the close button', () => {
    installCameraMocks()
    const onClose = vi.fn()
    render(<ColorCapture onSample={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close camera'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/colorCapture.test.tsx` → FAIL (module `ColorCapture` missing).

- [ ] **Step 3: Implement**

Create `src/components/camera/ColorCapture.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { averagePatch } from '../../core/sampling'
import { cameraSupported, stopStream } from './cameraStream'

const PATCH_RADIUS = 6

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function ColorCapture({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const supported = cameraSupported()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [frozen, setFrozen] = useState(false)
  const [tap, setTap] = useState<{ xPct: number; yPct: number; rgb: RGB } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) { stopStream(stream); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
      .catch(() => { if (!cancelled) setError('Camera access was blocked. Close this and type a color name instead.') })
    return () => { cancelled = true; stopStream(streamRef.current); streamRef.current = null }
  }, [supported])

  function freeze() {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    setFrozen(true); setTap(null)
  }

  function retake() { setFrozen(false); setTap(null) }

  function sampleAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const rgb = averagePatch(img.data, canvas.width, canvas.height, cx, cy, PATCH_RADIUS)
    setTap({ xPct: (cx / canvas.width) * 100, yPct: (cy / canvas.height) * 100, rgb })
  }

  return (
    <div className="cam-overlay" role="dialog" aria-label="Find a color with the camera">
      <button className="cam-close" onClick={onClose} aria-label="Close camera">×</button>

      {!supported ? (
        <div className="cam-fallback">
          <p>Your camera isn’t available here (it needs a secure connection and permission).
            Close this and search by name instead.</p>
        </div>
      ) : (
        <>
          <div className="cam-stage">
            <video ref={videoRef} playsInline muted className="cam-video" style={{ display: frozen ? 'none' : 'block' }} />
            <canvas ref={canvasRef} className="cam-canvas" style={{ display: frozen ? 'block' : 'none' }}
              onPointerDown={sampleAt} />
            {!frozen && <div className="cam-reticle" aria-hidden="true" />}
            {frozen && tap && (
              <div className="cam-tap" style={{ left: `${tap.xPct}%`, top: `${tap.yPct}%` }}>
                <span className="cam-tap-chip"><i style={{ background: toHex(tap.rgb) }} />{toHex(tap.rgb)}</span>
              </div>
            )}
          </div>

          {error && <p className="cam-error">{error}</p>}

          <div className="cam-controls">
            {!frozen ? (
              <button className="cam-shutter" onClick={freeze} aria-label="Freeze the frame" />
            ) : (
              <>
                <button className="cam-btn ghost" onClick={retake}>Retake</button>
                <button className="cam-btn primary" disabled={!tap}
                  onClick={() => tap && onSample(tap.rgb)}>Use this color</button>
              </>
            )}
          </div>

          <p className="cam-privacy">Your photo stays on this device — nothing is uploaded or saved.</p>
        </>
      )}
    </div>
  )
}
```

Add to `src/styles/app.css` (tokens only; orange reticle, blue primary):

```css
.cam-overlay {
  position: fixed; inset: 0; z-index: 50;
  background: var(--paper-1);
  display: flex; flex-direction: column; align-items: center; gap: var(--s4);
  padding: var(--s6) var(--s4);
}
.cam-close {
  position: absolute; top: var(--s3); right: var(--s4);
  background: none; border: 0; font-size: 1.75rem; line-height: 1;
  color: var(--ink-muted); cursor: pointer;
}
.cam-stage {
  position: relative; width: 100%; max-width: 420px; aspect-ratio: 3 / 4;
  background: var(--ink); border-radius: var(--radius); overflow: hidden;
}
.cam-video, .cam-canvas { width: 100%; height: 100%; object-fit: cover; touch-action: none; }
.cam-reticle {
  position: absolute; top: 46%; left: 50%; transform: translate(-50%, -50%);
  width: 58px; height: 58px; border: 2px solid var(--accent); border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(255,255,255,0.5), 0 0 0 6px rgba(242,101,34,0.18);
  pointer-events: none;
}
.cam-tap { position: absolute; transform: translate(-50%, -50%);
  width: 30px; height: 30px; border: 2px solid #fff; border-radius: 50%;
  box-shadow: 0 0 0 2px var(--accent); pointer-events: none; }
.cam-tap-chip {
  position: absolute; left: 34px; top: -12px; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--paper-1); border: 1px solid var(--hairline); border-radius: 999px;
  padding: 2px 8px; font-family: var(--font-mono); font-size: 0.7rem;
}
.cam-tap-chip i { width: 12px; height: 12px; border-radius: 3px; }
.cam-controls { display: flex; gap: var(--s3); align-items: center; min-height: 52px; }
.cam-shutter {
  width: 56px; height: 56px; border-radius: 50%; background: #fff;
  border: 3px solid var(--paper-2); box-shadow: 0 0 0 2px var(--accent); cursor: pointer;
}
.cam-btn { font: inherit; padding: 0.6rem 1rem; border-radius: var(--radius); cursor: pointer; }
.cam-btn.primary { background: var(--link); color: #fff; border: 1px solid var(--link); }
.cam-btn.primary:disabled { opacity: 0.5; cursor: default; }
.cam-btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--ink-faint); }
.cam-error { color: var(--accent); font-size: 0.85rem; margin: 0; text-align: center; }
.cam-privacy { color: var(--ink-muted); font-size: 0.8rem; margin: 0; text-align: center; }
.cam-fallback { max-width: 360px; text-align: center; color: var(--ink-muted); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/colorCapture.test.tsx` → PASS. Then `npx tsc --noEmit && make test`. Confirm `tests/camera-privacy.test.ts` still passes with the new `.tsx` files present.

**Owner browser checklist:** on a phone (HTTPS) the rear camera opens; shutter freezes; tapping the garment shows the sampled-color chip; Retake returns to live; "Use this color" fires; closing the overlay turns the camera indicator light off; denying permission shows the friendly message, no crash.

- [ ] **Step 5: Commit**

```bash
git add src/components/camera/ColorCapture.tsx src/styles/app.css tests/helpers/mockCamera.ts tests/colorCapture.test.tsx
git commit -m "feat(camera): ColorCapture overlay — freeze, tap, sample to RGB"
```

---

### Task 12: CaptureResult component (hero + near list + level/destination)

**Files:**
- Create: `src/components/camera/CaptureResult.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/appSmoke.test.tsx` (extend, node smoke), `tests/captureResult.test.tsx` (jsdom interaction)

**Interfaces:**
- Consumes: `RGB`, `hexToRgb` (colorMath), `nearestColors` (nearestColor), `closenessLabel` (colorDistance), `ancestorAtLevel`, `keyName` (dataset), `MatchLevel` (state).
- Produces: `CaptureResult({ rgb, onMatch, onBrowse, onRetake }: { rgb: RGB; onMatch: (level: MatchLevel, key: string) => void; onBrowse: (level: MatchLevel, key: string) => void; onRetake?: () => void })`.

- [ ] **Step 1: Write the failing smoke test**

Append to `tests/appSmoke.test.tsx` (add `import { CaptureResult } from '../src/components/camera/CaptureResult'` and `import { hexToRgb } from '../src/core/colorMath'`):

```ts
it('capture result heroes the closest color and offers all three levels + destinations', () => {
  const html = renderToString(
    <CaptureResult rgb={hexToRgb('#7e8743')} onMatch={() => {}} onBrowse={() => {}} />,
  )
  expect(html).toContain('Dark Citrine') // closest book color
  expect(html).toContain('Color'); expect(html).toContain('Shade'); expect(html).toContain('Family')
  expect(html).toContain('Match'); expect(html).toContain('Browse')
})
```

Also create `tests/captureResult.test.tsx` (jsdom interaction):

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CaptureResult } from '../src/components/camera/CaptureResult'
import { hexToRgb } from '../src/core/colorMath'

afterEach(cleanup)

describe('CaptureResult (jsdom)', () => {
  it('fires Match at the default Shade level (1)', () => {
    const onMatch = vi.fn()
    render(<CaptureResult rgb={hexToRgb('#7e8743')} onMatch={onMatch} onBrowse={() => {}} />)
    expect(screen.getByText('Dark Citrine')).toBeTruthy()
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch.mock.calls[0][0]).toBe(1) // Shade preselected
  })
  it('switching to Family changes the level the actions use', () => {
    const onBrowse = vi.fn()
    render(<CaptureResult rgb={hexToRgb('#7e8743')} onMatch={() => {}} onBrowse={onBrowse} />)
    fireEvent.click(screen.getByRole('radio', { name: /Family/ }))
    fireEvent.click(screen.getByText(/^Browse /))
    expect(onBrowse.mock.calls[0][0]).toBe(2) // Family
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/appSmoke.test.tsx tests/captureResult.test.tsx` → FAIL (module missing).

- [ ] **Step 3: Implement**

Create `src/components/camera/CaptureResult.tsx`:

```tsx
import { useState } from 'react'
import { closenessLabel } from '../../color/colorDistance'
import { ancestorAtLevel, keyName } from '../../core/dataset'
import type { RGB } from '../../core/colorMath'
import { nearestColors } from '../../color/nearestColor'
import type { MatchLevel } from '../../core/state'
import { dataset } from '../../data'

const NEAR_COUNT = 6
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Color' }, { level: 1, label: 'Shade' }, { level: 2, label: 'Family' },
]

// key for a color id at a given match level: color → c{id}; shade/family → ancestor id
function keyAt(colorId: number, level: MatchLevel): string {
  return level === 0 ? `c${colorId}` : ancestorAtLevel(dataset, colorId, level)
}

export function CaptureResult({ rgb, onMatch, onBrowse, onRetake }: {
  rgb: RGB
  onMatch: (level: MatchLevel, key: string) => void
  onBrowse: (level: MatchLevel, key: string) => void
  onRetake?: () => void
}) {
  const near = nearestColors(dataset, rgb, NEAR_COUNT)
  const [selId, setSelId] = useState(near[0].color.id)
  const [level, setLevel] = useState<MatchLevel>(1) // default Shade
  const [showList, setShowList] = useState(false)

  const hero = dataset.colorById.get(selId)!
  const heroDist = near.find((n) => n.color.id === selId)?.distance ?? 0
  const key = keyAt(selId, level)
  const sampledHex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

  return (
    <div className="cap-result">
      <div className="cap-saw">
        <span className="cap-sw" style={{ background: sampledHex }} />
        <span>Your camera saw <b>{sampledHex}</b></span>
      </div>

      <div className="cap-hero" style={{ background: hero.hex }}>
        <span className="cap-tag">Closest match · {closenessLabel(heroDist)}</span>
      </div>
      <div className="cap-name">{hero.name}</div>
      <div className="cap-code">{hero.hex}</div>

      <button className="cap-more" onClick={() => setShowList((v) => !v)}>
        {showList ? '▴ hide matches' : `▾ ${near.length - 1} more close matches`}
      </button>
      {showList && (
        <div className="cap-near">
          {near.map((n) => (
            <button key={n.color.id} className={`cap-li${n.color.id === selId ? ' sel' : ''}`}
              onClick={() => setSelId(n.color.id)}>
              <span className="cap-li-sw" style={{ background: n.color.hex }} />
              <span className="cap-li-nm">{n.color.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="cap-seg-h">Use this as — then Match or Browse</p>
      <div className="cap-seg" role="radiogroup" aria-label="Match level">
        {LEVELS.map(({ level: lv, label }) => (
          <button key={lv} role="radio" aria-checked={level === lv}
            className={`cap-opt${level === lv ? ' on' : ''}`} onClick={() => setLevel(lv)}>
            <span className="cap-opt-lv">{label}</span>
            <span className="cap-opt-val">{keyName(dataset, keyAt(selId, lv))}</span>
          </button>
        ))}
      </div>

      <div className="cap-cta">
        <button className="cam-btn primary" onClick={() => onMatch(level, key)}>Match {keyName(dataset, key)}</button>
        <button className="cam-btn ghost" onClick={() => onBrowse(level, key)}>Browse {keyName(dataset, key)}</button>
      </div>
      {onRetake && <button className="cap-retake" onClick={onRetake}>← Retake photo</button>}
    </div>
  )
}
```

Add to `src/styles/app.css`:

```css
.cap-result { width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: var(--s2); }
.cap-saw { display: flex; align-items: center; gap: var(--s2); color: var(--ink-muted); font-size: 0.85rem; }
.cap-saw b { color: var(--ink); font-family: var(--font-mono); font-weight: 400; }
.cap-sw { width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--hairline); }
.cap-hero { height: 120px; border-radius: var(--radius); position: relative; border: 1px solid var(--hairline); }
.cap-tag { position: absolute; top: 8px; left: 9px; font-size: 0.6rem; letter-spacing: 0.08em;
  text-transform: uppercase; background: rgba(248,246,242,0.85); color: var(--ink-muted);
  padding: 2px 8px; border-radius: 999px; }
.cap-name { font-family: var(--font-display); font-size: 1.5rem; }
.cap-code { font-family: var(--font-mono); font-size: 0.78rem; color: var(--ink-muted); }
.cap-more { align-self: flex-start; background: none; border: 0; color: var(--link);
  font: inherit; font-size: 0.8rem; cursor: pointer; padding: var(--s1) 0; }
.cap-near { max-height: 150px; overflow-y: auto; border: 1px solid var(--hairline); border-radius: var(--radius); }
.cap-li { display: flex; align-items: center; gap: var(--s2); width: 100%;
  padding: 8px 10px; background: none; border: 0; border-bottom: 1px solid var(--hairline);
  font: inherit; text-align: left; cursor: pointer; }
.cap-li:last-child { border-bottom: 0; }
.cap-li.sel { background: var(--paper-2); }
.cap-li-sw { width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--hairline); }
.cap-li-nm { font-family: var(--font-display); }
.cap-seg-h { font-size: 0.72rem; color: var(--ink-muted); margin: var(--s2) 0 0; }
.cap-seg { display: flex; border: 1px solid var(--hairline); border-radius: var(--radius); overflow: hidden; }
.cap-opt { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; background: var(--paper-1); border: 0; border-right: 1px solid var(--hairline);
  font: inherit; cursor: pointer; }
.cap-opt:last-child { border-right: 0; }
.cap-opt-lv { font-size: 0.56rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-faint); }
.cap-opt-val { font-family: var(--font-display); font-size: 0.9rem; color: var(--ink-muted); text-align: center; }
.cap-opt.on { background: var(--paper-2); box-shadow: inset 0 -2px 0 var(--link); }
.cap-opt.on .cap-opt-lv { color: var(--link); }
.cap-opt.on .cap-opt-val { color: var(--ink); }
.cap-cta { display: flex; gap: var(--s2); margin-top: var(--s2); }
.cap-cta .cam-btn { flex: 1; }
.cap-retake { align-self: center; background: none; border: 0; color: var(--ink-muted);
  font: inherit; font-size: 0.85rem; cursor: pointer; margin-top: var(--s2); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/appSmoke.test.tsx tests/captureResult.test.tsx` → PASS. Then `npx tsc --noEmit && make test`.

**Owner browser checklist:** hero shows the closest color; expanding "more close matches" scrolls; tapping a near match promotes it and re-labels the level chips and buttons; the closeness cue reads in plain words; Shade is preselected.

- [ ] **Step 5: Commit**

```bash
git add src/components/camera/CaptureResult.tsx src/styles/app.css tests/appSmoke.test.tsx tests/captureResult.test.tsx
git commit -m "feat(camera): CaptureResult hero + near list + level/destination"
```

---

### Task 13: Doorway — CameraSearch container + SearchBox icon + placeholder

**Files:**
- Create: `src/components/camera/CameraSearch.tsx`
- Modify: `src/components/SearchBox.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/appSmoke.test.tsx` (extend)

**Interfaces:**
- Consumes: `ColorCapture`, `CaptureResult`, `cameraSupported`, `keyColorId`, `MatchLevel`, `RGB`.
- Produces: `CameraSearch({ dispatch, onClose }: { dispatch: (a: Action) => void; onClose: () => void })`.

- [ ] **Step 1: Write the failing smoke test**

Append to `tests/appSmoke.test.tsx`:

```ts
it('search box uses the new placeholder copy', () => {
  const html = renderToString(<App />)
  expect(html).toContain('Find a color…')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/appSmoke.test.tsx` → FAIL (old placeholder).

- [ ] **Step 3: Implement**

Create `src/components/camera/CameraSearch.tsx`:

```tsx
import { useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { keyColorId } from '../../core/dataset'
import type { Action, MatchLevel } from '../../core/state'
import { CaptureResult } from './CaptureResult'
import { ColorCapture } from './ColorCapture'

// Map a chosen (level, key) to a scoped Browse filter — replaces any prior filter.
function browseFor(level: MatchLevel, key: string): { family: string; shade: string; colorId: string } {
  if (level === 0) return { family: '', shade: '', colorId: String(keyColorId(key)) }
  if (level === 1) return { family: '', shade: key, colorId: '' }
  return { family: key, shade: '', colorId: '' }
}

export function CameraSearch({ dispatch, onClose }: {
  dispatch: (a: Action) => void
  onClose: () => void
}) {
  const [rgb, setRgb] = useState<RGB | null>(null)

  if (rgb === null) {
    return <ColorCapture onSample={setRgb} onClose={onClose} />
  }
  return (
    <div className="cam-overlay" role="dialog" aria-label="Color match result">
      <button className="cam-close" onClick={onClose} aria-label="Close">×</button>
      <CaptureResult
        rgb={rgb}
        onRetake={() => setRgb(null)}
        onMatch={(level, key) => { dispatch({ type: 'seedPalette', key, level }); onClose() }}
        onBrowse={(level, key) => {
          dispatch({ type: 'setBrowseFilter', browse: browseFor(level, key) })
          dispatch({ type: 'setView', view: 'browse' })
          onClose()
        }}
      />
    </div>
  )
}
```

Replace `src/components/SearchBox.tsx`:

```tsx
import { useRef, useState } from 'react'
import { searchColors } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { CameraSearch } from './camera/CameraSearch'
import { cameraSupported } from './camera/cameraStream'

export function SearchBox({ dispatch }: { dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [camOpen, setCamOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const matches = searchColors(dataset, q).slice(0, 8)

  function choose(id: number) {
    dispatch({ type: 'select', selection: { kind: 'color', id } })
    setQ('')
    inputRef.current?.blur()
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && matches[active]) choose(matches[active].id)
    else if (e.key === 'Escape') { e.stopPropagation(); setQ('') }
  }

  return (
    <div className="search-box">
      <input ref={inputRef} value={q} placeholder="Find a color…"
        aria-label="Search colors"
        onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKeyDown}
        onBlur={() => { setTimeout(() => setQ(''), 150) }} />
      {cameraSupported() && (
        <button type="button" className="search-cam" aria-label="Find a color with the camera"
          onClick={() => setCamOpen(true)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.2" />
          </svg>
        </button>
      )}
      {matches.length > 0 && (
        <ul className="search-results" role="listbox">
          {matches.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button onMouseDown={() => choose(c.id)}>
                <span className="search-swatch" style={{ background: c.hex }} />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {camOpen && <CameraSearch dispatch={dispatch} onClose={() => setCamOpen(false)} />}
    </div>
  )
}
```

Add to `src/styles/app.css`:

```css
.search-cam {
  display: inline-grid; place-items: center;
  width: 32px; height: 32px; margin-left: var(--s1);
  background: var(--paper-2); color: var(--ink);
  border: 1px solid var(--hairline); border-radius: var(--radius); cursor: pointer;
}
.search-cam:hover { border-color: var(--accent); color: var(--accent); }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/appSmoke.test.tsx` → PASS (the camera icon itself is hidden in node since `cameraSupported()` is false; the placeholder assertion covers this task). `npx tsc --noEmit && make test`. Confirm `tests/camera-privacy.test.ts` still passes (CameraSearch.tsx contains no forbidden APIs).

**Owner browser checklist (full flow):** the camera icon appears next to search on a supported device; tapping it opens capture; freeze → tap → "Use this color" → result; "Match Olives" lands on the Match page seeded at Shade; "Browse Olives" lands on Browse with the shade chip; Color/Family variants route correctly; the icon is absent on an insecure (http) origin.

- [ ] **Step 5: Commit**

```bash
git add src/components/camera/CameraSearch.tsx src/components/SearchBox.tsx src/styles/app.css tests/appSmoke.test.tsx
git commit -m "feat(camera): search-box doorway wires capture → Match/Browse"
```

---

### Task 14: Documentation true-up

**Files:**
- Modify: `README.md`, `TODO.md`, `TODO-completed.md`, `PROMPTS.md`

- [ ] **Step 1: README — features + privacy/browser note**

Add a bullet to the `## Features` list:

```md
- **Find a color by camera** — on a phone or webcam, tap the camera icon in
  search, freeze a photo of a garment, and tap its color. The site matches it to
  the closest book colors and lets you Match or Browse at color, shade, or family
  level. **Your photo never leaves your device and is never saved** — it needs a
  secure (HTTPS) connection and camera permission; where those aren't available
  the camera icon simply doesn't appear.
```

- [ ] **Step 2: TODO / TODO-completed reconciliation**

In `TODO-completed.md`, add a `## Session 6 — camera color capture (2026-07-20)` section listing the shipped tasks with their commit hashes (fill in the real short hashes from `git log --oneline` for Tasks 1–13).

In `TODO.md`: the camera work partially covers three existing items — remove or annotate them accurately:
- "PWA: installable web app with camera access" → the camera capture shipped; leave the *PWA/installable* part as still-deferred.
- "Seed the Match page from a detected shade (photo → shade → land here)" → **done** (move to completed).
- "Nearest-color search: paste any hex" → still open (a *text* hex input was not built; camera is the input) — keep, note the perceptual `nearestColors` engine now exists.
Add the spec's deferred items: camera doorways on the Match and Browse tabs; live-eyedropper sampling; multi-point/pattern detection; saved-color history is **excluded for privacy**; ΔE2000 metric (cheap swap in `colorDistance.ts`).

- [ ] **Step 3: PROMPTS — implementation note**

Append a short "Session 6 — camera implementation" note under the existing Session 6 log recording that the plan was executed subagent-driven and the feature merged. (The Session 6 brainstorm/decision entry already lives in PROMPTS on the docs branch; when branches merge, both coexist — resolve any tail conflict by keeping both, newest last.)

- [ ] **Step 4: Verify**

Run: `make test` and `make build` → all green. Re-read README's new bullet against the actual behavior (no over-claim).

- [ ] **Step 5: Commit**

```bash
git add README.md TODO.md TODO-completed.md PROMPTS.md
git commit -m "docs: camera color capture — README feature, TODO reconcile, PROMPTS"
```

---

## Self-Review

**1. Spec coverage** — every spec section maps to a task:
- Freeze-then-tap capture → Task 11 (ColorCapture). Perceptual OKLab match (culori, in `src/color/`) → Tasks 1–2. averagePatch → Task 3. Hero + scrollable near list + Color/Shade/Family (default Shade) + plain-words closeness + Match/Browse → Task 12. Doorway + camera icon + placeholder "Find a color…" → Task 13. Full grid (Match Color, Browse Shade) → Tasks 5–9. Privacy guarantees + source-scan + track-stop → Tasks 10–11. Reusable boundary (ColorCapture/nearestColors/CaptureResult) → Tasks 2, 11, 12. Metric seam (`src/color/colorDistance.ts`) → Task 1. Feature-detection / permission errors → Tasks 10, 11. Docs → Task 14. ✓ No gaps.

**Dependencies & layering** — `culori` (runtime) is used only in `src/color/` (Tasks 1–2), never in `src/core/`, so `core-purity.test.ts` is untouched; a local `culori.d.ts` covers the missing types. `jsdom` + `@testing-library/react` + `@testing-library/dom` (dev) back the camera interaction tests (Tasks 11–12), which opt into jsdom per-file (`// @vitest-environment jsdom`) while the global env stays `node`. All four are justified in CLAUDE.md. `src/core/colorMath.ts` is unchanged (no hand-rolled OKLab). Import paths verified: components/tests import distance/nearest from `src/color/`, everything else from `src/core/`.

**2. Placeholder scan** — no "TBD/etc."; every code step has complete code; commands and expected results are concrete. Task 14 asks the implementer to fill *real commit hashes* into TODO-completed — that's a genuine value only knowable at execution time, not a plan placeholder.

**3. Type consistency** — `MatchLevel = 0|1|2` defined in Task 5 and consumed consistently (Tasks 6, 8, 12, 13). `nearestColors(ix, rgb, count): NearMatch[]` (Task 2) consumed in Task 12. `averagePatch(data, width, height, cx, cy, radius)` (Task 3) called with matching args in Task 11. `keyName/keySwatches/keyColorId/isColorKey` (Task 4) consumed in Tasks 6, 7, 12, 13. `browseFor` returns the exact `{ family; shade; colorId }` shape of `setBrowseFilter` (Task 5). `cameraSupported/stopStream` (Task 10) consumed in Tasks 11, 13. Capture callbacks `onMatch/onBrowse(level, key)` (Task 12) supplied by CameraSearch (Task 13). ✓ Consistent.

**Note on Task 5/6 ordering:** Task 5 changes `MatchLevel` and can leave `matching.ts`'s `remapKeysToLevel` signature momentarily mismatched; Task 6 resolves it. Land them back-to-back (or as one commit) so the suite returns to green before Task 7.
