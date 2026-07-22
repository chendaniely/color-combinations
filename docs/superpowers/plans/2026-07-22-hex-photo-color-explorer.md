# Hex / Photo Color Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user name a color three ways — pasted hex, uploaded photo (tap/eyedrop), or the existing live camera — and explore the nearest book colors in one unified grid that hands off to Match/Browse.

**Architecture:** All three sources produce one `RGB`, which flows into a single result grid (`ColorMatches`, a refactor of `CaptureResult`). A new `ColorSampler` modal (generalizing today's `CameraSearch`) shows a source picker then the chosen source, then the grid. Pure hex parsing (`parseHex`) lands in the core kernel; all browser bits (canvas, File, hex UI) live in a new `src/components/sample/` directory. The camera's canvas-tap sampling is extracted into a shared `sampleCanvasAt` helper used by both camera and upload.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest (+ jsdom, @testing-library/react). Reuses `culori` (via the `colorDistance` seam), no new deps.

## Global Constraints

- **No new dependencies.** File/FileReader/Canvas/`URL.createObjectURL` are browser built-ins; ranking reuses `nearestColors` + `closenessLabel`.
- **Core purity:** `parseHex` goes in `src/core/colorMath.ts`, uses only string/regex/`parseInt` — no browser globals. `tests/core-purity.test.ts` must stay green and unweakened.
- **culori stays in `src/color/`** (the `colorDistance` seam) — never imported by `src/core/`.
- **New browser components live in `src/components/sample/`, NOT `src/components/camera/`.** `tests/camera-privacy.test.ts` scans `camera/` and forbids `createObjectURL`/`toDataURL`/`toBlob`/network/storage; the upload path needs `createObjectURL`, so it must not sit under `camera/`.
- **Style values only via `src/styles/tokens.css`.** Reuse the existing `.cam-*` and `.cap-*` classes; NYC blue is `var(--link)`. No hard-coded colors in components (Wada data colors excepted).
- **Result grid = exactly 12 nearest colors**, each labeled via `closenessLabel(distance)`.
- **`parseHex`** accepts `#RRGGBB`, `RRGGBB`, `#RGB`, `RGB`; case-insensitive; trims whitespace; expands 3-digit shorthand; returns `null` on anything else.
- **Match/Browse handoff (unchanged wiring):** Match → `dispatch({ type:'seedPalette', key, level })`; Browse → `dispatch({ type:'setBrowseFilter', browse: browseFor(level,key) })` then `dispatch({ type:'setView', view:'browse' })`.
- **Camera row appears only when `cameraSupported()`**; upload + hex always appear.
- **Docs contract:** update `README.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, and `CLAUDE.md` (the `parseHex` core note) in the same commits.
- **Every task ends green:** `npx tsc --noEmit` and `make test` pass. Build new files in `sample/` alongside the old camera flow; the old `CameraSearch`/`CaptureResult` are deleted only in Task 5, so the tree never breaks between tasks.

## File Structure

- `src/core/colorMath.ts` (modify) — add pure `parseHex`.
- `src/components/camera/sampleCanvas.ts` (create) — shared `sampleCanvasAt` (canvas tap → averaged RGB). Lives in `camera/` (only uses `getImageData`, which the privacy scan allows) so both camera and the upload picker can import it.
- `src/components/camera/ColorCapture.tsx` (modify) — use `sampleCanvasAt`.
- `src/components/sample/ColorMatches.tsx` (create) — the 12-color explore grid (refactor of `CaptureResult`).
- `src/components/sample/ImagePicker.tsx` (create) — upload → canvas → eyedrop.
- `src/components/sample/HexPicker.tsx` (create) — hex text → RGB.
- `src/components/sample/ColorSampler.tsx` (create) — source picker + orchestrator (generalizes `CameraSearch`).
- `src/components/SearchBox.tsx` (modify) — always-visible "Sample a color" button opening `ColorSampler`.
- `src/components/camera/CameraSearch.tsx`, `src/components/camera/CaptureResult.tsx` (delete in Task 5).
- `src/styles/app.css` (modify) — rename `.search-cam`→`.search-sample`; add grid/hex/picker classes.
- Tests: `tests/parseHex.test.ts`, `tests/colorMatches.test.tsx`, `tests/sampleCanvas.test.ts`, `tests/imagePicker.test.tsx`, `tests/hexPicker.test.tsx`, `tests/sample-privacy.test.ts` (create); `tests/appSmoke.test.tsx` (modify); `tests/captureResult.test.tsx` (delete in Task 5).
- Docs: `README.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, `CLAUDE.md`.

---

### Task 1: `parseHex` in the core kernel

**Files:**
- Modify: `src/core/colorMath.ts`
- Test: `tests/parseHex.test.ts`

**Interfaces:**
- Consumes: `RGB` (`= [number, number, number]`) from `src/core/colorMath.ts`.
- Produces: `parseHex(input: string): RGB | null`.

- [ ] **Step 1: Write the failing test** — create `tests/parseHex.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseHex } from '../src/core/colorMath'

describe('parseHex', () => {
  it('parses 6-digit hex with and without #', () => {
    expect(parseHex('#236192')).toEqual([35, 97, 146])
    expect(parseHex('236192')).toEqual([35, 97, 146])
  })
  it('is case-insensitive and trims whitespace', () => {
    expect(parseHex('  #23619F  ')).toEqual([35, 97, 159])
  })
  it('expands 3-digit shorthand', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('f80')).toEqual([255, 136, 0])
  })
  it('returns null for anything invalid', () => {
    for (const bad of ['', '#12', '#1234', '#12345', '#1234567', 'xyz', '#gggggg', '  ']) {
      expect(parseHex(bad)).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/parseHex.test.ts`
Expected: FAIL — `parseHex` is not exported.

- [ ] **Step 3: Implement `parseHex`** — append to `src/core/colorMath.ts` (after `hexToRgb`):

```ts
// Parse a user-entered hex color into RGB, or null if it isn't a valid 3- or
// 6-digit hex. Accepts an optional leading '#', any case, surrounding
// whitespace; expands 3-digit shorthand. Pure — no browser globals.
export function parseHex(input: string): RGB | null {
  const h = input.trim().replace(/^#/, '').toLowerCase()
  if (!/^[0-9a-f]{3}$/.test(h) && !/^[0-9a-f]{6}$/.test(h)) return null
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/parseHex.test.ts tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS (parseHex green; core purity still green).

- [ ] **Step 5: Commit**

```bash
git add src/core/colorMath.ts tests/parseHex.test.ts
git commit -m "feat(core): parseHex — validated hex→RGB for the color sampler"
```

---

### Task 2: `ColorMatches` explore-grid result

**Files:**
- Create: `src/components/sample/ColorMatches.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/colorMatches.test.tsx`

**Interfaces:**
- Consumes: `nearestColors(ix, rgb, count): { color: ColorRecord; distance: number }[]` from `src/color/nearestColor.ts`; `closenessLabel(distance): 'very close'|'close'|'roughly'` from `src/color/colorDistance.ts`; `ancestorAtLevel(dataset, colorId, level)`, `keyName(dataset, key)` from `src/core/dataset.ts`; `dataset` (with `colorById.get(id)`, `data.colors`) from `src/data.ts`; `MatchLevel` from `src/core/state.ts`; `RGB` from `src/core/colorMath.ts`.
- Produces: `ColorMatches({ rgb, onMatch, onBrowse, onBack? })` where `onMatch`/`onBrowse` are `(level: MatchLevel, key: string) => void` and `onBack?` is `() => void`.

This is a new file that does not touch the old camera flow, so the tree stays green.

- [ ] **Step 1: Write the failing test** — create `tests/colorMatches.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorMatches } from '../src/components/sample/ColorMatches'
import { hexToRgb } from '../src/core/colorMath'
import { ancestorAtLevel } from '../src/core/dataset'
import { dataset } from '../src/data'

afterEach(cleanup)

describe('ColorMatches (jsdom)', () => {
  it('shows 12 nearest colors, preselects the closest, fires Match at Shade (1)', () => {
    const onMatch = vi.fn()
    render(<ColorMatches rgb={hexToRgb('#236192')} onMatch={onMatch} onBrowse={() => {}} />)
    expect(document.querySelectorAll('.match-cell').length).toBe(12)
    // Helvetia Blue #0057ba is the closest book color to NYC blue.
    expect(screen.getByRole('option', { selected: true }).textContent).toContain('Helvetia Blue')
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch.mock.calls[0][0]).toBe(1)
  })
  it('switching to Family changes the level the actions use', () => {
    const onBrowse = vi.fn()
    render(<ColorMatches rgb={hexToRgb('#236192')} onMatch={() => {}} onBrowse={onBrowse} />)
    fireEvent.click(screen.getByRole('radio', { name: /Family/ }))
    fireEvent.click(screen.getByText(/^Browse /))
    expect(onBrowse.mock.calls[0][0]).toBe(2)
  })
  it('selecting another swatch re-keys the actions to that color', () => {
    const onMatch = vi.fn()
    render(<ColorMatches rgb={hexToRgb('#236192')} onMatch={onMatch} onBrowse={() => {}} />)
    const cells = document.querySelectorAll('.match-cell')
    const second = cells[1] as HTMLElement
    const secondName = second.querySelector('.match-nm')!.textContent!
    fireEvent.click(second)
    const secondColor = dataset.data.colors.find((c) => c.name === secondName)!
    const expectedKey = ancestorAtLevel(dataset, secondColor.id, 1)
    fireEvent.click(screen.getByText(/^Match /))
    expect(onMatch).toHaveBeenCalledWith(1, expectedKey)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/colorMatches.test.tsx`
Expected: FAIL — module `../src/components/sample/ColorMatches` not found.

- [ ] **Step 3: Implement `ColorMatches`** — create `src/components/sample/ColorMatches.tsx`:

```tsx
import { useState } from 'react'
import { closenessLabel } from '../../color/colorDistance'
import { nearestColors } from '../../color/nearestColor'
import type { RGB } from '../../core/colorMath'
import { ancestorAtLevel, keyName } from '../../core/dataset'
import type { MatchLevel } from '../../core/state'
import { dataset } from '../../data'

const NEAR_COUNT = 12
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 0, label: 'Color' }, { level: 1, label: 'Shade' }, { level: 2, label: 'Family' },
]

// key for a color id at a given match level: color → c{id}; shade/family → ancestor id
function keyAt(colorId: number, level: MatchLevel): string {
  return level === 0 ? `c${colorId}` : ancestorAtLevel(dataset, colorId, level)
}
function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// The unified result: the N book colors nearest to a sampled RGB (from camera,
// upload, or hex). Pick a swatch, choose Color/Shade/Family, then Match/Browse.
export function ColorMatches({ rgb, onMatch, onBrowse, onBack }: {
  rgb: RGB
  onMatch: (level: MatchLevel, key: string) => void
  onBrowse: (level: MatchLevel, key: string) => void
  onBack?: () => void
}) {
  const near = nearestColors(dataset, rgb, NEAR_COUNT)
  const [selId, setSelId] = useState(near[0].color.id)
  const [level, setLevel] = useState<MatchLevel>(1) // default Shade
  const sel = dataset.colorById.get(selId)!
  const key = keyAt(selId, level)
  const gaveHex = toHex(rgb)

  return (
    <div className="cap-result">
      <div className="cap-saw">
        <span className="cap-sw" style={{ background: gaveHex }} />
        <span>You gave <b>{gaveHex}</b></span>
      </div>

      <p className="cap-seg-h">Nearest book colors — tap to choose</p>
      <div className="match-grid" role="listbox" aria-label="Nearest book colors">
        {near.map((n) => (
          <button key={n.color.id} type="button" role="option" aria-selected={n.color.id === selId}
            className={`match-cell${n.color.id === selId ? ' on' : ''}`}
            onClick={() => setSelId(n.color.id)}>
            <span className="match-tile" style={{ background: n.color.hex }} />
            <span className="match-nm">{n.color.name}</span>
            <span className="match-lab">{closenessLabel(n.distance)}</span>
          </button>
        ))}
      </div>

      <p className="cap-seg-h">Use {sel.name} as</p>
      <div className="cap-seg" role="radiogroup" aria-label="Match level">
        {LEVELS.map(({ level: lv, label }) => (
          <button key={lv} type="button" role="radio" aria-checked={level === lv}
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
      {onBack && <button className="cap-retake" onClick={onBack}>← Sample another color</button>}
    </div>
  )
}
```

- [ ] **Step 4: Add grid styles** — append to `src/styles/app.css` (after the `.cap-retake` rule, near line 393):

```css
/* Color-sampler explore grid */
.match-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s2); }
.match-cell {
  display: flex; flex-direction: column; align-items: center; gap: 3px; text-align: center;
  background: none; border: 1.5px solid transparent; border-radius: var(--radius);
  padding: 4px 2px 6px; cursor: pointer;
}
.match-cell.on { border-color: var(--link); background: var(--paper-2); }
.match-tile { width: 100%; height: 40px; border-radius: var(--radius); border: 1px solid var(--hairline); }
.match-nm { font-family: var(--font-display); font-size: 0.72rem; line-height: 1.1; color: var(--ink); }
.match-lab { font-size: 0.56rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-muted); }
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/colorMatches.test.tsx && npx tsc --noEmit`
Expected: PASS (3 tests). The old `tests/captureResult.test.tsx` is untouched and still green.

- [ ] **Step 6: Commit**

```bash
git add src/components/sample/ColorMatches.tsx src/styles/app.css tests/colorMatches.test.tsx
git commit -m "feat(sample): ColorMatches — 12-color explore grid result"
```

---

### Task 3: Shared `sampleCanvasAt` + `ImagePicker`

**Files:**
- Create: `src/components/camera/sampleCanvas.ts`
- Modify: `src/components/camera/ColorCapture.tsx`
- Create: `src/components/sample/ImagePicker.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/sampleCanvas.test.ts`, `tests/imagePicker.test.tsx`

**Interfaces:**
- Consumes: `averagePatch(data, width, height, cx, cy, radius): RGB` from `src/core/sampling.ts`; `RGB` from `src/core/colorMath.ts`.
- Produces: `sampleCanvasAt(canvas: HTMLCanvasElement, clientX: number, clientY: number, radius?: number): RGB | null` and `PATCH_RADIUS` from `src/components/camera/sampleCanvas.ts`; `ImagePicker({ onSample, onClose })` where `onSample: (rgb: RGB) => void`, `onClose: () => void`.

- [ ] **Step 1: Write the failing test for the shared helper** — create `tests/sampleCanvas.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { sampleCanvasAt } from '../src/components/camera/sampleCanvas'

// A 4×4 canvas of one color, displayed in a 100×100 box (object-fit: cover).
function mockCanvas(pixel: [number, number, number], w = 4, h = 4): HTMLCanvasElement {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) { data[i * 4] = pixel[0]; data[i * 4 + 1] = pixel[1]; data[i * 4 + 2] = pixel[2]; data[i * 4 + 3] = 255 }
  return {
    width: w, height: h,
    getContext: () => ({ getImageData: () => ({ data, width: w, height: h }) }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  } as unknown as HTMLCanvasElement
}

describe('sampleCanvasAt (jsdom)', () => {
  it('averages the patch at the tapped source pixel', () => {
    expect(sampleCanvasAt(mockCanvas([35, 97, 146]), 50, 50)).toEqual([35, 97, 146])
  })
  it('returns null when the canvas has no dimensions', () => {
    expect(sampleCanvasAt(mockCanvas([0, 0, 0], 0, 0), 10, 10)).toBeNull()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/sampleCanvas.test.ts`
Expected: FAIL — module `sampleCanvas` not found.

- [ ] **Step 3: Implement `sampleCanvasAt`** — create `src/components/camera/sampleCanvas.ts`:

```ts
// Shared canvas eyedrop: map a pointer tap on a cover-fit canvas back to a
// source pixel and average a small patch. Used by the live camera and the
// image-upload picker. Reads getImageData locally (allowed by the camera
// privacy test) — never a network/storage API.
import type { RGB } from '../../core/colorMath'
import { averagePatch } from '../../core/sampling'

export const PATCH_RADIUS = 6

export function sampleCanvasAt(
  canvas: HTMLCanvasElement, clientX: number, clientY: number, radius = PATCH_RADIUS,
): RGB | null {
  const ctx = canvas.getContext('2d')
  if (!ctx || !canvas.width || !canvas.height) return null
  const rect = canvas.getBoundingClientRect()
  // canvas.width/height are the source pixels; rect is the displayed box. The
  // element is object-fit: cover, so invert the uniform cover scale + centered
  // crop to map a tap to a source pixel (NOT an independent x/y stretch = fill).
  const k = Math.max(rect.width / canvas.width, rect.height / canvas.height)
  const cx = (clientX - rect.left - rect.width / 2) / k + canvas.width / 2
  const cy = (clientY - rect.top - rect.height / 2) / k + canvas.height / 2
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return averagePatch(img.data, canvas.width, canvas.height, cx, cy, radius)
}
```

- [ ] **Step 4: Run the helper test**

Run: `npx vitest run tests/sampleCanvas.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Refactor `ColorCapture` to use it** — in `src/components/camera/ColorCapture.tsx`: replace the `averagePatch` import and the local `const PATCH_RADIUS = 6` with `import { sampleCanvasAt } from './sampleCanvas'`, and replace the body of `sampleAt` so it delegates. The new `sampleAt`:

```tsx
function sampleAt(e: React.PointerEvent<HTMLCanvasElement>) {
  const canvas = canvasRef.current
  if (!canvas) return
  const rgb = sampleCanvasAt(canvas, e.clientX, e.clientY)
  if (!rgb) return
  const rect = canvas.getBoundingClientRect()
  // xPct/yPct place the .cam-tap marker in display/box space (not the
  // cover-inverted source coords, which would misplace it under any aspect).
  setTap({
    xPct: ((e.clientX - rect.left) / rect.width) * 100,
    yPct: ((e.clientY - rect.top) / rect.height) * 100,
    rgb,
  })
}
```

Remove the now-unused `import { averagePatch } from '../../core/sampling'` line and the `const PATCH_RADIUS = 6` line. Keep the `toHex` helper and everything else unchanged.

- [ ] **Step 6: Confirm the camera tests still pass (behavior preserved)**

Run: `npx vitest run tests/colorCapture.test.tsx tests/camera-privacy.test.ts`
Expected: PASS — the extraction preserves ColorCapture's coordinate mapping; `sampleCanvas.ts` uses no forbidden APIs.

- [ ] **Step 7: Write the failing ImagePicker test** — create `tests/imagePicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ImagePicker } from '../src/components/sample/ImagePicker'

afterEach(cleanup)

describe('ImagePicker (jsdom)', () => {
  it('offers an image-only file input and rejects a non-image file', () => {
    render(<ImagePicker onSample={() => {}} onClose={() => {}} />)
    const input = screen.getByLabelText('Choose a photo') as HTMLInputElement
    expect(input.accept).toBe('image/*')
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText(/isn.t an image/)).toBeTruthy()
  })
})
```

Note: the full load→draw→tap path needs a real browser (jsdom doesn't decode images), so it lives on the owner browser checklist. This test covers the file-input contract and the non-image guard, which run without image decoding.

- [ ] **Step 8: Run it and confirm it fails**

Run: `npx vitest run tests/imagePicker.test.tsx`
Expected: FAIL — module `ImagePicker` not found.

- [ ] **Step 9: Implement `ImagePicker`** — create `src/components/sample/ImagePicker.tsx`:

```tsx
import { useRef, useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { sampleCanvasAt } from '../camera/sampleCanvas'

const MAX_DIM = 1600

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Upload a photo and eyedrop a region — the still-image sibling of the camera.
// Everything is local: the file is drawn to a canvas and sampled in-browser.
export function ImagePicker({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [tap, setTap] = useState<{ xPct: number; yPct: number; rgb: RGB } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('That file isn’t an image — pick a photo.'); return }
    setError(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
        setLoaded(true); setTap(null)
      }
      URL.revokeObjectURL(url)
    }
    img.onerror = () => { setError('Couldn’t read that image — try another.'); URL.revokeObjectURL(url) }
    img.src = url
  }

  function sampleAt(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rgb = sampleCanvasAt(canvas, e.clientX, e.clientY)
    if (!rgb) return
    const rect = canvas.getBoundingClientRect()
    setTap({
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
      rgb,
    })
  }

  return (
    <div className="cam-overlay" role="dialog" aria-label="Sample a color from a photo">
      <button className="cam-close" onClick={onClose} aria-label="Back">×</button>
      <p className="cam-steps">
        {!loaded
          ? <><b>Step 1 of 2:</b> Choose a photo.</>
          : !tap
            ? <><b>Step 2 of 2:</b> Tap the exact color on the photo.</>
            : <>Tap another spot to change your pick, or use the button below.</>}
      </p>
      {!loaded && (
        <label className="sample-upload">
          <input type="file" accept="image/*" onChange={onFile} aria-label="Choose a photo" />
          <span>Choose a photo…</span>
        </label>
      )}
      <div className="cam-stage" style={{ display: loaded ? 'block' : 'none' }}>
        <canvas ref={canvasRef} className="cam-canvas" style={{ display: 'block' }} onPointerDown={sampleAt} />
        {loaded && tap && (
          <div className="cam-tap" style={{ left: `${tap.xPct}%`, top: `${tap.yPct}%` }}>
            <span className="cam-tap-chip"><i style={{ background: toHex(tap.rgb) }} />{toHex(tap.rgb)}</span>
          </div>
        )}
      </div>
      {error && <p className="cam-error">{error}</p>}
      <div className="cam-controls">
        {loaded && (
          <button className="cam-btn primary" disabled={!tap} onClick={() => tap && onSample(tap.rgb)}>Use this color</button>
        )}
      </div>
      <p className="cam-privacy">Your photo stays on this device — nothing is uploaded or saved.</p>
    </div>
  )
}
```

- [ ] **Step 10: Add the upload-label style** — append to `src/styles/app.css`:

```css
.sample-upload {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0.6rem 1rem; border: 1px dashed var(--ink-faint); border-radius: var(--radius);
  color: var(--ink); cursor: pointer;
}
.sample-upload input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
```

- [ ] **Step 11: Run tests + typecheck**

Run: `npx vitest run tests/sampleCanvas.test.ts tests/imagePicker.test.tsx tests/colorCapture.test.tsx tests/camera-privacy.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add src/components/camera/sampleCanvas.ts src/components/camera/ColorCapture.tsx src/components/sample/ImagePicker.tsx src/styles/app.css tests/sampleCanvas.test.ts tests/imagePicker.test.tsx
git commit -m "feat(sample): shared sampleCanvasAt + ImagePicker (upload → eyedrop)"
```

---

### Task 4: `HexPicker`

**Files:**
- Create: `src/components/sample/HexPicker.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/hexPicker.test.tsx`

**Interfaces:**
- Consumes: `parseHex(input: string): RGB | null` and `RGB` from `src/core/colorMath.ts`.
- Produces: `HexPicker({ onSample, onClose })` where `onSample: (rgb: RGB) => void`, `onClose: () => void`.

- [ ] **Step 1: Write the failing test** — create `tests/hexPicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HexPicker } from '../src/components/sample/HexPicker'

afterEach(cleanup)

describe('HexPicker (jsdom)', () => {
  it('keeps Explore disabled until the hex is valid, then emits RGB', () => {
    const onSample = vi.fn()
    render(<HexPicker onSample={onSample} onClose={() => {}} />)
    const input = screen.getByLabelText('Hex color')
    const explore = screen.getByText('Explore this color') as HTMLButtonElement
    expect(explore.disabled).toBe(true)
    fireEvent.change(input, { target: { value: '#236192' } })
    expect(explore.disabled).toBe(false)
    fireEvent.click(explore)
    expect(onSample).toHaveBeenCalledWith([35, 97, 146])
  })
  it('shows a hint for an invalid hex and keeps Explore disabled', () => {
    render(<HexPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: 'nope' } })
    expect(screen.getByText(/3- or 6-digit hex/)).toBeTruthy()
    expect((screen.getByText('Explore this color') as HTMLButtonElement).disabled).toBe(true)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/hexPicker.test.tsx`
Expected: FAIL — module `HexPicker` not found.

- [ ] **Step 3: Implement `HexPicker`** — create `src/components/sample/HexPicker.tsx`:

```tsx
import { useState } from 'react'
import { parseHex, type RGB } from '../../core/colorMath'

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// Paste a hex color; a live swatch previews it and Explore stays disabled until
// it parses. Emits the RGB for the shared result grid.
export function HexPicker({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const rgb = parseHex(text)
  const showError = text.trim().length > 0 && rgb === null

  return (
    <div className="cam-overlay" role="dialog" aria-label="Enter a hex color">
      <button className="cam-close" onClick={onClose} aria-label="Back">×</button>
      <p className="cam-steps"><b>Paste a hex color</b> — like #F26522 or #236192.</p>
      <div className="hex-field">
        <span className="hex-swatch" style={{ background: rgb ? toHex(rgb) : 'transparent' }} aria-hidden="true" />
        <input className="hex-input" value={text} autoFocus placeholder="#236192"
          aria-label="Hex color" aria-invalid={showError}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && rgb) onSample(rgb) }} />
      </div>
      {showError && <p className="cam-error">Enter a 3- or 6-digit hex, e.g. #236192.</p>}
      <div className="cam-controls">
        <button className="cam-btn primary" disabled={rgb === null} onClick={() => rgb && onSample(rgb)}>
          Explore this color
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add hex-field styles** — append to `src/styles/app.css`:

```css
.hex-field { display: flex; align-items: center; gap: var(--s2); }
.hex-swatch { width: 34px; height: 34px; border-radius: var(--radius); border: 1px solid var(--hairline); }
.hex-input {
  font-family: var(--font-mono); font-size: 1rem; color: var(--ink);
  background: none; border: none; border-bottom: 1px solid var(--ink-faint);
  padding: var(--s2); width: 180px;
}
.hex-input:focus { outline: none; border-bottom-color: var(--link); }
```

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run tests/hexPicker.test.tsx && npx tsc --noEmit`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/sample/HexPicker.tsx src/styles/app.css tests/hexPicker.test.tsx
git commit -m "feat(sample): HexPicker — paste a hex, preview + explore"
```

---

### Task 5: `ColorSampler` orchestrator + `SearchBox` integration (the swap)

**Files:**
- Create: `src/components/sample/ColorSampler.tsx`
- Modify: `src/components/SearchBox.tsx`
- Modify: `src/styles/app.css`
- Create: `tests/sample-privacy.test.ts`
- Modify: `tests/appSmoke.test.tsx`
- Delete: `src/components/camera/CameraSearch.tsx`, `src/components/camera/CaptureResult.tsx`, `tests/captureResult.test.tsx`

**Interfaces:**
- Consumes: `ColorCapture`, `cameraSupported()` from `src/components/camera/`; `ColorMatches`, `ImagePicker`, `HexPicker` from `src/components/sample/`; `keyColorId(key): number` from `src/core/dataset.ts`; `Action`, `MatchLevel` from `src/core/state.ts`; `RGB` from `src/core/colorMath.ts`.
- Produces: `ColorSampler({ dispatch, onClose })` where `dispatch: (a: Action) => void`, `onClose: () => void`.

- [ ] **Step 1: Write the failing tests** — create `tests/sample-privacy.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SAMPLE = 'src/components/sample'

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
})
```

Also add a smoke test for the picker — in `tests/appSmoke.test.tsx`, add this `it` inside the `describe('app shell', …)` block:

```tsx
it('color sampler offers camera-agnostic sources (upload + hex) and renders', () => {
  const html = renderToString(<ColorSampler dispatch={() => {}} onClose={() => {}} />)
  expect(html).toContain('Sample a color')
  expect(html).toContain('Upload a photo')
  expect(html).toContain('Paste a hex')
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run tests/sample-privacy.test.ts tests/appSmoke.test.tsx`
Expected: FAIL — `sample-privacy` reads a directory that may lack the orchestrator, and `appSmoke` can't import `ColorSampler` yet.

- [ ] **Step 3: Implement `ColorSampler`** — create `src/components/sample/ColorSampler.tsx`:

```tsx
import { useState } from 'react'
import type { RGB } from '../../core/colorMath'
import { keyColorId } from '../../core/dataset'
import type { Action, MatchLevel } from '../../core/state'
import { cameraSupported } from '../camera/cameraStream'
import { ColorCapture } from '../camera/ColorCapture'
import { ColorMatches } from './ColorMatches'
import { HexPicker } from './HexPicker'
import { ImagePicker } from './ImagePicker'

type Source = 'camera' | 'upload' | 'hex'

// Map a chosen (level, key) to a scoped Browse filter — replaces any prior filter.
function browseFor(level: MatchLevel, key: string): { family: string; shade: string; colorId: string } {
  if (level === 0) return { family: '', shade: '', colorId: String(keyColorId(key)) }
  if (level === 1) return { family: '', shade: key, colorId: '' }
  return { family: key, shade: '', colorId: '' }
}

// The unified color sampler: pick a source (camera / upload / hex), produce one
// RGB, then explore the nearest book colors and hand off to Match/Browse.
export function ColorSampler({ dispatch, onClose }: {
  dispatch: (a: Action) => void
  onClose: () => void
}) {
  const [source, setSource] = useState<Source | null>(null)
  const [rgb, setRgb] = useState<RGB | null>(null)

  if (rgb !== null) {
    return (
      <div className="cam-overlay" role="dialog" aria-label="Nearest colors">
        <button className="cam-close" onClick={onClose} aria-label="Close">×</button>
        <ColorMatches rgb={rgb}
          onBack={() => { setRgb(null); setSource(null) }}
          onMatch={(level, key) => { dispatch({ type: 'seedPalette', key, level }); onClose() }}
          onBrowse={(level, key) => {
            dispatch({ type: 'setBrowseFilter', browse: browseFor(level, key) })
            dispatch({ type: 'setView', view: 'browse' })
            onClose()
          }} />
      </div>
    )
  }
  if (source === 'camera') return <ColorCapture onSample={setRgb} onClose={() => setSource(null)} />
  if (source === 'upload') return <ImagePicker onSample={setRgb} onClose={() => setSource(null)} />
  if (source === 'hex') return <HexPicker onSample={setRgb} onClose={() => setSource(null)} />

  return (
    <div className="cam-overlay" role="dialog" aria-label="Sample a color">
      <button className="cam-close" onClick={onClose} aria-label="Close">×</button>
      <div className="sample-picker">
        <h2 className="sample-title">Sample a color</h2>
        <p className="sample-sub">Find the book colors nearest to one you have.</p>
        {cameraSupported() && (
          <button type="button" className="sample-src" onClick={() => setSource('camera')}>
            <span className="sample-src-ic" aria-hidden="true">📷</span>
            <span className="sample-src-tx"><b>Camera</b><small>Point at something real</small></span>
          </button>
        )}
        <button type="button" className="sample-src" onClick={() => setSource('upload')}>
          <span className="sample-src-ic" aria-hidden="true">🖼</span>
          <span className="sample-src-tx"><b>Upload a photo</b><small>Tap a color in the picture</small></span>
        </button>
        <button type="button" className="sample-src" onClick={() => setSource('hex')}>
          <span className="sample-src-ic" aria-hidden="true">#</span>
          <span className="sample-src-tx"><b>Paste a hex</b><small>Like #F26522 or #236192</small></span>
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `SearchBox`** to open the sampler from an always-visible button. Replace the whole file `src/components/SearchBox.tsx`:

```tsx
import { useRef, useState } from 'react'
import { searchColors } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { ColorSampler } from './sample/ColorSampler'

export function SearchBox({ dispatch }: { dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [sampleOpen, setSampleOpen] = useState(false)
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
      <button type="button" className="search-sample" aria-label="Sample a color from a photo or hex"
        onClick={() => setSampleOpen(true)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M3 21l3.5-.7 9-9-2.8-2.8-9 9L3 21z" />
          <path d="M15.3 5.4l3.3 3.3 1.2-1.2a2.35 2.35 0 0 0-3.3-3.3l-1.2 1.2z" />
        </svg>
      </button>
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
      {sampleOpen && <ColorSampler dispatch={dispatch} onClose={() => setSampleOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 5: Update `app.css`** — rename `.search-cam` → `.search-sample` (keep the rules identical) and add the picker styles. In `src/styles/app.css`, change the two `.search-cam` selectors (near line 205) to `.search-sample` / `.search-sample:hover`, then append:

```css
/* Color-sampler source picker */
.sample-picker { display: flex; flex-direction: column; gap: var(--s2); width: 100%; max-width: 360px; }
.sample-title { font-family: var(--font-display); font-weight: 500; font-size: 1.5rem; }
.sample-sub { color: var(--ink-muted); font-size: 0.85rem; margin: 0 0 var(--s2); }
.sample-src {
  display: flex; align-items: center; gap: var(--s3); text-align: left;
  padding: var(--s3); background: var(--paper-1); color: var(--ink);
  border: 1px solid var(--hairline); border-radius: var(--radius); cursor: pointer;
}
.sample-src:hover { border-color: var(--link); }
.sample-src-ic { width: 28px; text-align: center; font-size: 1.2rem; }
.sample-src-tx { display: flex; flex-direction: column; }
.sample-src-tx small { color: var(--ink-muted); font-size: 0.78rem; }
```

- [ ] **Step 6: Swap the old CaptureResult smoke test to ColorMatches** — in `tests/appSmoke.test.tsx`, change the import `import { CaptureResult } from '../src/components/camera/CaptureResult'` to `import { ColorMatches } from '../src/components/sample/ColorMatches'`, add `import { ColorSampler } from '../src/components/sample/ColorSampler'`, and update the existing capture-result smoke test to:

```tsx
it('color matches grid shows the nearest color and offers all three levels + destinations', () => {
  const html = renderToString(<ColorMatches rgb={hexToRgb('#7e8743')} onMatch={() => {}} onBrowse={() => {}} />)
  expect(html).toContain('Dark Citrine') // closest book color
  expect(html).toContain('Color'); expect(html).toContain('Shade'); expect(html).toContain('Family')
  expect(html).toContain('Match'); expect(html).toContain('Browse')
})
```

- [ ] **Step 7: Delete the superseded camera files**

```bash
git rm src/components/camera/CameraSearch.tsx src/components/camera/CaptureResult.tsx tests/captureResult.test.tsx
```

- [ ] **Step 8: Run the full suite + typecheck + build**

Run: `npx tsc --noEmit && make test && make build`
Expected: PASS — `sample-privacy` green, `appSmoke` (incl. new ColorSampler smoke) green, no dangling imports of the deleted files, build clean.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(sample): unified ColorSampler + SearchBox entry; retire CameraSearch/CaptureResult"
```

---

### Task 6: Docs

**Files:**
- Modify: `README.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, `CLAUDE.md`

- [ ] **Step 1: README** — replace the camera paragraph (the "camera color capture" description) with a "Sample a color" section:

```markdown
### Sample a color

Next to the search box, **Sample a color** opens a small picker with three ways
to feed in a color — all landing on the same result:

- **Camera** (on devices that have one) — point at something and tap the color.
- **Upload a photo** — pick an image and tap/eyedrop a region.
- **Paste a hex** — type `#F26522`, `#236192`, or any 3-/6-digit hex.

You then see the **12 nearest book colors** (with a "very close / close /
roughly" label), pick one, choose Color / Shade / Family, and jump into **Match**
or **Browse**. Uploaded photos and camera frames stay on your device — nothing
is uploaded or saved.
```

- [ ] **Step 2: PROMPTS.md** — append a "Session 9: hex/photo color explorer" entry with the owner's verbatim prompts for this feature (the feature request, the mid-brainstorm clarifications about scope/entry/upload-eyedrop/result-grid/unification, the visual-companion prototype request, and "go go go! do it in subagent mode") and the decisions reached (three sources → one explore grid; camera adopts the grid; parseHex in core; new `sample/` dir for privacy; color-wheel/sliders deferred). Preserve typos verbatim.

- [ ] **Step 3: TODO.md** — the "Hex / photo color explorer" idea line is now built; add the deferred follow-up:

```markdown
- [ ] Color sampler — a color-wheel / RGB-slider source alongside camera /
      upload / hex (deferred from the hex-photo-explorer brainstorm; the hex
      text field covers v1).
```

- [ ] **Step 4: TODO-completed.md** — move the "Hex / photo color explorer" item here with the range of commit hashes from Tasks 1–5.

- [ ] **Step 5: CLAUDE.md** — add one line noting the pure `parseHex` in `src/core/colorMath.ts` and that the color-sampler browser components live in `src/components/sample/` (guarded by `tests/sample-privacy.test.ts`), while camera-only pieces stay in `src/components/camera/`.

- [ ] **Step 6: Verify + commit**

Run: `make test && make build`
Expected: PASS.

```bash
git add README.md PROMPTS.md TODO.md TODO-completed.md CLAUDE.md
git commit -m "docs: hex/photo color explorer (README, PROMPTS, TODO, CLAUDE)"
```

---

## Self-Review

**Spec coverage:** hex input (Task 1 + 4) ✓; image upload + eyedrop (Task 3) ✓; unified source picker + always-visible entry (Task 5) ✓; explore-grid result of 12 with closeness labels replacing the hero (Task 2, wired Task 5) ✓; Match/Browse handoff via `browseFor`/`seedPalette` (Task 5) ✓; camera row gated by `cameraSupported()` (Task 5) ✓; `parseHex` pure in core (Task 1) ✓; `averagePatch`/`nearestColors`/`closenessLabel` reused ✓; privacy guard for the new dir (Task 5) ✓; no new deps ✓; renames `CameraSearch`→`ColorSampler`, `CaptureResult`→`ColorMatches` ✓; docs (Task 6) ✓; color-wheel/sliders deferred (Task 6) ✓.

**Placeholder scan:** every code step carries complete code; test commands have expected outcomes; no "handle errors"/"similar to" placeholders.

**Type consistency:** `onSample: (rgb: RGB) => void` and `onClose: () => void` are used identically by `ColorCapture` (existing), `ImagePicker`, `HexPicker`; `ColorSampler` feeds their RGB into `ColorMatches({ rgb, onMatch, onBrowse, onBack })`; `onMatch`/`onBrowse` are `(level: MatchLevel, key: string) => void` everywhere; `sampleCanvasAt(canvas, clientX, clientY, radius?)` signature matches its callers in `ColorCapture` and `ImagePicker`; `parseHex(input: string): RGB | null` matches its use in `HexPicker`.
