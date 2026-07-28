# Color Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sampler's "Paste a hex" source with a "Pick a color" screen — an HSV wheel plus HEX / RGB / CMYK fields that all stay in sync — feeding the same 12-nearest result grid.

**Architecture:** All the math is pure and lives in `src/core/` (HSV/CMYK conversion and text parsing in `colorMath.ts`, disc geometry in a new `discGeometry.ts`), so it is unit-testable without a DOM — jsdom has no layout, so geometry inside the component would be untestable. Three thin components in `src/components/sample/` compose the screen: `ColorDisc` (wheel + brightness), `ColorFields` (three synced inputs), `ColorPicker` (owns state, emits `RGB`). The disc is CSS gradients, not canvas and not D3.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest (+ jsdom, @testing-library/react). No new dependencies.

## Global Constraints

- **No new dependencies.** CSS gradients + `Math` only. Nothing added to `src/viz/`; no D3.
- **Core purity:** both `src/core/colorMath.ts` and the new `src/core/discGeometry.ts` may import only other `src/core` files and must not touch `window`/`document`/`navigator`/`localStorage`/`fetch`. `tests/core-purity.test.ts` must stay green and unweakened.
- **New components go in `src/components/sample/`**, which `tests/sample-privacy.test.ts` scans — no `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`.
- **Style values only via `src/styles/tokens.css`.** The single exemption is the disc's own gradient (`#f00 #ff0 #0f0 #0ff #00f #f0f` and the white saturation wash) — that is the color space itself, the same category CLAUDE.md already exempts for Sanzo Wada's data colors. It lives in `app.css` with a comment saying so, never inline in a component.
- **HSV is the source of truth.** `ColorPicker` holds one `HSV`; HEX/RGB/CMYK are derived for display. Never store RGB as the picker's state — hue is undefined at zero saturation, so the pin would snap to 0° whenever the user drags *brightness* toward white or black.
- **Brightness slider is the full 0–100, not floored.** The book contains a literal `Black` at V = 0; any floor makes one of the 157 colors unreachable.
- **Explore is always enabled.** Unlike `HexPicker`, there is no invalid screen state to guard — an unparseable draft is per-field and must not disable the button.
- **Seed color is NYC blue `#236192`** so the screen is populated on arrival.
- **Parsers never throw.** `parseRgb`/`parseCmyk` return the tuple or `null`, exactly like the existing `parseHex`.
- **Docs contract (CLAUDE.md):** `README.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, `CHANGELOG.md` updated in the same commits as the behavior they describe.
- **Every task ends green:** `npx tsc --noEmit` and `make test` both pass. `HexPicker` is deleted only in Task 7, so the tree never breaks between tasks.

## File Structure

- `src/core/colorMath.ts` (modify) — add `HSV`/`CMYK` types and `rgbToHsv`, `hsvToRgb`, `rgbToCmyk`, `cmykToRgb`, `parseRgb`, `parseCmyk`.
- `src/core/discGeometry.ts` (create) — pure disc geometry, decoupled from the DOM.
- `src/components/sample/ColorFields.tsx` (create) — the three synced inputs. Knows notations, not the disc.
- `src/components/sample/ColorDisc.tsx` (create) — wheel + brightness slider. Knows geometry, not notations.
- `src/components/sample/ColorPicker.tsx` (create) — owns `HSV`, composes the two, emits `RGB`.
- `src/components/sample/ColorSampler.tsx` (modify) — third tile becomes "Pick a color".
- `src/components/sample/HexPicker.tsx` (delete, Task 7).
- `src/styles/app.css` (modify) — add `.pick-*`; delete `.hex-field` / `.hex-swatch` / `.hex-input`.
- Tests: `tests/discGeometry.test.ts`, `tests/colorFields.test.tsx`, `tests/colorPicker.test.tsx` (create); `tests/colorMath.test.ts`, `tests/appSmoke.test.tsx` (modify); `tests/hexPicker.test.tsx` (delete, Task 7).
- Docs: `README.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, `CHANGELOG.md`.

---

### Task 1: HSV conversion in the core kernel

**Files:**
- Modify: `src/core/colorMath.ts`
- Test: `tests/colorMath.test.ts`

**Interfaces:**
- Consumes: existing `RGB` type from `src/core/colorMath.ts`.
- Produces: `export type HSV = { h: number; s: number; v: number }`; `rgbToHsv(rgb: RGB): HSV` with `h` in `[0,360)` and `s`,`v` in `[0,1]`; `hsvToRgb(hsv: HSV): RGB` with integer channels.

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('colorMath', ...)` block in `tests/colorMath.test.ts`. Add `rgbToHsv, hsvToRgb` to the existing import, and add `import { readFileSync } from 'node:fs'` at the top of the file:

```ts
  it('converts to hsv', () => {
    expect(rgbToHsv([255, 0, 0]).h).toBeCloseTo(0)
    expect(rgbToHsv([255, 0, 0]).s).toBeCloseTo(1)
    expect(rgbToHsv([255, 0, 0]).v).toBeCloseTo(1)
    expect(rgbToHsv([0, 255, 0]).h).toBeCloseTo(120)
    expect(rgbToHsv([0, 0, 255]).h).toBeCloseTo(240)
  })
  it('reports zero saturation for grays and black', () => {
    expect(rgbToHsv([128, 128, 128]).s).toBe(0)
    expect(rgbToHsv([128, 128, 128]).v).toBeCloseTo(128 / 255)
    expect(rgbToHsv([0, 0, 0]).s).toBe(0)
    expect(rgbToHsv([0, 0, 0]).v).toBe(0)
  })
  it('hsvToRgb inverts rgbToHsv', () => {
    expect(hsvToRgb({ h: 0, s: 1, v: 1 })).toEqual([255, 0, 0])
    expect(hsvToRgb({ h: 0, s: 0, v: 0 })).toEqual([0, 0, 0])
    expect(hsvToRgb(rgbToHsv([35, 97, 146]))).toEqual([35, 97, 146])
  })
  it('hsvToRgb wraps hue outside 0-360', () => {
    expect(hsvToRgb({ h: 360, s: 1, v: 1 })).toEqual(hsvToRgb({ h: 0, s: 1, v: 1 }))
    expect(hsvToRgb({ h: -120, s: 1, v: 1 })).toEqual(hsvToRgb({ h: 240, s: 1, v: 1 }))
  })
  it('round-trips every book color through HSV without drift', () => {
    // The picker holds HSV and derives RGB for display on every render, so any
    // drift here would show up as the hex silently changing while the user
    // drags the brightness slider.
    const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')) as {
      colors: { name: string; rgb: [number, number, number] }[]
    }
    const drifted = book.colors.filter(
      (c) => hsvToRgb(rgbToHsv(c.rgb)).some((n, i) => n !== c.rgb[i]),
    )
    expect(drifted.map((c) => c.name)).toEqual([])
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/colorMath.test.ts`
Expected: FAIL — `rgbToHsv is not a function` / no exported member `rgbToHsv`.

- [ ] **Step 3: Implement the conversions**

Append to `src/core/colorMath.ts`:

```ts
export type HSV = { h: number; s: number; v: number }

// Hue-saturation-value. Hue is undefined for grays and reported as 0 — callers
// that need to preserve a user's hue through a gray must hold HSV themselves
// rather than round-tripping through RGB.
export function rgbToHsv([r, g, b]: RGB): HSV {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / d + 2)
    else h = 60 * ((rn - gn) / d + 4)
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hsvToRgb({ h, s, v }: HSV): RGB {
  const c = v * s
  const hp = ((((h % 360) + 360) % 360)) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let base: [number, number, number]
  if (hp < 1) base = [c, x, 0]
  else if (hp < 2) base = [x, c, 0]
  else if (hp < 3) base = [0, c, x]
  else if (hp < 4) base = [0, x, c]
  else if (hp < 5) base = [x, 0, c]
  else base = [c, 0, x]
  const m = v - c
  return base.map((n) => Math.round((n + m) * 255)) as RGB
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/colorMath.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Verify the kernel is still pure and typechecks**

Run: `npx vitest run tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/core/colorMath.ts tests/colorMath.test.ts
git commit -m "feat(core): rgbToHsv / hsvToRgb for the color picker"
```

---

### Task 2: CMYK conversion, pinned to the book's own convention

**Files:**
- Modify: `src/core/colorMath.ts`
- Test: `tests/colorMath.test.ts`

**Interfaces:**
- Consumes: `RGB` from Task 1's module.
- Produces: `export type CMYK = [number, number, number, number]` (integer percentages 0–100); `rgbToCmyk(rgb: RGB): CMYK`; `cmykToRgb(cmyk: CMYK): RGB`.

The regression test below is the point of this task: the dataset's stored CMYK reproduces its stored RGB exactly for 156 of 157 colors, with one malformed source record (`Dull Violet Black`, `M = 106%`). Asserting the outlier *count* means a future ingest change that fixes or adds bad data fails loudly instead of drifting silently.

- [ ] **Step 1: Write the failing tests**

Add `rgbToCmyk, cmykToRgb` to the import in `tests/colorMath.test.ts` (`readFileSync` is already imported from Task 1) and append this new `describe` block at the end of the file:

```ts
describe('cmyk matches the book', () => {
  const book = JSON.parse(readFileSync('data/processed/colors-data.json', 'utf8')) as {
    colors: { name: string; rgb: [number, number, number]; cmyk: [number, number, number, number] }[]
  }

  it('round-trips rgb through cmyk', () => {
    expect(rgbToCmyk([255, 255, 255])).toEqual([0, 0, 0, 0])
    expect(rgbToCmyk([0, 0, 0])).toEqual([0, 0, 0, 100])
    expect(cmykToRgb([0, 0, 0, 100])).toEqual([0, 0, 0])
    expect(cmykToRgb([0, 30, 6, 0])).toEqual([255, 179, 240]) // Hermosa Pink
  })

  it("reproduces every book color's stored RGB from its stored CMYK", () => {
    const off = book.colors.filter(
      (c) => cmykToRgb(c.cmyk).some((n, i) => n !== c.rgb[i]),
    )
    // Exactly one known-malformed source record (M = 106%). If this count
    // changes, the upstream data changed — investigate before touching this test.
    expect(off.map((c) => c.name)).toEqual(['Dull Violet Black'])
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/colorMath.test.ts`
Expected: FAIL — `rgbToCmyk is not a function`.

- [ ] **Step 3: Implement the conversions**

Append to `src/core/colorMath.ts`:

```ts
export type CMYK = [number, number, number, number]

// Plain (uncalibrated) CMYK. This is not an approximation for this dataset —
// it is the exact convention the book's own stored CMYK values use, so a typed
// CMYK lands dead-on a book color. Not color management; see the spec.
export function rgbToCmyk([r, g, b]: RGB): CMYK {
  const k = 1 - Math.max(r, g, b) / 255
  if (k === 1) return [0, 0, 0, 100]
  return [
    (1 - r / 255 - k) / (1 - k),
    (1 - g / 255 - k) / (1 - k),
    (1 - b / 255 - k) / (1 - k),
    k,
  ].map((n) => Math.round(n * 100)) as CMYK
}

export function cmykToRgb([c, m, y, k]: CMYK): RGB {
  const kf = 1 - k / 100
  return [(1 - c / 100) * kf, (1 - m / 100) * kf, (1 - y / 100) * kf]
    .map((n) => Math.round(n * 255)) as RGB
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/colorMath.test.ts`
Expected: PASS — including the 157-color assertion.

- [ ] **Step 5: Verify purity and types**

Run: `npx vitest run tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/colorMath.ts tests/colorMath.test.ts
git commit -m "feat(core): rgbToCmyk / cmykToRgb pinned to the book's stored values"
```

---

### Task 3: RGB and CMYK text parsers

**Files:**
- Modify: `src/core/colorMath.ts`
- Test: `tests/colorMath.test.ts`

**Interfaces:**
- Consumes: `RGB`, `CMYK`.
- Produces: `parseRgb(input: string): RGB | null`; `parseCmyk(input: string): CMYK | null`. Both accept comma, space, or slash separators and an optional `rgb(…)` / `cmyk(…)` wrapper; both reject wrong arity, non-numeric, and out-of-range values; in-range floats round to integers.

- [ ] **Step 1: Write the failing tests**

Add `parseRgb, parseCmyk` to the import in `tests/colorMath.test.ts` and append this new `describe` block:

```ts
describe('color text parsers', () => {
  it('parses rgb in the shapes people paste', () => {
    expect(parseRgb('35, 97, 146')).toEqual([35, 97, 146])
    expect(parseRgb('35 97 146')).toEqual([35, 97, 146])
    expect(parseRgb('  rgb(35,97,146)  ')).toEqual([35, 97, 146])
    expect(parseRgb('35/97/146')).toEqual([35, 97, 146])
    expect(parseRgb('34.6, 97.2, 146')).toEqual([35, 97, 146])
  })
  it('rejects bad rgb', () => {
    expect(parseRgb('')).toBe(null)
    expect(parseRgb('35, 97')).toBe(null)
    expect(parseRgb('35, 97, 146, 2')).toBe(null)
    expect(parseRgb('35, 97, 256')).toBe(null)
    expect(parseRgb('35, -1, 146')).toBe(null)
    expect(parseRgb('red, green, blue')).toBe(null)
  })
  it('parses cmyk', () => {
    expect(parseCmyk('76, 34, 0, 43')).toEqual([76, 34, 0, 43])
    expect(parseCmyk('cmyk(0 30 6 0)')).toEqual([0, 30, 6, 0])
  })
  it('rejects bad cmyk, including the out-of-range value in the source data', () => {
    expect(parseCmyk('76, 34, 0')).toBe(null)
    expect(parseCmyk('95, 106, 38, 50')).toBe(null) // Dull Violet Black's malformed M
    expect(parseCmyk('nope')).toBe(null)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/colorMath.test.ts`
Expected: FAIL — `parseRgb is not a function`.

- [ ] **Step 3: Implement the parsers**

Append to `src/core/colorMath.ts`:

```ts
// Shared shape for parseRgb/parseCmyk: strip an optional `name(...)` wrapper,
// split on commas / whitespace / slashes, then bounds-check. Returns null
// rather than throwing, matching parseHex's contract.
function parseTuple(input: string, arity: number, max: number): number[] | null {
  const body = input.trim().replace(/^[a-z]+\s*\(/i, '').replace(/\)$/, '')
  const parts = body.split(/[\s,/]+/).filter((p) => p.length > 0)
  if (parts.length !== arity) return null
  const values = parts.map(Number)
  if (values.some((n) => !Number.isFinite(n) || n < 0 || n > max)) return null
  return values.map((n) => Math.round(n))
}

export function parseRgb(input: string): RGB | null {
  return parseTuple(input, 3, 255) as RGB | null
}

export function parseCmyk(input: string): CMYK | null {
  return parseTuple(input, 4, 100) as CMYK | null
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/colorMath.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify purity and types**

Run: `npx vitest run tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/core/colorMath.ts tests/colorMath.test.ts
git commit -m "feat(core): parseRgb / parseCmyk with parseHex's null-on-bad contract"
```

---

### Task 4: Disc geometry as pure functions

**Files:**
- Create: `src/core/discGeometry.ts`
- Test: `tests/discGeometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `discPointToHueSat(dx: number, dy: number, radius: number): { h: number; s: number }`; `hueSatToDiscPoint(h: number, s: number, radius: number): { dx: number; dy: number }`. `dx`/`dy` are pixels from the disc's center, y growing downward (screen convention). Hue 0 is straight up, increasing clockwise, matching CSS `conic-gradient(from 0deg, …)`.

- [ ] **Step 1: Write the failing test**

Create `tests/discGeometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { discPointToHueSat, hueSatToDiscPoint } from '../src/core/discGeometry'

describe('discGeometry', () => {
  it('puts hue 0 at 12 o\'clock and increases clockwise', () => {
    expect(discPointToHueSat(0, -100, 100).h).toBeCloseTo(0)
    expect(discPointToHueSat(100, 0, 100).h).toBeCloseTo(90)
    expect(discPointToHueSat(0, 100, 100).h).toBeCloseTo(180)
    expect(discPointToHueSat(-100, 0, 100).h).toBeCloseTo(270)
  })
  it('maps radius to saturation', () => {
    expect(discPointToHueSat(0, 0, 100).s).toBe(0)
    expect(discPointToHueSat(50, 0, 100).s).toBeCloseTo(0.5)
    expect(discPointToHueSat(100, 0, 100).s).toBeCloseTo(1)
  })
  it('clamps past the rim instead of wrapping', () => {
    const far = discPointToHueSat(400, 0, 100)
    expect(far.s).toBe(1)
    expect(far.h).toBeCloseTo(90)
  })
  it('round-trips hue and saturation through a point', () => {
    for (const h of [0, 47, 120, 213, 359]) {
      for (const s of [0.15, 0.5, 1]) {
        const { dx, dy } = hueSatToDiscPoint(h, s, 118)
        const back = discPointToHueSat(dx, dy, 118)
        expect(back.h).toBeCloseTo(h)
        expect(back.s).toBeCloseTo(s)
      }
    }
  })
  it('clamps saturation when placing a point', () => {
    expect(hueSatToDiscPoint(90, 5, 100).dx).toBeCloseTo(100)
    expect(hueSatToDiscPoint(90, -3, 100).dx).toBeCloseTo(0)
  })
  it('degrades safely on a zero-size disc', () => {
    expect(discPointToHueSat(0, 0, 0)).toEqual({ h: 0, s: 0 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/discGeometry.test.ts`
Expected: FAIL — cannot find module `../src/core/discGeometry`.

- [ ] **Step 3: Implement the module**

Create `src/core/discGeometry.ts`:

```ts
// Pure geometry for the color picker's hue/saturation disc. Kept out of the
// component because jsdom has no layout — as plain functions taking an explicit
// radius, this is fully unit-testable.
// Core kernel: no imports outside src/core.

// dx/dy are pixels from the disc center, y growing downward (screen coords).
// Hue 0 is straight up and increases clockwise, matching the CSS
// `conic-gradient(from 0deg, …)` that paints the disc.
export function discPointToHueSat(dx: number, dy: number, radius: number): { h: number; s: number } {
  if (radius <= 0) return { h: 0, s: 0 }
  let h = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  if (h < 0) h += 360
  if (h >= 360) h -= 360
  return { h, s: Math.min(Math.hypot(dx, dy), radius) / radius }
}

export function hueSatToDiscPoint(h: number, s: number, radius: number): { dx: number; dy: number } {
  const angle = ((h - 90) * Math.PI) / 180
  const r = Math.max(0, Math.min(1, s)) * radius
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/discGeometry.test.ts`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Verify purity and types**

Run: `npx vitest run tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS — the new core file is picked up automatically by the purity scan.

- [ ] **Step 6: Commit**

```bash
git add src/core/discGeometry.ts tests/discGeometry.test.ts
git commit -m "feat(core): pure disc geometry for the color picker wheel"
```

---

### Task 5: ColorFields — three notations, one color

**Files:**
- Create: `src/components/sample/ColorFields.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/colorFields.test.tsx`

**Interfaces:**
- Consumes: `HSV`, `RGB`, `hsvToRgb`, `rgbToCmyk`, `parseHex`, `parseRgb`, `parseCmyk` from `src/core/colorMath`.
- Produces: `<ColorFields hsv={HSV} onChange={(rgb: RGB) => void} />`. Inputs are labelled `Hex`, `RGB`, `CMYK` and reachable in tests via `screen.getByLabelText`.

The draft behavior is the substance here: a field renders its own text only while focused, so dragging the disc updates every field live, but typing is never clobbered mid-keystroke.

- [ ] **Step 1: Write the failing test**

Create `tests/colorFields.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorFields } from '../src/components/sample/ColorFields'
import { rgbToHsv } from '../src/core/colorMath'

afterEach(cleanup)

const BLUE = rgbToHsv([35, 97, 146])

describe('ColorFields (jsdom)', () => {
  it('renders all three notations of the same color', () => {
    render(<ColorFields hsv={BLUE} onChange={() => {}} />)
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#236192')
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('35, 97, 146')
    expect((screen.getByLabelText('CMYK') as HTMLInputElement).value).toBe('76, 34, 0, 43')
  })

  it('emits RGB when a hex is typed', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#F26522' } })
    expect(onChange).toHaveBeenCalledWith([242, 101, 34])
  })

  it('emits RGB when a CMYK is typed', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('CMYK'), { target: { value: '0, 30, 6, 0' } })
    expect(onChange).toHaveBeenCalledWith([255, 179, 240])
  })

  it('marks an unparseable draft invalid and emits nothing', () => {
    const onChange = vi.fn()
    render(<ColorFields hsv={BLUE} onChange={onChange} />)
    const hex = screen.getByLabelText('Hex')
    fireEvent.change(hex, { target: { value: '#23' } })
    expect(hex.getAttribute('aria-invalid')).toBe('true')
    expect(onChange).not.toHaveBeenCalled()
    // The draft survives so the user can keep typing.
    expect((hex as HTMLInputElement).value).toBe('#23')
  })

  it('discards an unparseable draft on blur', () => {
    render(<ColorFields hsv={BLUE} onChange={() => {}} />)
    const hex = screen.getByLabelText('Hex')
    fireEvent.change(hex, { target: { value: 'garbage' } })
    fireEvent.blur(hex)
    expect((hex as HTMLInputElement).value).toBe('#236192')
    expect(hex.getAttribute('aria-invalid')).toBe('false')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/colorFields.test.tsx`
Expected: FAIL — cannot find module `../src/components/sample/ColorFields`.

- [ ] **Step 3: Implement the component**

Create `src/components/sample/ColorFields.tsx`:

```tsx
import { useState } from 'react'
import {
  cmykToRgb, hsvToRgb, parseCmyk, parseHex, parseRgb, rgbToCmyk,
  type HSV, type RGB,
} from '../../core/colorMath'

type FieldName = 'hex' | 'rgb' | 'cmyk'

function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

// The three notations of one color, all editable. A field shows its own draft
// only while it is the one being edited; every other field renders from state,
// so dragging the disc updates them live without stomping on typing.
export function ColorFields({ hsv, onChange }: {
  hsv: HSV
  onChange: (rgb: RGB) => void
}) {
  const [editing, setEditing] = useState<FieldName | null>(null)
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)

  const rgb = hsvToRgb(hsv)
  const shown: Record<FieldName, string> = {
    hex: toHex(rgb),
    rgb: rgb.join(', '),
    cmyk: rgbToCmyk(rgb).join(', '),
  }

  function field(name: FieldName, label: string, parse: (t: string) => RGB | null) {
    const invalid = editing === name && bad
    return (
      <div className="pick-field">
        <label className="pick-label" htmlFor={`pick-${name}`}>{label}</label>
        <input id={`pick-${name}`} className="pick-input" spellCheck={false}
          value={editing === name ? draft : shown[name]}
          aria-invalid={invalid}
          onChange={(e) => {
            const text = e.target.value
            setEditing(name)
            setDraft(text)
            const next = parse(text)
            setBad(next === null)
            if (next) onChange(next)
          }}
          onBlur={() => { setEditing(null); setBad(false) }} />
      </div>
    )
  }

  return (
    <div className="pick-fields">
      {field('hex', 'Hex', parseHex)}
      {field('rgb', 'RGB', parseRgb)}
      {field('cmyk', 'CMYK', (t) => {
        const v = parseCmyk(t)
        return v === null ? null : cmykToRgb(v)
      })}
    </div>
  )
}
```

- [ ] **Step 4: Add the field styles**

Append to `src/styles/app.css`:

```css
/* Color picker — value fields */
.pick-fields { display: flex; flex-direction: column; gap: var(--s2); width: 100%; max-width: 236px; }
.pick-field { display: flex; align-items: center; gap: var(--s2); }
.pick-label {
  width: 3.4em; flex: none; font-size: 0.7rem; letter-spacing: var(--tracking-label);
  text-transform: uppercase; color: var(--ink-muted);
}
.pick-input {
  flex: 1; min-width: 0; font-family: var(--font-mono); font-size: 0.9rem; color: var(--ink);
  background: none; border: none; border-bottom: 1px solid var(--ink-faint);
  padding: var(--s1) var(--s2);
}
.pick-input:focus { outline: none; border-bottom-color: var(--link); }
.pick-input[aria-invalid='true'] { border-bottom-color: var(--accent); }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/colorFields.test.tsx && npx tsc --noEmit`
Expected: PASS, all 5 cases; no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/sample/ColorFields.tsx src/styles/app.css tests/colorFields.test.tsx
git commit -m "feat(sample): ColorFields — HEX/RGB/CMYK entry kept in sync"
```

---

### Task 6: ColorDisc — the wheel and brightness

**Files:**
- Create: `src/components/sample/ColorDisc.tsx`
- Modify: `src/styles/app.css`

**Interfaces:**
- Consumes: `discPointToHueSat`, `hueSatToDiscPoint` from `src/core/discGeometry`; `hsvToRgb`, `HSV` from `src/core/colorMath`.
- Produces: `<ColorDisc hsv={HSV} onChange={(hsv: HSV) => void} />`. The brightness input is labelled `Brightness`; the disc itself is labelled `Color wheel`.

No dedicated jsdom test: jsdom reports zeroes from `getBoundingClientRect`, so pointer math cannot be exercised there — that is exactly why Task 4 extracted the geometry, which *is* fully tested. Task 7's tests cover this component's rendered output through `ColorPicker`.

- [ ] **Step 1: Implement the component**

Create `src/components/sample/ColorDisc.tsx`:

```tsx
import { useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { hsvToRgb, type HSV } from '../../core/colorMath'
import { discPointToHueSat, hueSatToDiscPoint } from '../../core/discGeometry'

// Must match the .pick-disc size in app.css — the disc is a fixed square so the
// pin can be placed before the element has been measured.
const RADIUS = 118

const HUE_STEP = 2
const SAT_STEP = 0.02

// Hue/saturation disc plus a brightness slider. Speaks only HSV; it knows
// nothing about hex, RGB or CMYK.
export function ColorDisc({ hsv, onChange }: {
  hsv: HSV
  onChange: (hsv: HSV) => void
}) {
  const disc = useRef<HTMLDivElement>(null)
  const { dx, dy } = hueSatToDiscPoint(hsv.h, hsv.s, RADIUS)
  const [r, g, b] = hsvToRgb(hsv)
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

  function pick(e: PointerEvent<HTMLDivElement>) {
    const box = disc.current?.getBoundingClientRect()
    if (!box) return
    const { h, s } = discPointToHueSat(
      e.clientX - box.left - box.width / 2,
      e.clientY - box.top - box.height / 2,
      box.width / 2,
    )
    onChange({ ...hsv, h, s })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const mult = e.shiftKey ? 5 : 1
    if (e.key === 'ArrowLeft') onChange({ ...hsv, h: (hsv.h - HUE_STEP * mult + 360) % 360 })
    else if (e.key === 'ArrowRight') onChange({ ...hsv, h: (hsv.h + HUE_STEP * mult) % 360 })
    else if (e.key === 'ArrowUp') onChange({ ...hsv, s: Math.min(1, hsv.s + SAT_STEP * mult) })
    else if (e.key === 'ArrowDown') onChange({ ...hsv, s: Math.max(0, hsv.s - SAT_STEP * mult) })
    else return
    e.preventDefault()
  }

  return (
    <div className="pick-wrap">
      <div ref={disc} className="pick-disc" tabIndex={0} role="group"
        aria-label="Color wheel — arrow keys adjust hue and saturation"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e) }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) pick(e) }}
        onKeyDown={onKeyDown}>
        {/* brightness is exactly multiplicative on RGB, which is what V means —
            so the disc IS the color space, not a picture of it */}
        <div className="pick-face" style={{ filter: `brightness(${hsv.v})` }} />
        <div className="pick-pin" style={{
          left: `calc(50% + ${dx}px)`, top: `calc(50% + ${dy}px)`, background: hex,
        }} />
      </div>
      <label className="pick-bright">
        <span className="pick-label">Bright</span>
        <input type="range" min={0} max={100} value={Math.round(hsv.v * 100)}
          aria-label="Brightness"
          onChange={(e) => onChange({ ...hsv, v: Number(e.target.value) / 100 })} />
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Add the disc styles**

Append to `src/styles/app.css`:

```css
/* Color picker — the HSV disc.
   The hue stops and the white saturation wash below are the COLOR SPACE, not
   design tokens — the same exemption CLAUDE.md grants Sanzo Wada's data colors.
   Every other value here comes from tokens.css.
   The 236px size must stay in sync with RADIUS in ColorDisc.tsx. */
.pick-wrap { display: flex; flex-direction: column; align-items: center; gap: var(--s3); }
.pick-disc {
  position: relative; width: 236px; height: 236px; border-radius: 50%;
  touch-action: none; cursor: crosshair;
}
.pick-disc:focus-visible { outline: 2px solid var(--link); outline-offset: 3px; }
.pick-face {
  position: absolute; inset: 0; border-radius: 50%;
  background:
    radial-gradient(circle closest-side, #fff 0%, rgba(255, 255, 255, 0) 78%),
    conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
  box-shadow: inset 0 0 0 1px var(--hairline);
}
.pick-pin {
  position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%;
  border: 2px solid var(--paper-hi); box-shadow: 0 0 0 1.5px var(--ink);
  pointer-events: none;
}
.pick-bright { display: flex; align-items: center; gap: var(--s2); width: 236px; }
.pick-bright input { flex: 1; min-width: 0; accent-color: var(--link); }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 4: Confirm the existing suite is still green**

Run: `make test`
Expected: PASS — nothing imports `ColorDisc` yet, so this is a no-regression check.

- [ ] **Step 5: Commit**

```bash
git add src/components/sample/ColorDisc.tsx src/styles/app.css
git commit -m "feat(sample): ColorDisc — HSV wheel with brightness and keyboard control"
```

---

### Task 7: ColorPicker, wired in — and HexPicker retired

**Files:**
- Create: `src/components/sample/ColorPicker.tsx`
- Modify: `src/components/sample/ColorSampler.tsx`
- Modify: `src/styles/app.css`
- Modify: `tests/appSmoke.test.tsx:94-99`
- Delete: `src/components/sample/HexPicker.tsx`, `tests/hexPicker.test.tsx`
- Test: `tests/colorPicker.test.tsx`

**Interfaces:**
- Consumes: `<ColorDisc>` and `<ColorFields>` from Tasks 5–6; `rgbToHsv`, `hsvToRgb` from core.
- Produces: `<ColorPicker onSample={(rgb: RGB) => void} onClose={() => void} />` — the same prop shape `HexPicker` had, so `ColorSampler`'s call site changes only in name.

- [ ] **Step 1: Write the failing test**

Create `tests/colorPicker.test.tsx`:

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ColorPicker } from '../src/components/sample/ColorPicker'

afterEach(cleanup)

describe('ColorPicker (jsdom)', () => {
  it('opens seeded on NYC blue across all three notations', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#236192')
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('35, 97, 146')
  })

  it('propagates a typed hex to the other notations', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#F26522' } })
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('242, 101, 34')
    expect((screen.getByLabelText('CMYK') as HTMLInputElement).value).toBe('0, 58, 86, 5')
  })

  it('propagates a typed CMYK to the hex field', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('CMYK'), { target: { value: '0, 30, 6, 0' } })
    expect((screen.getByLabelText('Hex') as HTMLInputElement).value).toBe('#ffb3f0')
  })

  it('drives the color from the brightness slider', () => {
    render(<ColorPicker onSample={() => {}} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Brightness'), { target: { value: '100' } })
    expect((screen.getByLabelText('RGB') as HTMLInputElement).value).toBe('61, 169, 255')
  })

  it('explores the current color', () => {
    const onSample = vi.fn()
    render(<ColorPicker onSample={onSample} onClose={() => {}} />)
    fireEvent.click(screen.getByText('Explore this color'))
    expect(onSample).toHaveBeenCalledWith([35, 97, 146])
  })

  it('keeps Explore enabled while a field holds an unparseable draft', () => {
    const onSample = vi.fn()
    render(<ColorPicker onSample={onSample} onClose={() => {}} />)
    fireEvent.change(screen.getByLabelText('Hex'), { target: { value: '#2' } })
    const explore = screen.getByText('Explore this color') as HTMLButtonElement
    expect(explore.disabled).toBe(false)
    fireEvent.click(explore)
    expect(onSample).toHaveBeenCalledWith([35, 97, 146])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/colorPicker.test.tsx`
Expected: FAIL — cannot find module `../src/components/sample/ColorPicker`.

- [ ] **Step 3: Implement the screen**

Create `src/components/sample/ColorPicker.tsx`:

```tsx
import { useState } from 'react'
import { hsvToRgb, rgbToHsv, type HSV, type RGB } from '../../core/colorMath'
import { ColorDisc } from './ColorDisc'
import { ColorFields } from './ColorFields'

// Opens on the owner's NYC blue so the wheel, slider and all three fields are
// populated on arrival — the control explains itself before it is touched.
const SEED: HSV = rgbToHsv([35, 97, 146])

// Pick a color by wheel or by notation. HSV is the source of truth: storing RGB
// would lose the hue at zero saturation and make the pin jump to 0° whenever the
// user drags brightness toward white or black.
export function ColorPicker({ onSample, onClose }: {
  onSample: (rgb: RGB) => void
  onClose: () => void
}) {
  const [hsv, setHsv] = useState<HSV>(SEED)
  const rgb = hsvToRgb(hsv)
  const hex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('')

  return (
    <div className="cam-overlay" role="dialog" aria-label="Pick a color">
      <button className="cam-close" onClick={onClose} aria-label="Back">×</button>
      <p className="cam-steps">
        <b>Pick a color</b> — turn the wheel, or type a hex, RGB, or CMYK value.
      </p>
      <ColorDisc hsv={hsv} onChange={setHsv} />
      <ColorFields hsv={hsv} onChange={(next) => setHsv(rgbToHsv(next))} />
      <div className="cam-controls">
        <span className="pick-swatch" style={{ background: hex }} aria-hidden="true" />
        {/* Always enabled: HSV is valid by construction, so there is no invalid
            screen state. A bad draft in one field is that field's business. */}
        <button className="cam-btn primary" onClick={() => onSample(rgb)}>
          Explore this color
        </button>
      </div>
    </div>
  )
}
```

Then append the swatch style to `src/styles/app.css`:

```css
.pick-swatch {
  width: 34px; height: 34px; flex: none; border-radius: var(--radius);
  border: 1px solid var(--hairline);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/colorPicker.test.tsx`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Swap the tile in ColorSampler**

In `src/components/sample/ColorSampler.tsx`: replace the `HexPicker` import with `import { ColorPicker } from './ColorPicker'`, change the `Source` union's `'hex'` member to `'pick'`, and replace the two `'hex'` usages:

```tsx
type Source = 'camera' | 'upload' | 'pick'
```

```tsx
  if (source === 'pick') return <ColorPicker onSample={setRgb} onClose={() => setSource(null)} />
```

```tsx
        <button type="button" className="sample-src" onClick={() => setSource('pick')}>
          <span className="sample-src-ic" aria-hidden="true">🎨</span>
          <span className="sample-src-tx"><b>Pick a color</b><small>Wheel, or a hex / RGB / CMYK value</small></span>
        </button>
```

- [ ] **Step 6: Update the smoke test**

In `tests/appSmoke.test.tsx`, replace the assertion at line 98 and the test name on line 94:

```tsx
  it('color sampler offers camera-agnostic sources (upload + picker) and renders', () => {
    const html = renderToString(<ColorSampler dispatch={() => {}} onClose={() => {}} />)
    expect(html).toContain('Sample a color')
    expect(html).toContain('Upload a photo')
    expect(html).toContain('Pick a color')
  })
```

- [ ] **Step 7: Delete the retired hex picker and its dead CSS**

```bash
git rm src/components/sample/HexPicker.tsx tests/hexPicker.test.tsx
```

Then delete the now-unused `.hex-field`, `.hex-swatch`, `.hex-input`, and `.hex-input:focus` rules from `src/styles/app.css` (the block starting with the `/* Hex picker field + swatch */` comment, around lines 438–446), including that comment.

- [ ] **Step 8: Verify nothing still references the removed names**

Run: `grep -rn "HexPicker\|hex-field\|hex-swatch\|hex-input\|Paste a hex" src tests`
Expected: no output.

- [ ] **Step 9: Run the full suite and build**

Run: `make test && make build`
Expected: PASS — all tests green, typecheck clean, build succeeds.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(sample): ColorPicker replaces the hex-only picker

The 'Paste a hex' tile becomes 'Pick a color': an HSV wheel with a
brightness slider and HEX/RGB/CMYK fields that all stay in sync. Emits
one RGB into the existing 12-nearest grid, so nothing downstream moves."
```

---

### Task 8: Documentation and release

**Files:**
- Modify: `README.md:72`
- Modify: `PROMPTS.md` (append)
- Modify: `TODO.md:135`, `TODO.md:152-154`
- Modify: `TODO-completed.md` (append)
- Modify: `CHANGELOG.md` (prepend entry)
- Modify: `package.json` (version bump)

Per CLAUDE.md, wrong documentation is worse than none, and `PROMPTS.md` is append-only with the owner's prompts quoted verbatim.

- [ ] **Step 1: Update the README's source list**

In `README.md`, replace line 72:

```markdown
- **Pick a color** — turn a color wheel, or type a hex, RGB, or CMYK value.
```

- [ ] **Step 2: Append the session to PROMPTS.md**

Add a new `## Session 11 — color picker (wheel + HEX/RGB/CMYK)` section at the end, with these owner prompts quoted verbatim and in order:

1. `i like that ability to pick hex. but now i like the idea you gave before about using the color wheel selector where users can find a color, provide a hex, RGB, or CYMK color. this all makes it easier to use for the end user to explore a color`
2. `what other questions do you ahve?`
3. `yes mock up`
4. `i like A - no overlay`
5. `fwiw i did like seeing the colors pointed on the circle. i liked how you can plot all the points and then also points in same brightness. that would be a cool thing to add to the color explorer page when you're looking at all the raw individual colors`
6. `ok this looks fine. let' sjust go for it!`
7. `lets goooo!!!!!`

Then this **Decisions reached** list:

```markdown
**Decisions reached:**

- The wheel **absorbs** the hex source rather than becoming a fourth tile —
  "Paste a hex" becomes "Pick a color", so the menu stays at three sources and
  there's one place to name a color you already have.
- **HSV disc** (hue around, saturation outward) plus a brightness slider, over
  an HSL disc or a hue-ring-and-square. Familiar from every design tool, and
  the whole gamut is two gestures away.
- **All three notations visible and editable**, over a single field with a
  HEX/RGB/CMYK toggle — it matches the stack already on every color's detail
  page, and watching all three move together quietly shows how they relate.
- **The book-color overlay was chosen, then rejected.** Picked in the abstract;
  built as a live mockup against the real 157 colors; rejected on sight, because
  on a control for aiming at a color the dots compete with the target. The plot
  moves to the Browse page as its own feature (see TODO.md).
- **CMYK here is exact, not approximate.** The plain formula reproduces the
  book's stored RGB from its stored CMYK for 156/157 colors, so it is the
  dataset's own convention — no soft-proofing caveat needed. (True CMYK
  soft-proofing stays ruled out for the print accessibility lens; that is a
  different problem.)
- **Brightness runs the full 0–100, not floored** — the book contains a literal
  Black at V=0, and any floor would make one of the 157 colors unreachable.
- Zero new dependencies: CSS gradients plus pure math, no D3, nothing in
  `src/viz/`.
```

- [ ] **Step 3: Update TODO.md**

Remove the three-line color-wheel item at lines 152–154. Re-point the overlay-a11y item at line 135 from `HexPicker` to `ColorPicker`. Add two new items:

```markdown
- [ ] Browse page — plot all 157 colors on a hue/saturation disc with a
      brightness slider that slices to the colors at that lightness (owner:
      "i liked how you can plot all the points and then also points in same
      brightness"). Deferred from the color-picker session as its own feature;
      open questions: does clicking a dot filter Browse, how does it interact
      with the accessibility goggles, what does it do on a phone. Starting
      point: discs B and D in
      `docs/superpowers/specs/2026-07-27-color-picker-disc-mockup.html`.
- [ ] Color picker — do NOT add the book-color overlay to the picker disc. It
      was mocked up live against all 157 colors and rejected: on a control whose
      job is aiming at a color, the dots compete with the target. The plot
      belongs on Browse (above), not here.
```

- [ ] **Step 4: Move the completed item**

Get the code commit range: `git log --oneline` — the first commit is Task 1's `feat(core): rgbToHsv…`, the last is Task 7's `feat(sample): ColorPicker…`. Append to `TODO-completed.md`, substituting the real short hashes for `AAAAAAA`/`BBBBBBB`:

```markdown
- [x] Color sampler — a color-wheel / RGB-slider source alongside camera /
      upload / hex. Shipped as "Pick a color": an HSV wheel with a brightness
      slider plus synced HEX/RGB/CMYK fields, replacing the hex-only picker.
      Pure math in `src/core/colorMath.ts` (`rgbToHsv`/`hsvToRgb`,
      `rgbToCmyk`/`cmykToRgb`, `parseRgb`/`parseCmyk`) and a new pure
      `src/core/discGeometry.ts` so the wheel's geometry is unit-testable
      without a DOM. The book-color overlay was mocked up and rejected — see
      TODO.md. Code: AAAAAAA..BBBBBBB (2026-07-28)
```

- [ ] **Step 5: Bump the version and write the CHANGELOG entry**

Set `"version": "1.4.0"` in `package.json` (new user-facing feature, so a minor bump — 1.3.3 was the analytics patch).

Prepend this entry to `CHANGELOG.md`, directly after the `---` that follows the "Why this file reads the way it does" section and before `## [1.3.3]`. Adjust the date if the release lands on a different day:

```markdown
## [1.4.0] — 2026-07-28 — Pick a color, in whatever language you have it

> **Owner asked for:** "i like that ability to pick hex. but now i like the
> idea you gave before about using the color wheel selector where users can
> find a color, provide a hex, RGB, or CYMK color. this all makes it easier to
> use for the end user to explore a color"

- **"Paste a hex" became "Pick a color".** The sampler's third source is now a
  color wheel with a brightness slider, alongside **HEX, RGB and CMYK** fields
  that all stay in sync — turn the wheel and all three update; type into any
  one and the wheel follows. Pasting a hex still works exactly as it did; it is
  simply no longer the only way in. Everything downstream is untouched: you
  still land on the 12 nearest book colors and jump into Match or Browse.
- **The CMYK numbers are exact, not approximate.** Converting the book's own
  stored CMYK back to color reproduces its RGB on every channel for 156 of the
  157 colors (the odd one out, *Dull Violet Black*, has a malformed value in
  the source data). So typing a CMYK build from the book lands dead-on that
  color rather than merely near it — and a test now pins that, so the day the
  upstream data changes, we hear about it.
- **A design the owner reversed after seeing it running.** The first plan was
  to plot all 157 book colors as dots on the wheel. It sounded good described
  in words and was chosen that way. Built as a live mockup against the real
  colors, it was wrong — on a control whose whole job is aiming at a color, the
  dots compete with the target:

  > "i like A - no overlay"

  The plot itself was worth keeping, just not there:

  > "fwiw i did like seeing the colors pointed on the circle. i liked how you
  > can plot all the points and then also points in same brightness. that would
  > be a cool thing to add to the color explorer page when you're looking at
  > all the raw individual colors"

  So it moves to the Browse page as its own feature, and all four mockup
  variants are kept in `docs/superpowers/specs/` as that work's starting point.
  This is the part worth noticing: the round trip from "sounds right" to
  "actually wrong" took one mockup and one look, and it happened *before* any
  of it was built.
```

- [ ] **Step 6: Verify the docs are true**

Run: `make help && make test && make build`
Expected: every documented target works; tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs(release): v1.4.0 — pick a color by wheel, hex, RGB, or CMYK"
```

---

## Verification

Before calling this done:

```bash
make test && make build
```

Both must pass. Then check by hand in `make dev`, since no automated test covers the pointer path:

1. Open **Sample a color → Pick a color**. It should arrive on NYC blue with all three fields filled.
2. Drag on the wheel — all three fields update live, and the pin follows the cursor without lag.
3. Drag brightness to 0 and back up. **The pin must not jump.** If it snaps to the top of the disc, HSV is not the source of truth and something regressed to storing RGB.
4. Type `0, 30, 6, 0` into CMYK — the hex must read exactly `#ffb3f0` (Hermosa Pink), landing dead-on a book color.
5. Delete characters mid-hex — the field underlines in orange, the disc holds still, and **Explore stays clickable**.
6. On a phone or with touch emulation, drag the wheel — the page must not scroll underneath.
7. Tab to the disc and press arrow keys — hue and saturation move.
