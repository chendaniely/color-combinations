# Accessibility Goggles — Design Spec

**Date:** 2026-07-21
**Status:** Approved (owner sign-off 2026-07-21)
**Feature:** Composable accessibility filters ("goggles") over the loaded
combination set, shared across the Wheel, Browse, and Match views.

## 1. Goal

Let a user overlay one or more **accessibility "goggles"** on the site's
color combinations to see only the combinations that meet a chosen
accessibility bar — e.g. "show me only combinations that are color-blind
safe" or "…that are both web-text-ready and survive a black-and-white
photocopy." The goggles are a **filter**, composable and multi-select, in
the exact spirit of the existing 2/3/4-color size chips. They do **not**
swap the underlying dataset and do **not** change the color universe or the
wheel's arcs — only which ribbons/plates/suggestions are shown.

## 2. Origin & framing decision

This started as a "pick the underlying dataset" dropdown idea (original vs. a
WCAG-filtered dataset). During brainstorming the owner reframed it: these
accessibility checks are better modeled as **filters on the current dataset**
("goggles"), like the size chips — not as separate datasets. That retires the
dataset-registry / dataset-swap approach entirely. A future "genuinely
different color book" dataset selector remains a separate, unbuilt concern
(see Deferred).

## 3. The three lenses (v1)

Each lens is a pure predicate over the hex colors of one combination. WCAG
contrast is computed from grayscale luminance, so the "Print & B&W safe" lens
is literally the grayscale-distinguishable set — the honest version of
"print-friendly" (a true CMYK soft-proof needs an ICC profile we do not have
and is deliberately out of scope).

| Id | Label | Rule | Plain-words claim |
|---|---|---|---|
| `web-text` | **Web text-ready** | `max` pairwise WCAG contrast ≥ **4.5:1** (AA normal text) | "At least one pair works as readable text on a background." |
| `print-bw` | **Print & B&W safe** | `min` pairwise WCAG contrast ≥ **3:1** | "Every color stays tellable apart in grayscale / a photocopy." |
| `colorblind` | **Color-blind safe** | `min` pairwise OKLab ΔE ≥ **0.10** after simulating **protanopia** and **deuteranopia** (severity 1) | "Colors stay distinct for red-green color blindness." |

**Thresholds are a single tunable seam.** `WCAG_AA_TEXT = 4.5`,
`WCAG_NONTEXT = 3`, `CVD_THRESHOLD = 0.10` are named constants in one file, in
the same swappable spirit as the color-distance metric. Adding a future lens
(APCA/WCAG-3, a tritan option, etc.) = one registry entry + one id.

### Reference survivor counts (current data, 338 displayable combos)

Used to sanity-check the implementation and pin a full-dataset regression
test. Numbers are data-derived (regenerate if the dataset or culori changes).

- `web-text`: **150** (44%)
- `print-bw`: **57** (17%) — 55 of 57 are 2-color combos
- `colorblind`: **225** (67%)
- AND `web-text` + `colorblind`: **103**
- AND `web-text` + `print-bw`: **36**
- AND `print-bw` + `colorblind`: **57** (every B&W-safe combo is also CVD-safe)
- AND all three: **36**
- OR all three: **272** (80%) — why OR is rejected below

## 4. Composition: AND (stacking)

Selecting multiple goggles yields the **intersection** — a combination is
shown only if it passes **every** selected lens. Rationale: goggles are
independent constraints you stack; OR would make "all three on" show 80% of
combos (barely a filter), while AND narrows to a meaningful 36. This is
intentionally different from the size chips, which are OR *within a single
dimension* ("show sizes 2 **or** 3"). **Empty selection = no filter** (all
combinations, today's behavior).

## 5. Architecture

Keeps every repo rule intact: `src/core/` stays a dependency-free pure
kernel; culori stays confined to `src/color/`; every design token in
`tokens.css`; the docs contract is honored.

### 5.1 New: `src/color/accessibility.ts` (culori lives here, never in core)

```ts
import type { Indexed } from '../core/dataset'
import type { AccessLensId } from '../core/types'

export const WCAG_AA_TEXT = 4.5
export const WCAG_NONTEXT = 3
export const CVD_THRESHOLD = 0.10   // the tunable knob

export interface Lens {
  id: AccessLensId
  label: string          // UI label, e.g. "Web text-ready"
  description: string    // one-line plain-words claim
  passes: (hexes: string[]) => boolean
}

export const LENSES: Lens[]  // order = display order in the control

// Computed ONCE from the loaded dataset (memoized in src/data.ts).
// Maps each displayable combination id -> the set of lenses it passes.
export function accessibilityProfile(ix: Indexed): Map<number, Set<AccessLensId>>

// AND semantics over a NON-empty active list. Returns the set of combo ids
// that pass every active lens. Callers only invoke this when active.length > 0;
// an empty active list means "no filter" and is handled by the caller.
export function allowedComboIds(
  profile: Map<number, Set<AccessLensId>>,
  active: AccessLensId[],
): Set<number>
```

- `passes` operates on the combination's hex strings; it computes pairwise
  WCAG contrast (`wcagContrast`), and for `colorblind` the pairwise OKLab
  distance (`differenceEuclidean('oklab')`) of colors run through
  `filterDeficiencyProt(1)` and `filterDeficiencyDeuter(1)`.
- `accessibilityProfile` iterates `displayableCombinations(ix)` only.
- Memoization/wiring lives in the app glue layer (`src/data.ts`), keeping
  `accessibilityProfile` a pure function of its argument.

### 5.2 `src/color/culori.d.ts`

Extend the existing shim to declare the additional culori functions used:
`wcagContrast`, `filterDeficiencyProt`, `filterDeficiencyDeuter`
(`differenceEuclidean` is already declared for `colorDistance`). This is more
of the same dependency, not a new one — culori is still used only in
`src/color/`.

### 5.3 `src/core/types.ts`

Add the pure lens-id union (no culori — just a string union, safe in core):

```ts
export type AccessLensId = 'web-text' | 'print-bw' | 'colorblind'
```

Core defines the **set of valid ids** (part of the serializable state
contract); `src/color` defines **what each id means** (the predicate).

### 5.4 `src/core/state.ts`

- `AppState.access: AccessLensId[]` — active lenses; **default `[]`**.
- Action `{ type: 'toggleAccess'; id: AccessLensId }` + reducer case,
  mirroring `toggleSize` (add if absent, remove if present; no "at least one"
  floor — empty is a valid, meaningful state = no filter).

### 5.5 Core filter seam (stays pure — receives a `Set<number>`)

Thread an optional `allowed?: ReadonlySet<number>` through every function that
enumerates combinations. Semantics: `if (allowed && !allowed.has(combo.id))
skip`. `undefined` = no filter.

- `src/core/chord.ts`: `chordMatrix(ix, level, sizes, allowed?)`,
  `combosForPair(ix, level, keyA, keyB, sizes, allowed?)`.
- `src/core/matching.ts`: internal `filtered(ix, sizes, allowed?)` (the
  chokepoint), and its callers `combosForSet(...)` and `suggestPartners(...)`
  gain the `allowed?` param.
- `src/components/BrowseView.tsx`: extend its inline predicate with the
  `allowed` check.

A `Set<number>` is not culori, so `core-purity.test.ts` is unaffected and is
**not** weakened.

### 5.6 App glue: `src/data.ts`

```ts
export const accessProfile = accessibilityProfile(dataset)
```

Components import `accessProfile` alongside `dataset`.

### 5.7 UI: `src/components/AccessibilityGoggles.tsx`

A compact, labeled **multi-select dropdown** (selectize-style): a button
labeled "Accessibility" showing the active count (e.g. "Accessibility · 2"),
opening a small panel of the three lenses as checkable rows (label +
one-line description). Each row toggles `toggleAccess`. Reusable; rendered in
all three control areas:

- `WheelControls.tsx` (next to the size chips)
- `BrowseView.tsx` (next to its size chips)
- `MatchPage.tsx` (in its control area)

Styled entirely with `tokens.css` variables; keyboard-operable
(button + checkable options); `aria-pressed`/`role` consistent with the size
chips. No hard-coded colors.

### 5.8 Wiring `allowed` into the views

Each view computes, from `state.access` + `accessProfile`:

```ts
const allowed = state.access.length
  ? allowedComboIds(accessProfile, state.access)
  : undefined
```

and threads it into its core calls:

- **Wheel** (`ChordWheel.tsx`): into `chordMatrix(...)`; `RibbonDetail.tsx`
  into `combosForPair(...)`.
- **Browse** (`BrowseView.tsx`): into its combo predicate.
- **Match** (`MatchPage.tsx`): into `suggestPartners(...)` and
  `combosForSet(...)`.

## 6. Empty states

When active goggles hide everything in a view, show a short inline note
instead of a blank region:

- Wheel: sparse/empty ribbons are acceptable; if zero ribbons, a small
  centered note "No combinations match these goggles — loosen one."
- Browse: filtered plate list already shows a count; when zero, the same
  note.
- Match: when `suggestions.length === 0 && combos.length === 0` because of
  goggles, a note "No accessible pairings for this palette — loosen the
  goggles" (distinct from the existing empty-palette prompt).

## 7. Edge cases & decisions

- **Explicit selections are not hidden by goggles.** A user who has a
  specific color/combination selected keeps seeing its detail panel even if
  the goggles would exclude it from lists — only *enumerated lists* filter.
  This matches how the size filter can already orphan a selection; acceptable.
- **No persistence.** Goggles are ephemeral in `AppState`, like the other
  filters — consistent with the no-router / no-localStorage YAGNI rules.
  Resets on reload.
- **Switching views preserves goggles** (global state).
- 1-color combos are already `excluded` and never enter the profile.

## 8. Testing

- **TDD — `tests/accessibility.test.ts`** (unit, pure):
  - Each lens predicate on hand-built color sets with known contrast:
    `#000000`/`#ffffff` (21:1 → `web-text` and `print-bw` pass); a pair of
    close mid-greys (fails both); a red/green pair chosen to pass normal
    vision but fail `colorblind` under simulation.
  - `allowedComboIds` AND semantics (2-lens intersection ⊆ each single lens;
    passing one lens id yields exactly that lens's members).
  - Empty active handled by caller (documented; predicate never called with
    `[]`).
  - **Full-dataset regression**: `accessibilityProfile(dataset)` yields the
    §3 reference counts (150 / 57 / 225 and the AND intersections). Comment
    that these are data-derived pins.
- **TDD — `tests/state.test.ts`** (extend): `toggleAccess` add/remove;
  default `access` is `[]`.
- **Core seam tests** (extend chord/matching tests): passing a restricted
  `allowed` set reduces the ribbon matrix / `combosForSet` /
  `suggestPartners` output; `undefined` = unchanged from today.
- **renderToString smoke** (extend `appSmoke`): `<AccessibilityGoggles>`
  mounts in Wheel, Browse, and Match; app renders with a lens active.
- **Owner browser checklist**: the dropdown appears in all three views;
  stacking narrows results; active count shows; empty-state notes read right;
  toggling a lens updates the wheel/plates/suggestions live.
- `core-purity.test.ts` unchanged and unweakened; culori confined to
  `src/color/`.

## 9. Dependencies

**Zero new dependencies.** culori is already a runtime dep; we use more of its
API (`wcagContrast`, `filterDeficiencyProt`, `filterDeficiencyDeuter`) inside
`src/color/`, declared in `culori.d.ts`.

## 10. Docs contract (same commit as the code)

- **README.md** — new "Accessibility goggles" feature section for a non-JS
  reader: what the three checks mean and that they filter, not alter, the
  data; note the honest scope of "Print & B&W safe" and that CMYK
  soft-proofing is intentionally not claimed.
- **PROMPTS.md** — append this session's owner prompts verbatim + decisions.
- **TODO.md** — add deferrals (below). **TODO-completed.md** — on completion,
  with commit hashes.
- **CLAUDE.md** — note the accessibility seam lives in `src/color/` alongside
  `colorDistance`; the dependency-budget line for culori still holds (no new
  dep). Record the `AccessLensId` core type + the `allowed?` core seam.
- **Makefile** — no new target (nothing precomputed; profile is built at
  load). `make test` / `make build` must pass.

## 11. Deferred (logged so they aren't "helpfully" re-added)

- APCA / WCAG-3 perceptual-contrast lens.
- A separate tritan (blue-yellow) color-blind option, or a severity control.
- A UI control to tune `CVD_THRESHOLD` (v1 ships the constant only).
- Unifying the goggles control with the size chips into one shared filter
  bar (v1 keeps them adjacent but separate; size chips stay OR, goggles AND).
- A genuinely-different-dataset selector (a second color book) — the original
  dataset-swap idea, retired for this feature but valid future work.
- True CMYK/print soft-proofing (needs an ICC profile; deliberately excluded).
```
