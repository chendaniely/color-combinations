# Color Matching & Outfit Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add group-level matching and a multi-color outfit builder to the Sanzo Wada explorer: an enriched group side-panel (quick preview) and a new Match page (detailed builder), over a shared pure matching engine.

**Architecture:** One pure engine (`src/core/matching.ts`) computes partner suggestions and set-matching combinations. It is surfaced two ways: the existing `GroupDetail` panel gains breadcrumb + narrow-to + pairs-well-with + preview palettes + a bridge button; a new `match` view renders a palette tray, ranked suggestions, and real book palettes. State grows by one serializable `palette` object and a `match` view.

**Tech Stack:** Vite + React 19 + TypeScript (strict) + D3 7, tested with Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-20-color-matching-and-outfit-builder-design.md` — read it first. Mockups (open in a browser): `docs/superpowers/specs/2026-07-20-match-group-panel-mockup.html`, `...-match-page-mockup.html`.

## Global Constraints

Every task implicitly includes these. Copy values exactly.

- **Core purity:** files in `src/core/` (including the new `matching.ts`) import **only** other `src/core/` files via relative paths — no packages, no `window`/`document`/`navigator`/`localStorage`/`fetch`. Enforced by `tests/core-purity.test.ts` — never weaken it.
- **No new dependencies.** Reuse React, existing core, `PlateCard`, `RibbonDetail`.
- **Matching ignores the wheel's size chips:** the engine is always called with all size buckets `new Set<2 | 3 | 4>([2, 3, 4])` on both surfaces.
- **Match levels:** Shades = fine = `1`, Families = broad = `2`. The Match page uses only these two; default `1`. `MatchLevel = 1 | 2`.
- **Suggestion ranking (deterministic):** `bookVerified` first, then `score` descending, then group display order (index in the level's group array) ascending.
- **Level-switch rule:** going coarser (Shades→Families) maps each key to its parent family and dedupes; going finer (Families→Shades) clears the palette (returns `[]`).
- **Tokens only:** components reference `var(--…)` from `src/styles/tokens.css`; Sanzo Wada data colors (hex) excepted. No hard-coded colors.
- **Docs same commit:** any change to setup/commands/structure/behavior updates README/Makefile/CLAUDE.md/PROMPTS.md/TODO in the same commit. Wrong docs are worse than none.
- **Verification gate per task:** `npx tsc --noEmit` clean AND `make test` green before every commit.
- **Commit trailer:** end each commit message body with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## File Map

```
src/core/matching.ts          NEW — engine + group-hierarchy helpers (pure)
src/core/state.ts             MODIFY — 'match' view, palette state, actions
src/components/MatchPage.tsx   NEW — orchestrates palette → children
src/components/PaletteTray.tsx NEW — chosen-shade chips + remove
src/components/SuggestionList.tsx NEW — ranked suggestion chips + add
src/components/ShadePicker.tsx  NEW — empty-state searchable group picker
src/components/GroupMatches.tsx NEW — pairs-well-with + preview palettes (panel)
src/components/GroupDetail.tsx  MODIFY — breadcrumb, narrow-to, matches, bridge
src/components/Header.tsx       MODIFY — Match tab
src/App.tsx                     MODIFY — render match view
src/styles/app.css             MODIFY — match/tray/suggestion/panel styles
tests/matching.test.ts         NEW — engine + helpers (TDD)
tests/state.test.ts            MODIFY — palette reducer (TDD)
tests/appSmoke.test.tsx        MODIFY — MatchPage + enriched GroupDetail
README.md / PROMPTS.md / TODO.md  MODIFY — docs (Task 5)
```

**Reused, unchanged:** `ancestorAtLevel`, `displayableCombinations`, `sizeBucket`, `groupMembers` (`src/core/dataset.ts`); `PlateCard`, `RibbonDetail`, `Panel`; the mini fixture `tests/fixtures/miniDataset.ts`.

**Sequence:** engine (1) → state (2) → Match page (3) → enriched panel (4) → docs (5). The panel's bridge button targets the Match page, so the page lands first.

---

### Task 1: Matching engine + group-hierarchy helpers

**Files:**
- Create: `src/core/matching.ts`
- Test: `tests/matching.test.ts`

**Interfaces:**
- Consumes: `Indexed`, `ancestorAtLevel`, `displayableCombinations`, `sizeBucket` (`src/core/dataset.ts`); `GranularityLevel`, `SizeBucket`, `GroupNode`, `CombinationRecord` (`src/core/types.ts`).
- Produces:

```ts
export type GroupLevel = 1 | 2 | 3
export interface PartnerSuggestion { key: string; score: number; bookVerified: boolean }

export function levelOfGroupKey(ix: Indexed, key: string): GroupLevel
export function breadcrumbOf(ix: Indexed, key: string): GroupNode[]   // top→key, inclusive
export function childGroupsOf(ix: Indexed, key: string): GroupNode[]  // direct children; fine → []
export function groupKeysOfCombo(ix: Indexed, combo: CombinationRecord, level: GranularityLevel): string[] // unique
export function remapKeysToLevel(ix: Indexed, keys: readonly string[], from: 1 | 2, to: 1 | 2): string[]
export function combosForSet(ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>): CombinationRecord[]
export function suggestPartners(ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>): PartnerSuggestion[]
```

- [ ] **Step 1: Write the failing tests** — `tests/matching.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { index } from '../src/core/dataset'
import {
  breadcrumbOf, childGroupsOf, combosForSet, groupKeysOfCombo,
  levelOfGroupKey, remapKeysToLevel, suggestPartners,
} from '../src/core/matching'
import { mini } from './fixtures/miniDataset'

const ix = index(mini)
const ALL = new Set<2 | 3 | 4>([2, 3, 4])

describe('group hierarchy helpers', () => {
  it('levelOfGroupKey classifies fine/broad/super', () => {
    expect(levelOfGroupKey(ix, 'dusty-pinks')).toBe(1)
    expect(levelOfGroupKey(ix, 'pink')).toBe(2)
    expect(levelOfGroupKey(ix, 'warm')).toBe(3)
  })
  it('breadcrumbOf returns top→key inclusive', () => {
    expect(breadcrumbOf(ix, 'dusty-pinks').map((g) => g.id)).toEqual(['warm', 'pink', 'dusty-pinks'])
    expect(breadcrumbOf(ix, 'pink').map((g) => g.id)).toEqual(['warm', 'pink'])
    expect(breadcrumbOf(ix, 'warm').map((g) => g.id)).toEqual(['warm'])
  })
  it('childGroupsOf returns direct children; fine has none', () => {
    expect(childGroupsOf(ix, 'warm').map((g) => g.id)).toEqual(['pink', 'red'])
    expect(childGroupsOf(ix, 'pink').map((g) => g.id)).toEqual(['dusty-pinks'])
    expect(childGroupsOf(ix, 'dusty-pinks')).toEqual([])
  })
  it('groupKeysOfCombo maps colors to unique level keys', () => {
    expect(groupKeysOfCombo(ix, ix.comboById.get(14)!, 1).sort())
      .toEqual(['deep-blues', 'dusty-pinks', 'true-reds'])
    expect(groupKeysOfCombo(ix, ix.comboById.get(10)!, 2).sort()).toEqual(['blue', 'pink'])
  })
  it('remapKeysToLevel: coarser maps+dedupes, finer clears', () => {
    expect(remapKeysToLevel(ix, ['dusty-pinks', 'deep-blues'], 1, 2)).toEqual(['pink', 'blue'])
    expect(remapKeysToLevel(ix, ['pink'], 2, 1)).toEqual([])
    expect(remapKeysToLevel(ix, ['pink'], 2, 2)).toEqual(['pink'])
  })
})

describe('combosForSet', () => {
  it('single key: all displayable combos containing it, size then id', () => {
    expect(combosForSet(ix, 1, ['dusty-pinks'], ALL).map((c) => c.id)).toEqual([10, 11, 12, 14])
  })
  it('multi key: superset combos only', () => {
    expect(combosForSet(ix, 1, ['dusty-pinks', 'deep-blues'], ALL).map((c) => c.id)).toEqual([10, 12, 14])
  })
  it('excludes quirk combos and non-supersets', () => {
    expect(combosForSet(ix, 1, ['true-reds'], ALL).map((c) => c.id)).toEqual([11, 14])
  })
})

describe('suggestPartners', () => {
  it('single key ranks partners by co-occurrence', () => {
    expect(suggestPartners(ix, 1, ['dusty-pinks'], ALL)).toEqual([
      { key: 'deep-blues', score: 3, bookVerified: true },
      { key: 'true-reds', score: 2, bookVerified: true },
    ])
  })
  it('multi key keeps only shades pairing with ALL members', () => {
    expect(suggestPartners(ix, 1, ['dusty-pinks', 'deep-blues'], ALL)).toEqual([
      { key: 'true-reds', score: 3, bookVerified: true },
    ])
  })
  it('works at the broad level', () => {
    expect(suggestPartners(ix, 2, ['pink'], ALL).map((p) => p.key)).toEqual(['blue', 'red'])
  })
  it('empty set returns nothing', () => {
    expect(suggestPartners(ix, 1, [], ALL)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/matching.test.ts`
Expected: FAIL — cannot resolve `../src/core/matching`.

- [ ] **Step 3: Implement `src/core/matching.ts`**

```ts
// Matching engine + group-hierarchy navigation. Pure core kernel: no imports
// outside src/core. Surfaced by the group panel and the Match page.
import { ancestorAtLevel, displayableCombinations, sizeBucket, type Indexed } from './dataset'
import type { CombinationRecord, GranularityLevel, GroupNode, SizeBucket } from './types'

export type GroupLevel = 1 | 2 | 3
export interface PartnerSuggestion { key: string; score: number; bookVerified: boolean }

export function levelOfGroupKey(ix: Indexed, key: string): GroupLevel {
  if (ix.broadOfFine.has(key)) return 1
  if (ix.superOfBroad.has(key)) return 2
  return 3
}

export function breadcrumbOf(ix: Indexed, key: string): GroupNode[] {
  const node = ix.groupById.get(key)!
  const level = levelOfGroupKey(ix, key)
  if (level === 1) {
    const broad = ix.broadOfFine.get(key)!
    const sup = ix.superOfBroad.get(broad)!
    return [ix.groupById.get(sup)!, ix.groupById.get(broad)!, node]
  }
  if (level === 2) {
    const sup = ix.superOfBroad.get(key)!
    return [ix.groupById.get(sup)!, node]
  }
  return [node]
}

export function childGroupsOf(ix: Indexed, key: string): GroupNode[] {
  const level = levelOfGroupKey(ix, key)
  if (level === 3) return ix.data.groups.broad.filter((b) => b.parentId === key)
  if (level === 2) return ix.data.groups.fine.filter((f) => f.parentId === key)
  return []
}

export function groupKeysOfCombo(
  ix: Indexed, combo: CombinationRecord, level: GranularityLevel,
): string[] {
  return [...new Set(combo.colorIds.map((id) => ancestorAtLevel(ix, id, level)))]
}

export function remapKeysToLevel(
  ix: Indexed, keys: readonly string[], from: 1 | 2, to: 1 | 2,
): string[] {
  if (to === from) return [...keys]
  if (to === 1) return [] // finer: cannot uniquely pick a shade
  return [...new Set(keys.map((k) => ix.broadOfFine.get(k)!))] // coarser: fine → broad
}

function filtered(ix: Indexed, sizes: ReadonlySet<SizeBucket>): CombinationRecord[] {
  return displayableCombinations(ix).filter((c) => sizes.has(sizeBucket(c)))
}

export function combosForSet(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>,
): CombinationRecord[] {
  if (setKeys.length === 0) return []
  return filtered(ix, sizes)
    .filter((c) => {
      const keys = new Set(groupKeysOfCombo(ix, c, level))
      return setKeys.every((k) => keys.has(k))
    })
    .sort((a, b) => a.size - b.size || a.id - b.id)
}

export function suggestPartners(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[], sizes: ReadonlySet<SizeBucket>,
): PartnerSuggestion[] {
  if (setKeys.length === 0) return []
  const want = new Set(setKeys)
  // For each candidate: how many combos pair it with each set key.
  const perSetKeyCount = new Map<string, Map<string, number>>() // candidate → (setKey → count)
  for (const c of filtered(ix, sizes)) {
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
  // Display order for deterministic tie-break.
  const order = new Map<string, number>()
  const groups = level === 1 ? ix.data.groups.fine : level === 2 ? ix.data.groups.broad : ix.data.groups.super
  groups.forEach((g, i) => order.set(g.id, i))

  const out: PartnerSuggestion[] = []
  for (const [cand, m] of perSetKeyCount) {
    if (m.size !== want.size) continue // must pair with EVERY set key
    const score = [...m.values()].reduce((a, b) => a + b, 0)
    const bookVerified = combosForSet(ix, level, [...setKeys, cand], sizes).length > 0
    out.push({ key: cand, score, bookVerified })
  }
  return out.sort((a, b) =>
    Number(b.bookVerified) - Number(a.bookVerified) ||
    b.score - a.score ||
    (order.get(a.key)! - order.get(b.key)!))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test` then `npx tsc --noEmit`
Expected: all PASS; tsc clean. (Purity guard now also covers `matching.ts`.)

- [ ] **Step 5: Commit**

```bash
git add src/core/matching.ts tests/matching.test.ts
git commit -m "feat: matching engine (suggestPartners, combosForSet) and group-hierarchy helpers"
```

---

### Task 2: Palette state + Match view in the reducer

**Files:**
- Modify: `src/core/state.ts`
- Test: `tests/state.test.ts`

**Interfaces:**
- Consumes: `GranularityLevel`, `SizeBucket` (already imported in state.ts).
- Produces (later tasks rely on these exact names):

```ts
export type MatchLevel = 1 | 2
// AppState gains: view: 'wheel' | 'browse' | 'match'; palette: { level: MatchLevel; keys: string[] }
// initialState.palette = { level: 1, keys: [] }
// Actions added:
//   { type: 'seedPalette'; key: string; level: MatchLevel }   // sets palette, view 'match', closes panels
//   { type: 'addToPalette'; key: string }
//   { type: 'removeFromPalette'; key: string }
//   { type: 'setMatchLevel'; level: MatchLevel; keys: string[] }
//   { type: 'clearPalette' }
```

- [ ] **Step 1: Update the existing initialState test, then write the failing tests** — first, the current test `tests/state.test.ts` asserts `initialState` deep-equals an object with no `palette`; adding `palette` will break it. Update that assertion to include the new field:

```ts
    expect(initialState).toEqual({
      view: 'wheel', granularity: 0, sizes: [2, 3, 4], selection: null, aboutOpen: false,
      palette: { level: 1, keys: [] },
    })
```

Then append these new tests (inside the existing `describe`):

```ts
  it('starts with an empty shades palette', () => {
    expect(initialState.palette).toEqual({ level: 1, keys: [] })
  })
  it('seedPalette sets one key, enters match, closes panels', () => {
    const s = reducer(
      { ...initialState, selection: { kind: 'color', id: 1 }, aboutOpen: true },
      { type: 'seedPalette', key: 'olives', level: 1 })
    expect(s.view).toBe('match')
    expect(s.palette).toEqual({ level: 1, keys: ['olives'] })
    expect(s.selection).toBeNull()
    expect(s.aboutOpen).toBe(false)
  })
  it('addToPalette appends and dedupes', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'addToPalette', key: 'deep-teals' })
    s = reducer(s, { type: 'addToPalette', key: 'olives' }) // dup no-op
    expect(s.palette.keys).toEqual(['olives', 'deep-teals'])
  })
  it('removeFromPalette drops a key', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'addToPalette', key: 'deep-teals' })
    s = reducer(s, { type: 'removeFromPalette', key: 'olives' })
    expect(s.palette.keys).toEqual(['deep-teals'])
  })
  it('setMatchLevel replaces level and keys (mapping done by caller)', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'setMatchLevel', level: 2, keys: ['green'] })
    expect(s.palette).toEqual({ level: 2, keys: ['green'] })
  })
  it('clearPalette empties keys but keeps level and match view', () => {
    let s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    s = reducer(s, { type: 'clearPalette' })
    expect(s.palette).toEqual({ level: 1, keys: [] })
    expect(s.view).toBe('match')
  })
  it('palette state stays JSON-serializable', () => {
    const s = reducer(initialState, { type: 'seedPalette', key: 'olives', level: 1 })
    expect(JSON.parse(JSON.stringify(s))).toEqual(s)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL — `initialState.palette` undefined / unknown action types.

- [ ] **Step 3: Implement the state changes** — edit `src/core/state.ts`:

Add after the `Selection` type:

```ts
export type MatchLevel = 1 | 2
```

Change `AppState`:

```ts
export interface AppState {
  view: 'wheel' | 'browse' | 'match'
  granularity: GranularityLevel
  sizes: SizeBucket[]
  selection: Selection | null
  aboutOpen: boolean
  palette: { level: MatchLevel; keys: string[] }
}
```

Add to the `Action` union:

```ts
  | { type: 'seedPalette'; key: string; level: MatchLevel }
  | { type: 'addToPalette'; key: string }
  | { type: 'removeFromPalette'; key: string }
  | { type: 'setMatchLevel'; level: MatchLevel; keys: string[] }
  | { type: 'clearPalette' }
```

Change `initialState` to add:

```ts
  palette: { level: 1, keys: [] },
```

Add these cases to the `reducer` switch (before the closing brace):

```ts
    case 'seedPalette':
      return {
        ...state, view: 'match', selection: null, aboutOpen: false,
        palette: { level: action.level, keys: [action.key] },
      }
    case 'addToPalette': {
      if (state.palette.keys.includes(action.key)) return state
      return { ...state, palette: { ...state.palette, keys: [...state.palette.keys, action.key] } }
    }
    case 'removeFromPalette':
      return {
        ...state,
        palette: { ...state.palette, keys: state.palette.keys.filter((k) => k !== action.key) },
      }
    case 'setMatchLevel':
      return { ...state, palette: { level: action.level, keys: action.keys } }
    case 'clearPalette':
      return { ...state, palette: { ...state.palette, keys: [] } }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `make test` then `npx tsc --noEmit`
Expected: all PASS; tsc clean.

- [ ] **Step 5: Commit**

```bash
git add src/core/state.ts tests/state.test.ts
git commit -m "feat: palette state and match view in the app-state reducer"
```

---

### Task 3: Match page (view, tray, suggestions, picker) + Header tab

**Files:**
- Create: `src/components/MatchPage.tsx`, `src/components/PaletteTray.tsx`, `src/components/SuggestionList.tsx`, `src/components/ShadePicker.tsx`
- Modify: `src/components/Header.tsx`, `src/App.tsx`, `src/styles/app.css`
- Test: `tests/appSmoke.test.tsx`

**Interfaces:**
- Consumes: `suggestPartners`, `combosForSet`, `remapKeysToLevel`, `PartnerSuggestion` (Task 1); `MatchLevel`, actions (Task 2); `groupMembers` (`src/core/dataset.ts`); `dataset` (`src/data.ts`); `PlateCard`.
- Produces: `MatchPage`, `PaletteTray`, `SuggestionList`, `ShadePicker` React components; a Match tab; App renders the match view.

- [ ] **Step 1: Create `src/components/PaletteTray.tsx`**

```tsx
import { groupMembers } from '../core/dataset'
import type { Action } from '../core/state'
import { dataset } from '../data'

function Cluster({ groupId }: { groupId: string }) {
  return (
    <span className="cl">
      {groupMembers(dataset, groupId).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
    </span>
  )
}

export function PaletteTray({ keys, dispatch }: { keys: string[]; dispatch: (a: Action) => void }) {
  return (
    <div className="tray">
      <div className="lab">Your palette · {keys.length} shade{keys.length === 1 ? '' : 's'}</div>
      <div className="chips">
        {keys.map((k) => (
          <div key={k} className="chip">
            <Cluster groupId={k} />
            <div className="row">
              <span className="nm">{dataset.groupById.get(k)!.name}</span>
              <button className="x" aria-label={`Remove ${dataset.groupById.get(k)!.name}`}
                onClick={() => dispatch({ type: 'removeFromPalette', key: k })}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/SuggestionList.tsx`**

```tsx
import { groupMembers } from '../core/dataset'
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
            {groupMembers(dataset, s.key).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
          </span>
          <span className="meta">
            <span className="nm">{dataset.groupById.get(s.key)!.name}</span>
            <span className="sc">{s.bookVerified ? '★ book-verified' : 'pairs with all'}</span>
          </span>
          <span className="plus" aria-hidden="true">+</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/ShadePicker.tsx`**

```tsx
import { useState } from 'react'
import { groupMembers } from '../core/dataset'
import type { Action, MatchLevel } from '../core/state'
import { dataset } from '../data'

export function ShadePicker({ level, dispatch }: { level: MatchLevel; dispatch: (a: Action) => void }) {
  const [q, setQ] = useState('')
  const groups = level === 1 ? dataset.data.groups.fine : dataset.data.groups.broad
  const needle = q.trim().toLowerCase()
  const matches = groups.filter((g) => g.name.toLowerCase().includes(needle))
  return (
    <div className="picker">
      <p className="lede">Pick a shade you already have to start:</p>
      <input className="picker-input" value={q} placeholder="search shades… (olive, teal)"
        aria-label="Search shades" onChange={(e) => setQ(e.target.value)} />
      <div className="sugs">
        {matches.map((g) => (
          <button key={g.id} className="sug" onClick={() => dispatch({ type: 'seedPalette', key: g.id, level })}>
            <span className="cl">
              {groupMembers(dataset, g.id).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
            </span>
            <span className="meta"><span className="nm">{g.name}</span></span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/MatchPage.tsx`**

```tsx
import { combosForSet, remapKeysToLevel, suggestPartners } from '../core/matching'
import type { Action, AppState, MatchLevel } from '../core/state'
import { dataset } from '../data'
import { PaletteTray } from './PaletteTray'
import { PlateCard } from './PlateCard'
import { ShadePicker } from './ShadePicker'
import { SuggestionList } from './SuggestionList'

const MATCH_SIZES = new Set<2 | 3 | 4>([2, 3, 4])
const LEVELS: { level: MatchLevel; label: string }[] = [
  { level: 1, label: 'Shades' }, { level: 2, label: 'Families' },
]

export function MatchPage({ state, dispatch }: { state: AppState; dispatch: (a: Action) => void }) {
  const { level, keys } = state.palette
  function switchLevel(to: MatchLevel) {
    if (to === level) return
    dispatch({ type: 'setMatchLevel', level: to, keys: remapKeysToLevel(dataset, keys, level, to) })
  }
  const suggestions = keys.length ? suggestPartners(dataset, level, keys, MATCH_SIZES) : []
  const combos = keys.length ? combosForSet(dataset, level, keys, MATCH_SIZES) : []
  return (
    <div className="match-view">
      <div className="match-head">
        <h1>Build a palette</h1>
        <div className="level" role="radiogroup" aria-label="Matching level">
          {LEVELS.map(({ level: lv, label }) => (
            <button key={lv} role="radio" aria-checked={level === lv} onClick={() => switchLevel(lv)}>{label}</button>
          ))}
        </div>
      </div>
      <p className="lede">Start from a shade you have and see what it goes with; add more shades to build an
        outfit of three, four, or more. Colors don't have to match exactly.</p>
      {keys.length === 0 ? (
        <ShadePicker level={level} dispatch={dispatch} />
      ) : (
        <>
          <PaletteTray keys={keys} dispatch={dispatch} />
          <div className="match-cols">
            <section>
              <h2 className="seclabel">Add a shade <span className="q">— goes with everything above</span></h2>
              <SuggestionList suggestions={suggestions} dispatch={dispatch} />
              {suggestions.length === 0 &&
                <p className="empty-note">Nothing in the book pairs with all of these — try removing a shade.</p>}
            </section>
            <section>
              <h2 className="seclabel">The book pairs these <span className="q">— {combos.length} palette{combos.length === 1 ? '' : 's'}</span></h2>
              <div className="plate-list">
                {combos.slice(0, 12).map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add the Match tab** — in `src/components/Header.tsx`, add after the Browse button:

```tsx
        <button aria-pressed={state.view === 'match'} onClick={() => dispatch({ type: 'setView', view: 'match' })}>Match</button>
```

- [ ] **Step 6: Render the match view** — in `src/App.tsx`, add `import { MatchPage } from './components/MatchPage'`, and change the view ternary to:

```tsx
        {state.view === 'wheel' ? (
          <div className="wheel-view">
            <ChordWheel state={state} dispatch={dispatch} />
            <WheelControls state={state} dispatch={dispatch} />
          </div>
        ) : state.view === 'browse' ? (
          <BrowseView state={state} dispatch={dispatch} />
        ) : (
          <MatchPage state={state} dispatch={dispatch} />
        )}
```

- [ ] **Step 7: Add styles** — append to `src/styles/app.css`:

```css
/* Match page */
.match-view { height: 100%; overflow-y: auto; padding: var(--s6) var(--s8) var(--s12); }
.match-head { display: flex; align-items: center; justify-content: space-between; gap: var(--s4); flex-wrap: wrap; }
.match-head h1 { font-family: var(--font-display); font-weight: 500; font-size: 1.6rem; }
.match-view .lede { color: var(--ink-muted); font-size: 0.9rem; margin-top: var(--s2); max-width: 80ch; }
.match-view .level { display: inline-flex; gap: var(--s2); }
.match-view .level button {
  font-family: var(--font-ui); font-size: 0.72rem; letter-spacing: var(--tracking-label);
  text-transform: uppercase; color: var(--ink-muted); background: none;
  border: 1px solid var(--hairline); border-radius: 20px; padding: var(--s1) var(--s3); cursor: pointer;
}
.match-view .level button[aria-checked='true'] { color: var(--ink); border-color: var(--accent); background: var(--paper-1); }
.match-view .seclabel {
  font-size: 0.72rem; letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--ink-muted);
  padding-bottom: var(--s2); border-bottom: 1px solid var(--hairline); margin: var(--s6) 0 var(--s3);
}
.match-view .seclabel .q { color: var(--ink-faint); text-transform: none; letter-spacing: normal; font-style: italic; }
.tray { margin-top: var(--s6); border: 1px solid var(--hairline); border-radius: 8px; background: var(--paper-1); padding: var(--s4); }
.tray .lab { font-size: 0.7rem; letter-spacing: var(--tracking-label); text-transform: uppercase; color: var(--ink-muted); }
.chips { display: flex; gap: var(--s3); flex-wrap: wrap; margin-top: var(--s3); }
.chip { border: 1px solid var(--hairline); border-radius: 6px; background: var(--paper-1); padding: var(--s2); min-width: 108px; }
.chip .cl, .sug .cl, .partner .cl { display: flex; height: 22px; border-radius: 3px; overflow: hidden; }
.chip .cl span, .sug .cl span, .partner .cl span { flex: 1; }
.chip .row { display: flex; align-items: center; justify-content: space-between; gap: var(--s2); margin-top: var(--s2); }
.chip .nm { font-size: 0.82rem; font-weight: 700; }
.chip .x { background: none; border: none; color: var(--ink-faint); cursor: pointer; font-size: 1rem; }
.chip .x:hover { color: var(--accent); }
.match-cols { display: grid; grid-template-columns: 1.1fr 1fr; gap: var(--s6); align-items: start; }
.sugs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s2); }
.sug { display: flex; align-items: center; gap: var(--s3); border: 1px solid var(--hairline); border-radius: 6px; background: var(--paper-1); padding: var(--s2) var(--s3); cursor: pointer; text-align: left; }
.sug:hover { border-color: var(--accent); }
.sug .cl { width: 56px; flex: 0 0 auto; }
.sug .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sug .nm { font-size: 0.86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sug .sc { font-size: 0.68rem; color: var(--ink-muted); }
.sug .plus { width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--hairline); display: flex; align-items: center; justify-content: center; color: var(--ink-muted); flex: 0 0 auto; }
.sug:hover .plus { border-color: var(--accent); color: var(--accent); }
.picker { margin-top: var(--s6); }
.picker-input { font-family: var(--font-ui); font-size: 0.9rem; color: var(--ink); background: none; border: none; border-bottom: 1px solid var(--hairline); padding: var(--s2); width: 260px; max-width: 100%; margin-bottom: var(--s4); }
.picker-input:focus { outline: none; border-bottom-color: var(--accent); }
@media (max-width: 820px) { .match-cols { grid-template-columns: 1fr; } .sugs { grid-template-columns: 1fr; } }
```

- [ ] **Step 8: Extend the smoke test** — add to `tests/appSmoke.test.tsx` (merge imports; add inside the existing describe):

```tsx
import { MatchPage } from '../src/components/MatchPage'

it('match page shows the picker when empty and suggestions when seeded', () => {
  const empty = { ...initialState, view: 'match' as const }
  expect(renderToString(<MatchPage state={empty} dispatch={() => {}} />)).toContain('Pick a shade')

  const olives = dataset.data.groups.fine.find((g) => g.name === 'Olives')!.id
  const seeded = { ...initialState, view: 'match' as const, palette: { level: 1 as const, keys: [olives] } }
  const html = renderToString(<MatchPage state={seeded} dispatch={() => {}} />)
  expect(html).toContain('Your palette')
  expect(html).toContain('Build a palette')
})
```

(If `dataset` and `initialState` aren't already imported in the test file, add `import { dataset } from '../src/data'` and ensure `initialState` is imported from `../src/core/state`.)

- [ ] **Step 9: Verify**

Run: `make test` and `npx tsc --noEmit` and `make build`
Expected: all green. Then `make dev`: the header shows a **Match** tab; clicking it shows the shade picker; searching "olive" and clicking Olives shows the palette tray, ranked suggestions (Deep Teals, Russets…), and book palettes; adding a suggestion grows the palette and narrows suggestions; removing backtracks; the Shades/Families toggle switches level (Families→Shades clears with the palette emptying). Stop the server. (Interactive parts beyond render go on the owner checklist.)

- [ ] **Step 10: Commit**

```bash
git add src/components/MatchPage.tsx src/components/PaletteTray.tsx src/components/SuggestionList.tsx src/components/ShadePicker.tsx src/components/Header.tsx src/App.tsx src/styles/app.css tests/appSmoke.test.tsx
git commit -m "feat: Match page — multi-shade outfit builder with suggestions and book palettes"
```

---

### Task 4: Enriched GroupDetail panel (breadcrumb, narrow-to, matches, bridge)

**Files:**
- Create: `src/components/GroupMatches.tsx`
- Modify: `src/components/GroupDetail.tsx`, `src/styles/app.css`
- Test: `tests/appSmoke.test.tsx`

**Interfaces:**
- Consumes: `breadcrumbOf`, `childGroupsOf`, `levelOfGroupKey`, `suggestPartners`, `combosForSet` (Task 1); `seedPalette` action (Task 2); `groupMembers`; `PlateCard`, `Panel`, `dataset`.
- Produces: an enriched `GroupDetail` and a `GroupMatches` child.

- [ ] **Step 1: Create `src/components/GroupMatches.tsx`**

```tsx
import { groupMembers } from '../core/dataset'
import { combosForSet, levelOfGroupKey, suggestPartners } from '../core/matching'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { PlateCard } from './PlateCard'

const ALL_SIZES = new Set<2 | 3 | 4>([2, 3, 4])

export function GroupMatches({ groupId, dispatch }: { groupId: string; dispatch: (a: Action) => void }) {
  const level = levelOfGroupKey(dataset, groupId)
  const partners = suggestPartners(dataset, level, [groupId], ALL_SIZES).slice(0, 6)
  const palettes = combosForSet(dataset, level, [groupId], ALL_SIZES).slice(0, 4)
  return (
    <>
      <h3>Pairs well with</h3>
      <div className="partner-list">
        {partners.map((p) => (
          <button key={p.key} className="partner"
            onClick={() => dispatch({ type: 'select', selection: { kind: 'ribbon', level, keyA: groupId, keyB: p.key } })}>
            <span className="cl">
              {groupMembers(dataset, p.key).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
            </span>
            <span className="nm">{dataset.groupById.get(p.key)!.name}</span>
            <span className="ct">{p.score}</span>
          </button>
        ))}
      </div>
      {palettes.length > 0 && (
        <>
          <h3>Palettes with a {dataset.groupById.get(groupId)!.name.toLowerCase()} color</h3>
          <div className="plate-list">
            {palettes.map((c) => <PlateCard key={c.id} comboId={c.id} dispatch={dispatch} />)}
          </div>
        </>
      )}
    </>
  )
}
```

- [ ] **Step 2: Rewrite `src/components/GroupDetail.tsx`**

```tsx
import { groupMembers } from '../core/dataset'
import { breadcrumbOf, childGroupsOf, levelOfGroupKey } from '../core/matching'
import type { Action } from '../core/state'
import { dataset } from '../data'
import { GroupMatches } from './GroupMatches'
import { Panel } from './Panel'

export function GroupDetail({ groupId, dispatch }: { groupId: string; dispatch: (a: Action) => void }) {
  const g = dataset.groupById.get(groupId)!
  const level = levelOfGroupKey(dataset, groupId)
  const crumbs = breadcrumbOf(dataset, groupId)
  const children = childGroupsOf(dataset, groupId)
  const members = groupMembers(dataset, groupId)
  return (
    <Panel title={g.name} onClose={() => dispatch({ type: 'closePanel' })}>
      <nav className="crumb" aria-label="Group hierarchy">
        {crumbs.map((c, i) => (
          <span key={c.id}>
            {i > 0 && <span className="sep">›</span>}
            {c.id === groupId
              ? <span className="here">{c.name}</span>
              : <button className="linklike"
                  onClick={() => dispatch({ type: 'select', selection: { kind: 'group', id: c.id } })}>{c.name}</button>}
          </span>
        ))}
      </nav>

      <GroupMatches groupId={groupId} dispatch={dispatch} />

      {(level === 1 || level === 2) && (
        <button className="bridge"
          onClick={() => dispatch({ type: 'seedPalette', key: groupId, level: level as 1 | 2 })}>
          Build a palette from this →
        </button>
      )}

      {children.length > 0 ? (
        <>
          <h3>Narrow to a shade</h3>
          <div className="partner-list">
            {children.map((ch) => (
              <button key={ch.id} className="partner"
                onClick={() => dispatch({ type: 'select', selection: { kind: 'group', id: ch.id } })}>
                <span className="cl">
                  {groupMembers(dataset, ch.id).map((c) => <span key={c.id} style={{ background: c.hex }} />)}
                </span>
                <span className="nm">{ch.name}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h3>Narrow to a single color</h3>
          <div className="swatch-grid">
            {members.map((c) => (
              <button key={c.id} className="swatch-cell" style={{ background: c.hex }} title={c.name} aria-label={c.name}
                onClick={() => dispatch({ type: 'select', selection: { kind: 'color', id: c.id } })} />
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}
```

Note: `level` is `1 | 2 | 3` from `levelOfGroupKey`; the `(level === 1 || level === 2)` guard narrows it to `MatchLevel` for `seedPalette`.

- [ ] **Step 3: Add styles** — append to `src/styles/app.css`:

```css
/* Enriched group panel */
.crumb { font-size: 0.72rem; letter-spacing: 0.04em; color: var(--ink-muted); margin-bottom: var(--s3); }
.crumb .sep { color: var(--ink-faint); margin: 0 var(--s1); }
.crumb .here { color: var(--ink); font-weight: 700; }
.partner-list { display: flex; flex-direction: column; gap: var(--s1); margin-top: var(--s2); }
.partner { display: flex; align-items: center; gap: var(--s3); border: 1px solid transparent; border-radius: 5px; background: none; padding: var(--s2); cursor: pointer; text-align: left; width: 100%; }
.partner:hover { background: var(--paper-2); border-color: var(--hairline); }
.partner .cl { width: 74px; height: 20px; flex: 0 0 auto; }
.partner .nm { flex: 1; font-size: 0.9rem; }
.partner .ct { font-size: 0.72rem; color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.bridge { display: block; width: 100%; margin: var(--s6) 0 0; border: 1px solid var(--accent); border-radius: var(--radius); background: none; color: var(--ink); font-family: var(--font-ui); font-size: 0.85rem; padding: var(--s3); cursor: pointer; }
.bridge:hover { background: var(--paper-2); }
```

- [ ] **Step 4: Extend the smoke test** — add to `tests/appSmoke.test.tsx`:

```tsx
import { GroupDetail } from '../src/components/GroupDetail'

it('group panel shows breadcrumb, matches, and narrow-to for a shade', () => {
  const olives = dataset.data.groups.fine.find((g) => g.name === 'Olives')!.id
  const html = renderToString(<GroupDetail groupId={olives} dispatch={() => {}} />)
  expect(html).toContain('Pairs well with')
  expect(html).toContain('Build a palette from this')
  expect(html).toContain('Narrow to a single color')
})
```

- [ ] **Step 5: Verify**

Run: `make test`, `npx tsc --noEmit`, `make build`
Expected: green. Then `make dev`: on the wheel at a group level, clicking a group opens the panel with a breadcrumb, "Pairs well with" partners (clicking one opens the pair's palettes), preview palettes, a "Build a palette from this →" button (opens the Match page seeded with the group), and "Narrow to a shade" (broad/super) or "Narrow to a single color" (shade). Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/components/GroupMatches.tsx src/components/GroupDetail.tsx src/styles/app.css tests/appSmoke.test.tsx
git commit -m "feat: enriched group panel with breadcrumb, matches, narrow-to, and Match bridge"
```

---

### Task 5: Documentation true-up

**Files:**
- Modify: `README.md`, `PROMPTS.md`, `TODO.md`, `src/components/AboutPanel.tsx`

- [ ] **Step 1: README** — in the commands/overview, add the Match view. In "How this project is organized" (or the feature list), add a bullet:

```markdown
- **Match** (header tab) — build an outfit palette: start from a shade, see
  what the book pairs it with, and add more shades to make a 3-, 4-, or
  more-color set. General shade-level matching, so colors don't have to be
  exact. Also reachable from any group on the wheel via "Build a palette from
  this →".
```

- [ ] **Step 2: About panel copy** — in `src/components/AboutPanel.tsx`, add a recipe (place after the "Build around what you own" section, keeping the existing prose verbatim):

```tsx
      <h3>Build an outfit of several colors</h3>
      <p>
        Open <strong>Match</strong>, start from a shade you own (say Olives), and
        add shades it goes with — Deep Teals, Tans, Russets — to build a palette
        of three or more. A <em>★ book-verified</em> suggestion means Sanzo Wada
        actually used all of them together; the rest still pair with each shade
        you've chosen, which is what makes it wardrobe-friendly.
      </p>
```

- [ ] **Step 3: PROMPTS.md** — append a session entry:

```markdown
## 2026-07-20 — Session 4: Color matching & outfit builder

**Owner prompt (kickoff):** improve the outfit-matching persona — when working
on a group (shades/families/groups) show the matching colors, and allow going
from general and slowly drilling down without jumping straight to a single
color ("we're skipping a bit too many steps").

**Decisions (see the spec's decisions log):** panel shows ranked partners AND
palettes; progressive narrowing within the panel (breadcrumb + sub-groups);
**keep the enriched panel AND add a new Match page**; the Match page combines a
pivot explorer with an outfit builder and supports **more than two colors**;
build from shades (exact-color pinning deferred); Match levels are Shades and
Families; a "Build a palette from this →" bridge seeds the page from a group.

> "i do like the ability where i can still click on a single shade… but i need
> a way to go from general and slowly drill down without drilling down to a
> single color."
>
> "i like a combination of pivot + outfit builder. the goal is to be able to
> pick colors and be able to pick more than 2 colors."
>
> "i do like the preview you also suggested earlier as well in the sidebar…
> the new page here is just a more detailed way to build a color set as well."

**Spec:** `docs/superpowers/specs/2026-07-20-color-matching-and-outfit-builder-design.md`
**Plan:** `docs/superpowers/plans/2026-07-20-color-matching-and-outfit-builder.md`
```

- [ ] **Step 4: TODO.md** — add the deferred items under the existing list:

```markdown
- [ ] Match page: pin an exact color per shade in a built palette (build is
      shade-level today)
- [ ] Match page: save / name / export a built outfit palette
- [ ] Match page: super-group (Groups) level (currently Shades + Families only)
- [ ] Seed the Match page from a detected shade (photo → shade → land here) —
      depends on the nearest-color/photo work already in this list
```

- [ ] **Step 5: Verify docs match reality**

Run: `make test`, `npx tsc --noEmit`, `make build`
Expected: green. Skim README/About wording against the shipped UI (tab label "Match", button text "Build a palette from this →", "★ book-verified").

- [ ] **Step 6: Commit**

```bash
git add README.md PROMPTS.md TODO.md src/components/AboutPanel.tsx
git commit -m "docs: document the Match view and outfit-builder feature"
```

---

## Self-Review Checklist (completed by plan author)

- **Spec coverage:** engine `suggestPartners`/`combosForSet` + helpers (T1); state palette + match view + actions (T2); Match page tray/suggestions/picker/level-toggle/empty-state + Header tab (T3); enriched panel breadcrumb/narrow-to/pairs-well-with/preview-palettes/bridge (T4); docs + About recipe (T5). Matching-ignores-size-chips, ranking, level-switch rule, book-verified all in T1 tests. Deferred items → TODO (T5).
- **Placeholder scan:** none — every step has real code or exact commands.
- **Type consistency:** `PartnerSuggestion`, `MatchLevel`, `GroupLevel`, action names (`seedPalette`/`addToPalette`/`removeFromPalette`/`setMatchLevel`/`clearPalette`), and `dataset`/`groupMembers`/`PlateCard` usage checked against the real signatures read from `dataset.ts`, `state.ts`, `App.tsx`, `Header.tsx`.
```
