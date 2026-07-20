# Design: Color Matching & Outfit Builder

**Date:** 2026-07-20
**Status:** Approved pending user review of this document
**Builds on:** the v1 explorer (`2026-07-19-color-combinations-explorer-design.md`)

## Purpose

Serve the outfit-matching persona better. Today, to find what goes with a
color you must click a single color and read its combinations — even when you
are thinking at the level of "I have an olive-green thing, what general colors
go with it?" The wheel's group levels (shades / families / groups) already
express that generality, but clicking a group only lists its member colors; it
says nothing about what the group *matches*, so you are forced down to a single
color and skip the useful middle.

This feature adds group-level matching and multi-color palette building, so a
user can start general and drill down progressively, and can assemble an outfit
of three, four, or more shades. It is explicitly wardrobe-oriented: matching is
by shade, not exact color, because clothes never match a 1930s swatch exactly.

It also lays the groundwork for a later stretch goal (photo of a garment →
detected shade → land in the builder), without implementing that detection now.

## Motivating user stories

- "I have an olive-green item. What general colors go with olives?" → see that
  Olives pair with Deep Teals, Russets, Tans… without picking a single color.
- "Start general, narrow slowly." → Green (family) → Olives (shade) → optionally
  a single color, seeing matches at each stop.
- "Build a coordinated outfit of more than two colors." → add Olives, then Deep
  Teals, then a third shade the page says goes with both — grounded in real book
  palettes where they exist, looser where they don't.

## Three layers

The feature is one matching engine surfaced two ways: a quick in-place preview
(the sidebar panel) and a detailed builder (a new page). Rendered mockups are
preserved alongside this spec — open in a browser:

- `docs/superpowers/specs/2026-07-20-match-group-panel-mockup.html` — enriched
  group panel (preview).
- `docs/superpowers/specs/2026-07-20-match-page-mockup.html` — the Match page
  (builder).

### Layer 1 — Matching engine (pure core, `src/core/`)

Two new pure functions, built on the existing `ancestorAtLevel`,
`displayableCombinations`, and `sizeBucket`. The engine works at a granularity
level `L` (Shades = 1 / Families = 2 in this feature) and a set of group keys.

```ts
export interface PartnerSuggestion {
  key: string          // partner group id at level L
  score: number        // strength: total co-occurrences across the set
  bookVerified: boolean // a real book palette contains the whole set + this key
}

// Ranked shades that co-occur in the book with EVERY key in setKeys.
// setKeys of length 1 → "what pairs with this group" (pivot / panel).
// setKeys of length >1 → "what pairs with the whole palette" (builder).
// Excludes keys already in setKeys. Ranked bookVerified-first, then by score.
export function suggestPartners(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[],
  sizes: ReadonlySet<SizeBucket>,
): PartnerSuggestion[]

// Displayable book combinations whose group-key set (at level L) is a superset
// of setKeys. Sorted by size ascending, then id. Powers both surfaces' plates.
export function combosForSet(
  ix: Indexed, level: GranularityLevel, setKeys: readonly string[],
  sizes: ReadonlySet<SizeBucket>,
): CombinationRecord[]
```

**Matching semantics (decided):**
- A candidate qualifies as a suggestion if it co-occurs (shares ≥1 displayable
  combination at level L) with *every* key already in the set — the multi-color
  "goes with all" rule. Verified against real data during brainstorming: for
  {Olives, Deep Teals} this yields Sunny Yellows, Russets, Tangerines, Leaf
  Greens, Blush Pinks, Deep Blues.
- `score` = sum of the candidate's pairwise co-occurrence counts with each set
  key (higher = stronger). Ties broken by book-verified, then by group display
  order for determinism.
- `bookVerified` = there exists a displayable combination whose level-L key set
  ⊇ (setKeys ∪ {candidate}). These are shown first and badged; the rest are the
  looser, wardrobe-friendly suggestions.
- Empty `setKeys` → both functions return empty (the UI shows a picker instead).

**Size filter (decided):** matching always runs over all size buckets
`{2, 3, 4}`, independent of the wheel's size chips. Outfit building should not
be silently constrained by a filter set on another view. (The superset rule in
`combosForSet` already implies a palette of N shades only matches combos of
size ≥ N — that is inherent, not a size-chip setting.)

### Layer 2 — Enriched GroupDetail panel (quick preview)

The existing side panel keeps its member swatches and gains, in order:

- **Breadcrumb** of the group's ancestors (e.g. Cool › Green › Olives). Each
  ancestor is a button that selects that group (steps up). Built from
  `broadOfFine` / `superOfBroad`.
- **Narrow to** — progressive general→specific:
  - super or broad group → a row of its child sub-groups (Green → Olives, Olive
    Greens, Spring Greens, Leaf Greens), each a mini color cluster; clicking
    selects that narrower group (its own GroupDetail).
  - shade (fine) group → the existing member-color swatches, framed as "narrow
    to a single color" (leads to the single-color view — unchanged).
- **Pairs well with** — `suggestPartners(level, [thisGroupKey], sizes)` rendered
  as ranked partner rows (mini cluster + name + palette count). Clicking a
  partner dispatches a `ribbon` selection `{ level, keyA: thisKey, keyB: partnerKey }`,
  reusing the existing `RibbonDetail` (the pair's palettes) — no new component.
- **Preview palettes** — the first few `combosForSet(level, [thisGroupKey], sizes)`
  as `PlateCard`s.
- **"Build a palette from this →"** button — seeds the Match palette with this
  group and switches to the Match view.

The panel needs no new persistent state: breadcrumb, narrow-to, and partner
clicks all go through the existing `selection` mechanism. The group's level is
derived from which group list it belongs to (fine/broad/super).

### Layer 3 — Match page (detailed builder)

A new top-level view, reached from a **Match** tab in the header (beside Wheel
and Browse) and from the panel's bridge button. Full page, mockup-faithful:

- **Your palette** — the multi-shade tray: a chip per chosen shade (color
  cluster + name + remove), plus an "add" affordance. Holds 1..n shades.
- **Add a shade** — `suggestPartners(level, palette.keys, sizes)` as ranked
  chips; book-verified badged and first; each has a "+" to add it to the tray.
- **The book pairs these** — `combosForSet(level, palette.keys, sizes)` as
  `PlateCard`s (real multi-color palettes matching the current set).
- **Level toggle** — Shades (fine) / Families (broad) only; defaults to Shades.
  (Individual colors and super-groups are out of range for this page.)
- **Empty state** — when the palette has no shades, a searchable shade picker to
  seed the first one (also the fresh-start entry point).

Behavior: one shade in the tray reads as the pivot explorer (its partners); as
shades are added, suggestions narrow to what fits all of them (the builder).
Removing a chip backtracks. Same code path throughout.

## State & data flow

App state (one serializable object, per the architecture rules) gains:

```ts
view: 'wheel' | 'browse' | 'match'
palette: { level: 1 | 2; keys: string[] }   // Shades=1, Families=2; keys ordered as added
```

New reducer actions (all pure, keeping state serializable):
`setView('match')`, `seedPalette(key, level)` (clear + set one), `addToPalette(key)`,
`removeFromPalette(key)`, `setMatchLevel(level)` (re-express existing keys at the
new level — see Edge cases), `clearPalette`.

Flow: an add/remove updates `palette.keys` → `MatchPage` recomputes
`suggestPartners` and `combosForSet` from `dataset` → suggestions and plates
re-render. No runtime fetching; all from the bundled processed data.

## Components

- `src/core/matching.ts` — `suggestPartners`, `combosForSet`, and any small
  helpers (e.g. a group's level, a combination's level-L key set). Pure.
- `src/components/MatchPage.tsx` — orchestrates palette state → children.
- `src/components/PaletteTray.tsx` — the chosen-shade chips + remove + add.
- `src/components/SuggestionList.tsx` — ranked suggestion chips with add.
- `src/components/ShadePicker.tsx` — empty-state searchable group picker.
- `src/components/GroupDetail.tsx` — extended with breadcrumb, narrow-to,
  pairs-well-with, preview palettes, bridge button. If it grows unwieldy, split
  the matching section into a small `GroupMatches.tsx` child.
- Reuse `PlateCard` (palettes) and `RibbonDetail` (pair palettes from the panel).
- `Header.tsx` — add the Match tab. `src/styles/app.css` — Match/panel sections.

## Edge cases

- **Empty palette:** engine returns empty; Match page shows the picker; the
  bridge button always seeds one key so the page never opens empty from the wheel.
- **No suggestions** (a set nothing pairs with across the book): show an honest
  "nothing in the book pairs with all of these — try removing a shade" note.
- **Level switch with a non-empty palette:** going coarser (Shades→Families)
  maps each shade to its parent family (dedupe); going finer (Families→Shades)
  cannot uniquely pick a shade, so switching to a finer level **clears the
  palette** with a one-line notice. Keep this rule explicit and simple.
- **Duplicate add:** adding a key already in the palette is a no-op.
- **Groups quirk colors:** unaffected — matching runs on displayable combos only
  (the 10 one-color quirks stay excluded), consistent with the rest of the app.

## Testing

- **Engine (TDD, pure):** `suggestPartners` and `combosForSet` against the mini
  fixture and the real processed data — e.g. single-key partners equal the known
  ranking; multi-key "goes with all" excludes non-common partners; book-verified
  flag is true exactly when a superset combo exists; empty set → empty; results
  deterministic.
- **Reducer (TDD):** palette add/remove/seed/clear, level-switch clearing rule,
  duplicate-add no-op, state stays JSON-serializable, view switching.
- **UI:** `renderToString` smoke tests for `MatchPage` (seeded), `PaletteTray`,
  `SuggestionList`, and the enriched `GroupDetail`; interactive behavior
  (add/remove, bridge navigation, breadcrumb) on the owner's browser checklist.

## Documentation contract

Per CLAUDE.md, in the same commits: README (new Match view + how to use it,
for a non-JS reader), PROMPTS.md (this session's prompts and decisions),
CLAUDE.md if architecture notes change, and the About panel copy (add a short
"build an outfit" recipe pointing at the Match page). TODO ledger updated.

## Out of scope for this feature (→ TODO.md)

- Pinning an exact color per shade in the palette (build stays shade-level).
- Saving / naming / exporting a built outfit palette (export exists per-combo).
- The photo→shade detection itself (this feature is only its landing spot).
- Shareable deep links (state is serializable and ready, but not wired now).
- Super-group (Groups) level on the Match page.

## Decisions log (brainstorming answers)

| Question | Decision |
|---|---|
| Panel match view | Both ranked partners **and** palettes |
| Progressive drill | Narrow within the panel (breadcrumb + sub-groups), general→specific |
| Where matching lives | Keep the enriched **panel** (quick preview) **and** add a new **Match page** (detailed builder) |
| Match page interaction | Combined pivot + outfit builder; supports **more than two colors** |
| Building unit | Shades (general, wardrobe-friendly); exact-color pinning deferred |
| Match levels | Shades and Families only; default Shades |
| Bridge | GroupDetail "Build a palette from this →" seeds the Match page |
