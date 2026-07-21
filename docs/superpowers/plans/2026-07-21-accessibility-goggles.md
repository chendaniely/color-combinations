# Accessibility Goggles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a composable multi-select "accessibility goggles" filter over the loaded color combinations — Web text-ready, Print & B&W safe, Color-blind safe — AND-stacked, shared across the Wheel, Browse, and Match views.

**Architecture:** The goggles are a filter, not a dataset swap. A new `src/color/accessibility.ts` (culori-based, never in core) computes once, from the loaded dataset, which lenses each combination passes; a pure `allowed?: ReadonlySet<number>` parameter threaded through the core combination-enumeration functions applies the filter; a reusable `<AccessibilityGoggles>` control drives it from `AppState.access`.

**Tech Stack:** TypeScript, React 19, D3, culori (already a dependency; used only in `src/color/`), Vitest.

## Global Constraints

- `src/core/` is a pure kernel: only relative imports of other core files; no React/D3/culori/browser globals. `tests/core-purity.test.ts` must stay green and MUST NOT be weakened.
- culori is used ONLY in `src/color/`. The one culori type shim is `src/color/culori.d.ts`.
- **Zero new dependencies.** Using more culori functions is not a new dependency; declare them in `culori.d.ts`.
- Every style value comes from `src/styles/tokens.css` variables. No hard-coded colors in components except Sanzo Wada data swatches. (`rgba(...)` alpha shadows matching the existing box-shadow precedent are acceptable.)
- Lens ids are exactly `'web-text' | 'print-bw' | 'colorblind'`. Labels are exactly "Web text-ready", "Print & B&W safe", "Color-blind safe". The control is labeled "Accessibility".
- Thresholds (exact): `WCAG_AA_TEXT = 4.5`, `WCAG_NONTEXT = 3`, `CVD_THRESHOLD = 0.10`.
- Composition is **AND** (a combo must pass every active lens). Empty selection = no filter.
- Reference survivor counts over the current data (338 displayable combos): `web-text` = **150**, `print-bw` = **57**, `colorblind` = **225**, all-three AND = **36**.
- Docs contract (CLAUDE.md): any change affecting setup/commands/structure/behavior updates the affected docs in the SAME commit (README, Makefile, PROMPTS append-only verbatim, TODO, TODO-completed with commit hashes, spec).
- Per task: `npx tsc --noEmit` and `make test` must pass before the task is complete.

## File Structure

- Create `src/color/accessibility.ts` — the accessibility seam: lens predicates, `LENSES` registry, `accessibilityProfile`, `allowedComboIds`, thresholds. (Task 2)
- Modify `src/color/culori.d.ts` — declare `wcagContrast`, `filterDeficiencyProt`, `filterDeficiencyDeuter`. (Task 2)
- Modify `src/core/types.ts` — add the `AccessLensId` union. (Task 1)
- Modify `src/core/state.ts` — `AppState.access`, `toggleAccess` action + reducer. (Task 1)
- Modify `src/core/chord.ts` — thread `allowed?` through `filteredCombos`, `chordMatrix`, `combosForPair`. (Task 3)
- Modify `src/core/matching.ts` — thread `allowed?` through `filtered`, `combosForSet`, `suggestPartners`. (Task 3)
- Modify `src/data.ts` — export memoized `accessProfile` and `allowedFor(access)`. (Task 4)
- Create `src/components/AccessibilityGoggles.tsx` — reusable multi-select dropdown. (Task 4)
- Modify `src/components/ChordWheel.tsx`, `RibbonDetail.tsx`, `App.tsx`, `WheelControls.tsx`, `BrowseView.tsx`, `MatchPage.tsx` — wire `allowed`, mount the control, empty-state notes. (Task 5)
- Modify `src/styles/app.css` — goggles + wheel-empty styles (tokens only). (Task 5)
- Modify docs: `CLAUDE.md` (Task 2), `README.md` (Task 5), `PROMPTS.md` / `TODO.md` / `TODO-completed.md` (Task 6).
- Tests: create `tests/accessibility.test.ts` (Task 2), `tests/accessibilityGoggles.test.tsx` (Task 4); extend `tests/state.test.ts` (Task 1), `tests/chord.test.ts` + `tests/matching.test.ts` (Task 3), `tests/appSmoke.test.tsx` (Task 5).

---

### Task 1: Core lens-id type + state (`access` + `toggleAccess`)

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/core/state.ts`
- Test: `tests/state.test.ts`

**Interfaces:**
- Consumes: existing `AppState`, `Action`, `reducer`, `initialState`.
- Produces: `AccessLensId = 'web-text' | 'print-bw' | 'colorblind'` (in `src/core/types.ts`); `AppState.access: AccessLensId[]` (default `[]`); action `{ type: 'toggleAccess'; id: AccessLensId }`.

- [ ] **Step 1: Write the failing tests**

In `tests/state.test.ts`, update the exact-shape assertion in the first test to include `access: []`, and add new tests. Replace the first test body and append the new `describe` block:

```ts
  it('starts on the wheel at color granularity with all sizes on', () => {
    expect(initialState).toEqual({
      view: 'wheel', granularity: 0, sizes: [2, 3, 4], selection: null, aboutOpen: false,
      palette: { level: 1, keys: [] },
      browse: { family: '', shade: '', colorId: '' },
      access: [],
    })
  })
```

Add at the end of the top-level `describe('app state reducer', ...)`:

```ts
  it('toggleAccess adds and removes lenses; empty is allowed', () => {
    let s = reducer(initialState, { type: 'toggleAccess', id: 'web-text' })
    expect(s.access).toEqual(['web-text'])
    s = reducer(s, { type: 'toggleAccess', id: 'colorblind' })
    expect(s.access).toEqual(['web-text', 'colorblind'])
    s = reducer(s, { type: 'toggleAccess', id: 'web-text' })
    expect(s.access).toEqual(['colorblind'])
    s = reducer(s, { type: 'toggleAccess', id: 'colorblind' })
    expect(s.access).toEqual([]) // unlike sizes, empty IS allowed (= no filter)
    expect(JSON.parse(JSON.stringify(s))).toEqual(s) // stays serializable
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL — `initialState` lacks `access`; `toggleAccess` not handled (TypeScript error on the action literal / runtime mismatch).

- [ ] **Step 3: Implement**

In `src/core/types.ts`, add after `export type SizeBucket = ...`:

```ts
export type AccessLensId = 'web-text' | 'print-bw' | 'colorblind'
```

In `src/core/state.ts`:

Add `AccessLensId` to the type import:

```ts
import type { AccessLensId, GranularityLevel, SizeBucket } from './types'
```

Add the field to `AppState` (after `browse`):

```ts
  browse: { family: string; shade: string; colorId: string }
  access: AccessLensId[]
```

Add the action to the `Action` union (after `setBrowseFilter`):

```ts
  | { type: 'toggleAccess'; id: AccessLensId }
```

Add the field to `initialState` (after `browse`):

```ts
  browse: { family: '', shade: '', colorId: '' },
  access: [],
```

Add the reducer case (after the `setBrowseFilter` case, before the closing `}`):

```ts
    case 'toggleAccess': {
      const has = state.access.includes(action.id)
      const access = has
        ? state.access.filter((a) => a !== action.id)
        : [...state.access, action.id]
      return { ...state, access }
    }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/state.test.ts && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/core/state.ts tests/state.test.ts
git commit -m "feat(state): add access lens filter to app state

AccessLensId union + AppState.access (default []) + toggleAccess reducer.
Empty is a valid state (= no accessibility filter), unlike sizes.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `src/color/accessibility.ts` — lenses, profile, allowed ids

**Files:**
- Create: `src/color/accessibility.ts`
- Modify: `src/color/culori.d.ts`
- Modify: `CLAUDE.md`
- Test: `tests/accessibility.test.ts`

**Interfaces:**
- Consumes: `AccessLensId` (from `src/core/types`); `Indexed`, `displayableCombinations` (from `src/core/dataset`); culori.
- Produces:
  - `WCAG_AA_TEXT = 4.5`, `WCAG_NONTEXT = 3`, `CVD_THRESHOLD = 0.10`
  - `interface Lens { id: AccessLensId; label: string; description: string; passes: (hexes: string[]) => boolean }`
  - `LENSES: Lens[]` (display order: web-text, print-bw, colorblind)
  - `accessibilityProfile(ix: Indexed): Map<number, Set<AccessLensId>>` (keys = displayable combo ids)
  - `allowedComboIds(profile: Map<number, Set<AccessLensId>>, active: AccessLensId[]): Set<number>` (AND; callers pass non-empty `active`)

- [ ] **Step 1: Write the failing test**

Create `tests/accessibility.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  LENSES, accessibilityProfile, allowedComboIds,
  WCAG_AA_TEXT, WCAG_NONTEXT, CVD_THRESHOLD,
} from '../src/color/accessibility'
import type { AccessLensId } from '../src/core/types'
import { dataset } from '../src/data'

const passes = (id: AccessLensId, hexes: string[]) =>
  LENSES.find((l) => l.id === id)!.passes(hexes)

describe('accessibility lens predicates', () => {
  it('exposes the exact thresholds', () => {
    expect([WCAG_AA_TEXT, WCAG_NONTEXT, CVD_THRESHOLD]).toEqual([4.5, 3, 0.10])
  })
  it('web-text: passes when a pair reaches AA text contrast', () => {
    expect(passes('web-text', ['#000000', '#ffffff'])).toBe(true)   // 21:1
    expect(passes('web-text', ['#777777', '#808080'])).toBe(false)  // ~1.13:1
    expect(passes('web-text', ['#000000', '#ffffff', '#fefefe'])).toBe(true) // one strong pair is enough
  })
  it('print-bw: needs EVERY pair >= 3:1 (a near-white pair fails)', () => {
    expect(passes('print-bw', ['#000000', '#ffffff'])).toBe(true)
    expect(passes('print-bw', ['#000000', '#ffffff', '#fefefe'])).toBe(false) // #fff vs #fefefe ~1.01:1
  })
  it('colorblind: red/dark-green collapses under simulation; black/white stays distinct', () => {
    expect(passes('colorblind', ['#ff0000', '#008000'])).toBe(false) // deuter distance ~0.054 < 0.10
    expect(passes('colorblind', ['#000000', '#ffffff'])).toBe(true)  // luminance differs → ~1.0
  })
})

describe('accessibilityProfile + allowedComboIds over the real book', () => {
  const profile = accessibilityProfile(dataset)
  const count = (id: AccessLensId) => [...profile.values()].filter((s) => s.has(id)).length

  it('profiles every displayable combo with the expected survivor counts', () => {
    expect(profile.size).toBe(338)
    expect(count('web-text')).toBe(150)
    expect(count('print-bw')).toBe(57)
    expect(count('colorblind')).toBe(225)
  })
  it('allowedComboIds AND-stacks: all three is 36 and a subset of each single lens', () => {
    const all3 = allowedComboIds(profile, ['web-text', 'print-bw', 'colorblind'])
    expect(all3.size).toBe(36)
    const web = allowedComboIds(profile, ['web-text'])
    expect(web.size).toBe(150)
    expect([...all3].every((id) => web.has(id))).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/accessibility.test.ts`
Expected: FAIL — `src/color/accessibility.ts` does not exist.

- [ ] **Step 3: Implement**

First extend `src/color/culori.d.ts` to declare the functions used (keep the existing `CuloriColor` and `differenceEuclidean`; add the three new declarations before the closing `}`):

```ts
declare module 'culori' {
  export interface CuloriColor {
    mode: string
    r?: number; g?: number; b?: number; alpha?: number
    [channel: string]: number | string | undefined
  }
  export function differenceEuclidean(mode?: string): (a: CuloriColor, b: CuloriColor) => number
  export function wcagContrast(a: string | CuloriColor, b: string | CuloriColor): number
  export function filterDeficiencyProt(severity?: number): (color: string | CuloriColor) => CuloriColor
  export function filterDeficiencyDeuter(severity?: number): (color: string | CuloriColor) => CuloriColor
}
```

Create `src/color/accessibility.ts`:

```ts
// The accessibility SEAM — the ONLY place that decides whether a combination
// passes each accessibility "lens". Uses culori: wcagContrast for luminance
// contrast (Web text-ready / Print & B&W safe) and OKLab distance under CVD
// simulation for Color-blind safe. Lives in src/color (not the pure core
// kernel) because it imports culori. The three thresholds below are the tuning
// knobs — change them here and nothing downstream changes.
import {
  differenceEuclidean,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  wcagContrast,
} from 'culori'
import { displayableCombinations, type Indexed } from '../core/dataset'
import type { AccessLensId } from '../core/types'

export const WCAG_AA_TEXT = 4.5   // AA normal-text contrast ratio
export const WCAG_NONTEXT = 3     // non-text / graphical contrast ratio
export const CVD_THRESHOLD = 0.10 // min OKLab distance under CVD simulation

const oklab = differenceEuclidean('oklab')
const simProt = filterDeficiencyProt(1)
const simDeuter = filterDeficiencyDeuter(1)

function pairs(hexes: string[]): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) out.push([hexes[i], hexes[j]])
  }
  return out
}

// At least one pair reads as text-on-background (max pairwise contrast).
function webTextReady(hexes: string[]): boolean {
  return pairs(hexes).some(([a, b]) => wcagContrast(a, b) >= WCAG_AA_TEXT)
}

// Every pair stays apart in grayscale = survives a B&W photocopy (min pair).
function printBwSafe(hexes: string[]): boolean {
  return pairs(hexes).every(([a, b]) => wcagContrast(a, b) >= WCAG_NONTEXT)
}

// Every pair stays perceptually apart under protanopia AND deuteranopia.
function colorBlindSafe(hexes: string[]): boolean {
  return pairs(hexes).every(([a, b]) =>
    oklab(simProt(a), simProt(b)) >= CVD_THRESHOLD &&
    oklab(simDeuter(a), simDeuter(b)) >= CVD_THRESHOLD)
}

export interface Lens {
  id: AccessLensId
  label: string
  description: string
  passes: (hexes: string[]) => boolean
}

export const LENSES: Lens[] = [
  {
    id: 'web-text', label: 'Web text-ready',
    description: 'At least one pair works as readable text on a background (WCAG AA, 4.5:1).',
    passes: webTextReady,
  },
  {
    id: 'print-bw', label: 'Print & B&W safe',
    description: 'Every color stays tellable apart in grayscale or a photocopy (3:1).',
    passes: printBwSafe,
  },
  {
    id: 'colorblind', label: 'Color-blind safe',
    description: 'Colors stay distinct for red-green color blindness.',
    passes: colorBlindSafe,
  },
]

// Which lenses each displayable combination passes — computed ONCE from the
// loaded dataset (see src/data.ts). Downstream filtering is O(1) lookups.
export function accessibilityProfile(ix: Indexed): Map<number, Set<AccessLensId>> {
  const profile = new Map<number, Set<AccessLensId>>()
  for (const combo of displayableCombinations(ix)) {
    const hexes = combo.colorIds.map((id) => ix.colorById.get(id)!.hex)
    const passed = new Set<AccessLensId>()
    for (const lens of LENSES) if (lens.passes(hexes)) passed.add(lens.id)
    profile.set(combo.id, passed)
  }
  return profile
}

// AND semantics: the combo ids passing EVERY active lens. Callers pass a
// NON-empty `active`; an empty selection means "no filter" and is handled by
// the caller (see allowedFor in src/data.ts) — do not call this with []].
export function allowedComboIds(
  profile: Map<number, Set<AccessLensId>>,
  active: AccessLensId[],
): Set<number> {
  const out = new Set<number>()
  for (const [comboId, passed] of profile) {
    if (active.every((id) => passed.has(id))) out.add(comboId)
  }
  return out
}
```

Then update `CLAUDE.md` in the "Dependency budget" section: change the sentence "culori ships no types, so `src/color/culori.d.ts` declares the one function we use." to reflect several functions, and note the new seam. Replace that sentence with:

```
culori ships no types, so `src/color/culori.d.ts` declares the culori
functions we use (`differenceEuclidean`, `wcagContrast`,
`filterDeficiencyProt`, `filterDeficiencyDeuter`). The accessibility "goggles"
seam (`src/color/accessibility.ts`) computes, per combination, which
accessibility lenses it passes; like `colorDistance` it lives in `src/color/`
so the core kernel stays dependency-free. **No new dependency was added.**
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/accessibility.test.ts tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS (including core-purity — culori stays confined to `src/color/`).

- [ ] **Step 5: Commit**

```bash
git add src/color/accessibility.ts src/color/culori.d.ts tests/accessibility.test.ts CLAUDE.md
git commit -m "feat(color): accessibility lens seam (web-text / print-bw / colorblind)

Per-combination accessibility profile via culori (wcagContrast + CVD
simulation), thresholds in one place, allowedComboIds AND-stacks. Confined to
src/color; core-purity untouched. No new dependency.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Core `allowed?` filter seam (chord + matching)

**Files:**
- Modify: `src/core/chord.ts`
- Modify: `src/core/matching.ts`
- Test: `tests/chord.test.ts`, `tests/matching.test.ts`

**Interfaces:**
- Consumes: existing `Indexed`, `CombinationRecord`, size filtering.
- Produces (added optional last param `allowed?: ReadonlySet<number>`, `undefined` = no filter):
  - `chordMatrix(ix, level, sizes, allowed?)`
  - `combosForPair(ix, level, keyA, keyB, sizes, allowed?)`
  - `combosForSet(ix, level, setKeys, sizes, allowed?)`
  - `suggestPartners(ix, level, setKeys, sizes, allowed?)`

- [ ] **Step 1: Write the failing tests**

Append to `tests/chord.test.ts` (it already has `const ix = index(mini)` and `const ALL = new Set<2 | 3 | 4>([2, 3, 4])`):

```ts
describe('allowed-combo filter seam (chord)', () => {
  it('chordMatrix: empty allowed set yields an all-zero matrix', () => {
    const { matrix } = chordMatrix(ix, 2, ALL, new Set<number>())
    expect(matrix.flat().every((v) => v === 0)).toBe(true)
  })
  it('chordMatrix: undefined allowed equals no filter', () => {
    expect(chordMatrix(ix, 2, ALL, undefined).matrix).toEqual(chordMatrix(ix, 2, ALL).matrix)
  })
  it('combosForPair respects allowed', () => {
    expect(combosForPair(ix, 2, 'pink', 'blue', ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForPair(ix, 2, 'pink', 'blue', ALL, new Set([12])).map((c) => c.id)).toEqual([12])
  })
})
```

Append to `tests/matching.test.ts` (it already has `const ix = index(mini)` and `const ALL = ...`):

```ts
describe('allowed-combo filter seam (matching)', () => {
  it('combosForSet respects allowed', () => {
    expect(combosForSet(ix, 2, ['blue'], ALL).map((c) => c.id)).toEqual([10, 12, 14])
    expect(combosForSet(ix, 2, ['blue'], ALL, new Set([10])).map((c) => c.id)).toEqual([10])
  })
  it('suggestPartners respects allowed (drops partners with no allowed combo)', () => {
    const full = suggestPartners(ix, 2, ['pink'], ALL).map((s) => s.key)
    expect(full).toContain('blue')
    expect(full).toContain('red')
    const restricted = suggestPartners(ix, 2, ['pink'], ALL, new Set([10, 12])).map((s) => s.key)
    expect(restricted).toContain('blue')
    expect(restricted).not.toContain('red')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/chord.test.ts tests/matching.test.ts`
Expected: FAIL — functions don't accept a 4th/5th `allowed` arg (extra arg ignored → restricted assertions fail).

- [ ] **Step 3: Implement**

In `src/core/chord.ts`, replace `filteredCombos`, the `chordMatrix` signature line, and the `combosForPair` signature:

```ts
function filteredCombos(
  ix: Indexed, sizes: ReadonlySet<SizeBucket>, allowed?: ReadonlySet<number>,
): CombinationRecord[] {
  return displayableCombinations(ix).filter(
    (c) => sizes.has(sizeBucket(c)) && (!allowed || allowed.has(c.id)),
  )
}

export function chordMatrix(
  ix: Indexed, level: GranularityLevel, sizes: ReadonlySet<SizeBucket>,
  allowed?: ReadonlySet<number>,
): { nodes: WheelNode[]; matrix: number[][] } {
```

and inside `chordMatrix` change the loop header:

```ts
  for (const combo of filteredCombos(ix, sizes, allowed)) {
```

and for `combosForPair`:

```ts
export function combosForPair(
  ix: Indexed, level: GranularityLevel, keyA: string, keyB: string,
  sizes: ReadonlySet<SizeBucket>, allowed?: ReadonlySet<number>,
): CombinationRecord[] {
  return filteredCombos(ix, sizes, allowed)
    .filter((combo) => {
```

(the rest of `combosForPair`'s body is unchanged).

In `src/core/matching.ts`, replace `filtered`, and update `combosForSet` and `suggestPartners`:

```ts
function filtered(
  ix: Indexed, sizes: ReadonlySet<SizeBucket>, allowed?: ReadonlySet<number>,
): CombinationRecord[] {
  return displayableCombinations(ix).filter(
    (c) => sizes.has(sizeBucket(c)) && (!allowed || allowed.has(c.id)),
  )
}

export function combosForSet(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>,
  allowed?: ReadonlySet<number>,
): CombinationRecord[] {
  if (setKeys.length === 0) return []
  return filtered(ix, sizes, allowed)
    .filter((c) => {
      const keys = new Set(groupKeysOfCombo(ix, c, level))
      return setKeys.every((k) => keys.has(k))
    })
    .sort((a, b) => a.size - b.size || a.id - b.id)
}

export function suggestPartners(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>,
  allowed?: ReadonlySet<number>,
): PartnerSuggestion[] {
  if (setKeys.length === 0) return []
  const want = new Set(setKeys)
  const perSetKeyCount = new Map<string, Map<string, number>>()
  for (const c of filtered(ix, sizes, allowed)) {
    const keys = groupKeysOfCombo(ix, c, level)
    const present = setKeys.filter((k) => keys.includes(k))
    if (present.length === 0) continue
    for (const cand of keys) {
      if (want.has(cand)) continue
      const m = perSetKeyCount.get(cand) ?? new Map<string, number>()
      for (const sk of present) m.set(sk, (m.get(sk) ?? 0) + 1)
      perSetKeyCount.set(cand, m)
    }
  }
  const order = new Map<string, number>()
  if (level === 0) {
    ix.data.colors.forEach((c, i) => order.set(`c${c.id}`, i))
  } else {
    const groups = level === 1 ? ix.data.groups.fine : level === 2 ? ix.data.groups.broad : ix.data.groups.super
    groups.forEach((g, i) => order.set(g.id, i))
  }
  const out: PartnerSuggestion[] = []
  for (const [cand, m] of perSetKeyCount) {
    if (m.size !== want.size) continue
    const score = [...m.values()].reduce((a, b) => a + b, 0)
    const bookVerified = combosForSet(ix, level, [...setKeys, cand], sizes, allowed).length > 0
    out.push({ key: cand, score, bookVerified })
  }
  return out.sort((a, b) =>
    Number(b.bookVerified) - Number(a.bookVerified) ||
    b.score - a.score ||
    (order.get(a.key)! - order.get(b.key)!))
}
```

(Note: `suggestPartners` passes `allowed` into its internal `combosForSet` call so verification respects the filter.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/chord.test.ts tests/matching.test.ts tests/core-purity.test.ts && npx tsc --noEmit`
Expected: PASS. core-purity still green (a `Set<number>` param is not an external import).

- [ ] **Step 5: Commit**

```bash
git add src/core/chord.ts src/core/matching.ts tests/chord.test.ts tests/matching.test.ts
git commit -m "feat(core): optional allowed-combo filter through chord + matching

Thread allowed?: ReadonlySet<number> through the combo-enumeration seams
(filteredCombos/chordMatrix/combosForPair, filtered/combosForSet/
suggestPartners). undefined = no filter. Core stays pure — receives a Set.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `accessProfile` + `allowedFor` glue and the `AccessibilityGoggles` control

**Files:**
- Modify: `src/data.ts`
- Create: `src/components/AccessibilityGoggles.tsx`
- Test: `tests/accessibilityGoggles.test.tsx`

**Interfaces:**
- Consumes: `dataset` (Indexed), `accessibilityProfile`, `allowedComboIds` (Task 2), `LENSES` (Task 2), `AccessLensId` (Task 1), `AppState`/`Action` with `access` + `toggleAccess` (Task 1).
- Produces:
  - `src/data.ts`: `accessProfile` (memoized map) and `allowedFor(access: AccessLensId[]): ReadonlySet<number> | undefined` (`undefined` when `access` is empty).
  - `<AccessibilityGoggles state dispatch />` — the reusable control.

- [ ] **Step 1: Write the failing test**

Create `tests/accessibilityGoggles.test.tsx`:

```tsx
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AccessibilityGoggles } from '../src/components/AccessibilityGoggles'
import { allowedFor } from '../src/data'
import { initialState } from '../src/core/state'

describe('AccessibilityGoggles control', () => {
  it('renders the label and all three lenses', () => {
    const html = renderToString(<AccessibilityGoggles state={initialState} dispatch={() => {}} />)
    expect(html).toContain('Accessibility')
    expect(html).toContain('Web text-ready')
    expect(html).toContain('Color-blind safe')
  })
  it('shows the active count when lenses are on', () => {
    const on = { ...initialState, access: ['web-text' as const, 'colorblind' as const] }
    expect(renderToString(<AccessibilityGoggles state={on} dispatch={() => {}} />)).toContain('Accessibility · 2')
  })
})

describe('allowedFor', () => {
  it('returns undefined (no filter) for an empty selection', () => {
    expect(allowedFor([])).toBeUndefined()
  })
  it('returns the AND-stacked set for active lenses', () => {
    const set = allowedFor(['web-text', 'print-bw', 'colorblind'])!
    expect(set.size).toBe(36)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/accessibilityGoggles.test.tsx`
Expected: FAIL — `AccessibilityGoggles` and `allowedFor` don't exist.

- [ ] **Step 3: Implement**

In `src/data.ts`, add the imports and exports:

```ts
// Loads the bundled processed dataset. The ONLY module that touches the
// data file; everything else goes through core queries on `dataset`.
import processed from '../data/processed/colors-data.json'
import { accessibilityProfile, allowedComboIds } from './color/accessibility'
import { index, type Indexed } from './core/dataset'
import type { AccessLensId } from './core/types'
import { validateDataset } from './core/validate'

export const dataset: Indexed = index(validateDataset(processed))

// Which accessibility lenses each combination passes — computed once at load.
export const accessProfile = accessibilityProfile(dataset)

// The combo ids passing ALL active lenses, or undefined for "no filter" (empty
// selection). One place, so every view filters identically.
export function allowedFor(access: AccessLensId[]): ReadonlySet<number> | undefined {
  return access.length ? allowedComboIds(accessProfile, access) : undefined
}
```

Create `src/components/AccessibilityGoggles.tsx`:

```tsx
import { LENSES } from '../color/accessibility'
import type { Action, AppState } from '../core/state'

// Reusable multi-select "goggles" control. A native <details> disclosure keeps
// it SSR-safe and keyboard-operable with no open-state bookkeeping. Rendered in
// the Wheel, Browse, and Match control areas; drives AppState.access.
export function AccessibilityGoggles({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const active = state.access
  return (
    <details className="a11y-goggles">
      <summary aria-label={`Accessibility filters${active.length ? `, ${active.length} on` : ''}`}>
        {active.length ? `Accessibility · ${active.length}` : 'Accessibility'}
      </summary>
      <div className="a11y-menu" role="group" aria-label="Accessibility filters">
        {LENSES.map((lens) => (
          <button
            key={lens.id} type="button" className="a11y-option"
            aria-pressed={active.includes(lens.id)}
            onClick={() => dispatch({ type: 'toggleAccess', id: lens.id })}
          >
            <span className="a11y-option-label">{lens.label}</span>
            <span className="a11y-option-desc">{lens.description}</span>
          </button>
        ))}
      </div>
    </details>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/accessibilityGoggles.test.tsx && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data.ts src/components/AccessibilityGoggles.tsx tests/accessibilityGoggles.test.tsx
git commit -m "feat(ui): AccessibilityGoggles control + allowedFor glue

Memoized accessProfile + allowedFor(access) in the data glue layer; a reusable
<details>-based multi-select goggles control (SSR-safe, keyboard-operable).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Wire the goggles into all three views + CSS + README

**Files:**
- Modify: `src/components/ChordWheel.tsx`, `src/components/App.tsx` (path: `src/App.tsx`), `src/components/RibbonDetail.tsx`, `src/components/WheelControls.tsx`, `src/components/BrowseView.tsx`, `src/components/MatchPage.tsx`
- Modify: `src/styles/app.css`
- Modify: `README.md`
- Test: `tests/appSmoke.test.tsx`

**Interfaces:**
- Consumes: `allowedFor` (Task 4), `<AccessibilityGoggles>` (Task 4), the `allowed?` core seam (Task 3), `state.access` + `toggleAccess` (Task 1).
- Produces: goggles visible and functional in Wheel/Browse/Match; empty-state notes; filtered ribbons/plates/suggestions.

- [ ] **Step 1: Write the failing tests**

Append to `tests/appSmoke.test.tsx` (imports `initialState`, `dataset` already present; add `AccessibilityGoggles`-driven assertions through the views):

```ts
  it('shows the accessibility goggles in wheel, browse, and match', () => {
    const wheel = renderToString(<App />)
    expect(wheel).toContain('Accessibility')

    const browse = renderToString(<BrowseView state={{ ...initialState, view: 'browse' }} dispatch={() => {}} />)
    expect(browse).toContain('Accessibility')
    expect(browse).toContain('Color-blind safe')

    const match = renderToString(<MatchPage state={{ ...initialState, view: 'match' }} dispatch={() => {}} />)
    expect(match).toContain('Accessibility')
  })

  it('browse filters to fewer combos when a lens is active', () => {
    const all = renderToString(<BrowseView state={initialState} dispatch={() => {}} />)
    expect(all).toContain('338 combinations')
    const filtered = renderToString(
      <BrowseView state={{ ...initialState, access: ['print-bw'] }} dispatch={() => {}} />,
    )
    expect(filtered).toContain('57 combinations')
  })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/appSmoke.test.tsx`
Expected: FAIL — no "Accessibility" text yet; Browse still shows 338 with a lens active.

- [ ] **Step 3: Implement**

Replace `src/components/ChordWheel.tsx` entirely:

```tsx
import { useEffect, useMemo, useRef } from 'react'
import { chordMatrix, redAnchorAngle } from '../core/chord'
import type { Action, AppState } from '../core/state'
import { allowedFor, dataset } from '../data'
import { renderChord } from '../viz/chordRender'

interface Props { state: AppState; dispatch: (a: Action) => void }

export function ChordWheel({ state, dispatch }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const sizes = useMemo(() => new Set(state.sizes), [state.sizes])
  const allowed = useMemo(() => allowedFor(state.access), [state.access])
  const { granularity } = state
  const { nodes, matrix } = useMemo(
    () => chordMatrix(dataset, granularity, sizes, allowed),
    [granularity, sizes, allowed],
  )
  const isEmpty = matrix.every((row) => row.every((v) => v === 0))

  useEffect(() => {
    if (!svgRef.current) return
    renderChord(svgRef.current, nodes, matrix, {
      onArcClick: (key) =>
        dispatch({
          type: 'select',
          selection: granularity === 0
            ? { kind: 'color', id: Number(key.slice(1)) }
            : { kind: 'group', id: key },
        }),
      onRibbonClick: (keyA, keyB) =>
        dispatch({
          type: 'select',
          selection: { kind: 'ribbon', level: granularity, keyA, keyB, sizes: [...state.sizes] },
        }),
    }, (groups) => redAnchorAngle(dataset, granularity, groups, nodes))
  }, [nodes, matrix, granularity, dispatch, state.sizes])

  return (
    <div className="wheel-wrap">
      <svg ref={svgRef} className="chord-wheel" role="img"
        aria-label="Chord diagram of Sanzo Wada's color combinations. Use the Browse view for a list alternative." />
      {isEmpty && state.access.length > 0 && (
        <p className="empty-note wheel-empty">No combinations match these goggles — loosen one.</p>
      )}
    </div>
  )
}
```

In `src/App.tsx`, compute `allowed` once and pass to `RibbonDetail`. Add imports and a memo:

```tsx
import { useMemo, useReducer } from 'react'
```

(keep the other existing imports; add:)

```tsx
import { allowedFor } from './data'
```

Inside `App()` after the `useReducer` line:

```tsx
  const allowed = useMemo(() => allowedFor(state.access), [state.access])
```

and change the `RibbonDetail` render line to pass `allowed`:

```tsx
        {state.selection?.kind === 'ribbon' && (
          <RibbonDetail sel={state.selection} sizes={new Set(state.selection.sizes ?? state.sizes)} allowed={allowed} dispatch={dispatch} />
        )}
```

In `src/components/RibbonDetail.tsx`, accept and forward `allowed`:

```tsx
export function RibbonDetail({ sel, sizes, allowed, dispatch }:
  { sel: Extract<Selection, { kind: 'ribbon' }>; sizes: Set<2 | 3 | 4>; allowed?: ReadonlySet<number>; dispatch: (a: Action) => void }) {
  const nodes = wheelNodes(dataset, sel.level)
  const labelOf = (key: string) => nodes.find((n) => n.key === key)?.label ?? key
  const combos = combosForPair(dataset, sel.level, sel.keyA, sel.keyB, sizes, allowed)
```

(rest unchanged).

In `src/components/WheelControls.tsx`, import and render the control inside `.wheel-controls` (after the `.size-filter` div). Add the import at top:

```tsx
import { AccessibilityGoggles } from './AccessibilityGoggles'
```

and add, immediately before the closing `</div>` of `.wheel-controls`:

```tsx
      <div className="a11y-row">
        <AccessibilityGoggles state={state} dispatch={dispatch} />
      </div>
```

In `src/components/BrowseView.tsx`: import the control, compute `allowed`, apply it in the filter, mount the control in `.browse-filters`, and add an empty-state note. Add imports:

```tsx
import { allowedFor, dataset } from '../data'
import { AccessibilityGoggles } from './AccessibilityGoggles'
```

(replace the existing `import { dataset } from '../data'` line with the combined import above.)

Inside the component, after `const setFilter = ...`:

```tsx
  const allowed = allowedFor(state.access)
```

Add the `allowed` check as the first line of the `.filter((c) => { ... })` body:

```tsx
  const combos = displayableCombinations(dataset).filter((c) => {
    if (allowed && !allowed.has(c.id)) return false
    if (!state.sizes.includes(sizeBucket(c))) return false
```

(rest of the filter unchanged).

Mount the control in `.browse-filters` — add before the `<span className="muted">{comboCount}</span>` line:

```tsx
        <AccessibilityGoggles state={state} dispatch={dispatch} />
```

Add an empty-state note — after the `{sections.map(...)}` block, before the closing `</div>` of `.browse-view`:

```tsx
      {combos.length === 0 && <p className="empty-note">No combinations match these filters — loosen one.</p>}
```

In `src/components/MatchPage.tsx`: compute `allowed`, thread it into `suggestPartners`/`combosForSet`, mount the control, and make the empty note goggles-aware. Add imports:

```tsx
import { allowedFor, dataset } from '../data'
import { AccessibilityGoggles } from './AccessibilityGoggles'
```

(replace the existing `import { dataset } from '../data'` with the combined import above.)

Inside the component, replace the `suggestions`/`combos` lines:

```tsx
  const allowed = allowedFor(state.access)
  const suggestions = keys.length ? suggestPartners(dataset, level, keys, MATCH_SIZES, allowed) : []
  const combos = keys.length ? combosForSet(dataset, level, keys, MATCH_SIZES, allowed) : []
```

Mount the control in the `.match-head` (after the `.level` radiogroup div, before `</div>` closing `.match-head`):

```tsx
        <AccessibilityGoggles state={state} dispatch={dispatch} />
```

Make the suggestions empty-note goggles-aware — replace the existing note:

```tsx
              {suggestions.length === 0 &&
                <p className="empty-note">{state.access.length
                  ? 'No accessible pairings for this palette — loosen the goggles.'
                  : 'Nothing in the book pairs with all of these — try removing a shade.'}</p>}
```

Add the CSS to the end of `src/styles/app.css` (tokens only; the box-shadow rgba matches the existing panel-shadow precedent):

```css
/* Accessibility goggles — multi-select filter */
.a11y-row { margin-top: var(--s3); }
.a11y-goggles { position: relative; display: inline-block; text-align: left; }
.a11y-goggles > summary {
  list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: var(--s2);
  padding: var(--s1) var(--s3); border: 1px solid var(--ink-faint); border-radius: var(--radius);
  color: var(--ink-muted); font-size: 0.72rem; letter-spacing: var(--tracking-label); text-transform: uppercase;
}
.a11y-goggles > summary::-webkit-details-marker { display: none; }
.a11y-goggles[open] > summary { border-color: var(--ink); color: var(--ink); }
.a11y-menu {
  position: absolute; z-index: 20; margin-top: var(--s2); min-width: 250px;
  display: flex; flex-direction: column; gap: var(--s1);
  padding: var(--s2); background: var(--paper-1);
  border: 1px solid var(--hairline); border-radius: var(--radius);
  box-shadow: 0 6px 20px rgba(47, 42, 38, 0.14);
}
.a11y-option {
  display: flex; flex-direction: column; gap: 2px; text-align: left;
  padding: var(--s2) var(--s3); border: 1px solid transparent; border-radius: var(--radius);
  background: none; color: var(--ink); cursor: pointer;
}
.a11y-option:hover { border-color: var(--ink-faint); }
.a11y-option[aria-pressed='true'] { background: var(--ink); border-color: var(--ink); color: var(--paper-1); }
.a11y-option-label { font-weight: 700; font-size: 0.85rem; }
.a11y-option-desc { font-size: 0.72rem; color: var(--ink-muted); }
.a11y-option[aria-pressed='true'] .a11y-option-desc { color: var(--paper-2); }
.wheel-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
.wheel-empty { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; max-width: 260px; }
```

Update `README.md`: add a short "Accessibility goggles" subsection under the feature list (non-JS-reader friendly). Insert after the camera feature bullet/section:

```markdown
### Accessibility goggles

A set of optional filters ("goggles") you can stack on any view — the Wheel,
Browse, and Match. They narrow the combinations to those that meet an
accessibility bar; turning several on shows only combinations that pass *all*
of them. They filter what you see — they never change or hide the underlying
book data.

- **Web text-ready** — at least one pair of the colors has enough contrast to
  use as readable text on a background (WCAG AA, 4.5:1).
- **Print & B&W safe** — every color stays tellable apart in grayscale, so the
  combination survives a black-and-white print or photocopy. (This is the
  honest version of "print-friendly"; true CMYK ink proofing needs a printer
  profile the site doesn't have, so it isn't claimed.)
- **Color-blind safe** — the colors stay distinct for the common red-green
  types of color blindness.
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (all suites, including appSmoke's new assertions and the existing "338 combinations" check with no lens active).

- [ ] **Step 5: Commit**

```bash
git add src/components/ChordWheel.tsx src/App.tsx src/components/RibbonDetail.tsx src/components/WheelControls.tsx src/components/BrowseView.tsx src/components/MatchPage.tsx src/styles/app.css README.md tests/appSmoke.test.tsx
git commit -m "feat(ui): accessibility goggles across wheel, browse, and match

Mount the reusable goggles control in all three views; thread allowedFor into
chord/ribbon/browse/match enumeration; empty-state notes; tokenized styles.
README documents the three lenses for a non-JS reader.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Docs log — PROMPTS, TODO, TODO-completed

**Files:**
- Modify: `PROMPTS.md`, `TODO.md`, `TODO-completed.md`

**Interfaces:**
- Consumes: the commit hashes from Tasks 1–5.
- Produces: append-only prompt log, deferral list, completed-log entries.

- [ ] **Step 1: Append the owner's prompts (verbatim) to `PROMPTS.md`**

Add a new "Session 7 — accessibility goggles" section. Include, verbatim (preserve typos), the owner's prompts from this session, each with the decision made:
- "i'd like to have a dropdown on the top that let's you pick the underlying dataset. right now we are using the original dataset. let's create a separate dataset that is takes our original combinations and see if they pass a WCAG check for internet accessibilty. …" → explored WCAG interpretations with real survivor counts.
- "are there any other accessiblity checks that we can look into? things like colorblind friendly and print friendly and black-and-white friendly?" → added CVD lens; established B&W = all-pairs-3:1; ruled out CMYK soft-proof as not honestly programmable.
- AskUserQuestion answers, verbatim: chose "Ship both as 2 datasets", then reframed to "instead of dropdown i think we can make this a multi-select dropdown / selectize object instead. it's liek selecting the 2, 3, 4 color combo bits not actually changing the underlying dataset. so these accessibilty goggles only filter on the current dataset, they're not really new datasets. we should make sure these options appear in the match and browse pages as well, not just the wheel."
- "yes make it so" (design approval), "yeah look good" (spec approval).
Record the key decisions: filter not dataset-swap; three lenses; AND-stacking (OR barely filters — 80%); CVD threshold 0.10 tunable; culori confined to `src/color/`.

- [ ] **Step 2: Add deferrals to `TODO.md`**

Append:

```markdown
- [ ] Accessibility goggles — APCA / WCAG-3 perceptual-contrast lens (v1 uses
      WCAG 2 luminance contrast + OKLab-under-CVD).
- [ ] Accessibility goggles — a separate tritan (blue-yellow) color-blind
      option and/or a severity control (v1 covers protan+deutan at severity 1).
- [ ] Accessibility goggles — a UI control to tune `CVD_THRESHOLD` (v1 ships
      the constant 0.10 in `src/color/accessibility.ts`).
- [ ] Accessibility goggles — consider unifying the goggles control with the
      size chips into one filter bar (v1 keeps them adjacent but separate; size
      chips are OR within a dimension, goggles are AND across dimensions).
- [ ] A genuinely-different-dataset selector (a second color book) — the
      original dataset-swap idea, retired for the goggles feature but valid
      future work; would need the dataset-registry + context approach.
```

- [ ] **Step 3: Add completed entries to `TODO-completed.md`**

Add a "Session 7 — accessibility goggles" section listing Tasks 1–5 with their actual commit hashes (fill from `git log --oneline`), e.g.:

```markdown
## Session 7 — accessibility goggles (2026-07-21)

Design + plan: `docs/superpowers/specs/2026-07-21-accessibility-goggles-design.md`,
`docs/superpowers/plans/2026-07-21-accessibility-goggles.md`.

- [x] Access lens filter in app state (AccessLensId, access, toggleAccess) —
      done in <hash-task1> (2026-07-21)
- [x] Accessibility lens seam in src/color (web-text / print-bw / colorblind,
      thresholds, profile, allowedComboIds) — done in <hash-task2> (2026-07-21)
- [x] Optional allowed-combo filter through chord + matching core seams —
      done in <hash-task3> (2026-07-21)
- [x] accessProfile + allowedFor glue and the AccessibilityGoggles control —
      done in <hash-task4> (2026-07-21)
- [x] Goggles wired across wheel, browse, and match + docs — done in
      <hash-task5> (2026-07-21)
```

- [ ] **Step 4: Verify docs + full suite**

Run: `make test && npx tsc --noEmit`
Expected: PASS. Confirm `make help` still lists working targets (no Makefile change needed).

- [ ] **Step 5: Commit**

```bash
git add PROMPTS.md TODO.md TODO-completed.md
git commit -m "docs: log accessibility goggles session (prompts, TODO, completed)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage** (against `docs/superpowers/specs/2026-07-21-accessibility-goggles-design.md`):
- §3 three lenses + thresholds → Task 2 (`LENSES`, constants, predicates). ✓
- §4 AND composition → Task 2 (`allowedComboIds`), Task 4 (`allowedFor`), tests assert 36/subset. ✓
- §5.1 `accessibility.ts` → Task 2. §5.2 culori.d.ts → Task 2. §5.3 `AccessLensId` → Task 1. §5.4 state → Task 1. §5.5 core `allowed?` seam → Task 3. §5.6 `src/data.ts` → Task 4. §5.7 control → Task 4. §5.8 wiring → Task 5. ✓
- §6 empty states → Task 5 (wheel/browse/match notes). ✓
- §7 edge cases: explicit selections not hidden (only enumerated lists filter — CombinationDetail/ColorDetail untouched) ✓; no persistence (ephemeral state) ✓; switching views preserves goggles (global state) ✓.
- §8 testing: predicate units + full-dataset regression (Task 2), reducer (Task 1), core seam (Task 3), control smoke (Task 4), cross-view smoke (Task 5). ✓
- §9 zero new deps → culori.d.ts extension only. ✓
- §10 docs: CLAUDE.md (Task 2), README (Task 5), PROMPTS/TODO/TODO-completed (Task 6). ✓
- §11 deferrals → Task 6 TODO. ✓

**2. Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N". Task 6 Step 3 uses `<hash-taskN>` placeholders that are intentionally filled from `git log` at execution time (real hashes don't exist until the commits are made) — this is the documented completed-log convention, not a code placeholder.

**3. Type consistency:**
- `AccessLensId` = `'web-text' | 'print-bw' | 'colorblind'` used identically in Tasks 1, 2, 4.
- `allowed?: ReadonlySet<number>` param consistent across chord.ts, matching.ts (Task 3), RibbonDetail (Task 5), and `allowedFor(...)`'s return type `ReadonlySet<number> | undefined` (Task 4).
- `accessibilityProfile(ix: Indexed): Map<number, Set<AccessLensId>>` and `allowedComboIds(profile, active)` signatures match between Task 2 definition and Task 4 usage.
- Control prop shape `{ state: AppState; dispatch: (a: Action) => void }` matches every mount site (WheelControls/BrowseView/MatchPage already pass `state`, `dispatch`).
- `toggleAccess` action literal shape identical in reducer (Task 1) and every `dispatch` call (Tasks 4–5).
