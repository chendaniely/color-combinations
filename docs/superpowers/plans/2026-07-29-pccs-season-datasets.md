# PCCS Season Datasets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the twelve invented season palettes with seasons computed from PCCS — a published ruleset from the institute Sanzo Wada founded — shipped as six separate, cited, independently usable datasets.

**Architecture:** Reference data (PCCS hues, tones) is hand-transcribed from published sources and validated. A generated grid renders the PCCS structure as hex. Season rules combine a sourced temperature+tone rule (four parents) with our subdivision (twelve). Membership and fit are computed, not curated, and emitted as a committed join table. All colour maths using culori lives in `src/color/`; pure types and validation live in `src/core/`.

**Tech Stack:** TypeScript, culori (Lab/ΔE), tsx (scripts), vitest, Playwright.

## Global Constraints

- `src/core/` stays a pure kernel — relative imports only, no culori, no React, no browser globals. `tests/core-purity.test.ts` must never be weakened.
- `src/data.ts` remains the ONLY module allowed to `import` a data file. Tests may `readFileSync` the same files.
- Every dataset carries `schemaVersion`, a prose `description`, and a `sources` array of citation IDs, and is validated at load.
- Every URL in `sources.json` must return a status a human can navigate to. Link checking is opt-in (`make check-links`), never part of `make test` or CI.
- The four parent seasons are `sourced: true`; the twelve sub-seasons are `sourced: false`. Never present them as equally grounded.
- Documentation contract: `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `PROMPTS.md`, `TODO.md` update in the same commit as the behaviour they describe.
- Verify `make test` and `make build` before claiming any task complete; `make test-browser` too for any task touching CSS, layout or an overlay.

---

### Task 1: Citation registry

**Files:**
- Create: `data/reference/sources.json`
- Create: `src/core/sources.ts`
- Create: `tests/sources.test.ts`
- Modify: `Makefile` (add `check-links`)
- Create: `scripts/check-links.ts`

**Interfaces:**
- Produces: `interface Source { id: string; title: string; publisher: string; url: string; accessed: string; supports: string; botBlocked?: boolean }`, `validateSources(data: unknown): Source[]`, `SOURCES_SCHEMA_VERSION = 1`.

- [ ] **Step 1: Write the failing test** — `tests/sources.test.ts` asserts: file parses; schemaVersion is 1; every entry has non-empty `id`, `title`, `publisher`, `url`, `accessed`, `supports`; ids are unique; every `url` starts with `https://`; `accessed` matches `/^\d{4}-\d{2}-\d{2}$/`.
- [ ] **Step 2: Run it, expect failure** — `npx vitest run tests/sources.test.ts`, fails because the file does not exist.
- [ ] **Step 3: Write `data/reference/sources.json`** with the twelve verified entries from the spec's table, plus the two `botBlocked: true` entries.
- [ ] **Step 4: Write `src/core/sources.ts`** with `validateSources` following the `validateSeasons` pattern in `src/core/seasons.ts` — a `fail()` helper throwing `Invalid sources.json: ...`.
- [ ] **Step 5: Run tests, expect pass.**
- [ ] **Step 6: Add `scripts/check-links.ts`** — fetches every URL, prints `status url`, exits non-zero only on a status that is neither 2xx nor a `botBlocked` entry returning 403. Add `check-links:` target to `Makefile` and to `make help`.
- [ ] **Step 7: Commit** — `feat(data): citation registry for the colour-analysis sources`.

---

### Task 2: PCCS hues and tones

**Files:**
- Create: `data/reference/pccs-hues.json`, `data/reference/pccs-tones.json`
- Create: `src/core/pccs.ts`
- Create: `tests/pccs.test.ts`

**Interfaces:**
- Consumes: `Source` ids from Task 1.
- Produces: `interface PccsHue { n: number; abbr: string; ja: string; en: string }`, `interface PccsTone { abbr: string; ja: string; en: string; lightness: [number, number]; saturation: [number, number]; achromatic?: boolean }`, `validatePccsHues`, `validatePccsTones`, `PCCS_SCHEMA_VERSION = 1`.

- [ ] **Step 1: Write the failing test** — `tests/pccs.test.ts`:
  - 24 hues, `n` exactly 1..24 with no gaps.
  - 12 chromatic tones + 5 achromatic.
  - Every tone's `lightness` inside [1.5, 9.5] and `saturation` inside [0, 9], `lo <= hi`.
  - **No two chromatic tones share the same `(lightness, saturation)` pair** — this is the guard for the ja.wikipedia `dull`/`grayish` collision noted in the spec.
  - Every `sources` id resolves in `sources.json`.
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Write the two data files.** Hues: the 24 entries (1 pR 紫みの赤 … 24 RP 赤紫). Tones, per the tone-diagram layout in the spec:

  | abbr | lightness | saturation |
  | --- | --- | --- |
  | v | [4.5, 6.5] | [9, 9] |
  | b | [7.0, 9.5] | [7, 8] |
  | s | [4.5, 6.5] | [7, 8] |
  | dp | [1.5, 4.0] | [7, 8] |
  | lt | [7.0, 9.5] | [4, 6] |
  | sf | [5.5, 7.0] | [4, 6] |
  | d | [4.5, 6.5] | [4, 6] |
  | dk | [1.5, 4.0] | [4, 6] |
  | p | [8.0, 9.5] | [1, 3] |
  | ltg | [7.0, 8.0] | [1, 3] |
  | g | [4.5, 6.5] | [1, 3] |
  | dkg | [1.5, 4.0] | [1, 3] |

  Achromatic: W 9.5, ltGy 7.5, mGy 5.5, dkGy 3.5, Bk 1.5, all saturation [0, 0]. Record the ja.wikipedia conflict in the file's `notes`.
- [ ] **Step 4: Write `src/core/pccs.ts`** — pure validators, same `fail()` pattern.
- [ ] **Step 5: Run tests, expect pass.**
- [ ] **Step 6: Commit** — `feat(data): PCCS 24-hue circle and 12-tone system`.

---

### Task 3: Lab ↔ PCCS mapping and the rendered grid

**Files:**
- Create: `src/color/pccsMap.ts`
- Create: `scripts/build-pccs-grid.ts`
- Create: `data/reference/pccs-grid.json`
- Create: `tests/pccsMap.test.ts`
- Modify: `src/color/culori.d.ts` (declare `inGamut`)
- Modify: `package.json` (script `build-pccs-grid`), `Makefile`

**Interfaces:**
- Consumes: `PccsHue`, `PccsTone` from Task 2.
- Produces: `labToPccs(hex: string): { lightness: number; saturation: number; hue: number }`, `pccsToHex(hue: number, lightness: number, saturation: number): string`, `maxChroma(L: number, h: number): number`, `toneOf(tones: PccsTone[], hex: string): string | null`.

This is the spec's one remaining modelling judgement. Document the reasoning in the module header, not just the code.

- [ ] **Step 1: Write the failing test** — `tests/pccsMap.test.ts`:
  - `labToPccs('#000000').lightness` ≈ 1.5; `labToPccs('#ffffff').lightness` ≈ 9.5.
  - A pure saturated red (`#ff0000`) has `saturation` ≥ 8.5 (it is a vivid colour).
  - `maxChroma` at L=50 for a red hue exceeds `maxChroma` at L=95 (the gamut narrows near white).
  - `pccsToHex` round-trips: for 20 random (hue, lightness, saturation) triples inside gamut, `labToPccs(pccsToHex(...))` returns values within 0.5 of the input.
  - `toneOf('#ff0000')` returns `'v'`.
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Implement `src/color/pccsMap.ts`.**
  - `lightness = clamp(L* / 10, 1.5, 9.5)` — PCCS lightness is Munsell value, and V ≈ L\*/10.
  - `maxChroma(L, h)` — binary search the largest C where `lab(L, C, h)` is inside sRGB, 20 iterations.
  - `saturation = clamp(9 * C / maxChroma(L, h), 0, 9)`.
  - `hue` — map the Lab hue angle onto the 24-step circle.
- [ ] **Step 4: Run tests, expect pass.**
- [ ] **Step 5: Write `scripts/build-pccs-grid.ts`** — for each of 24 hues × 12 tones, take the centre of the tone's lightness and saturation band, convert with `pccsToHex`, emit `{ hue, tone, hex }`. 288 entries. `description` must state this is our rendering of the PCCS structure, not JCRI chip values.
- [ ] **Step 6: Run it, add a test** asserting 288 entries, every hex matching `/^#[0-9a-f]{6}$/`, and every (hue, tone) pair unique.
- [ ] **Step 7: Commit** — `feat(color): Lab-to-PCCS mapping and the 24x12 rendered grid`.

---

### Task 4: Season rules

**Files:**
- Create: `data/curated/season-rules.json`
- Delete: `data/curated/seasons.json`
- Rewrite: `src/core/seasons.ts`
- Modify: `tests/seasons.test.ts`
- Delete: `scripts/seed-seasons.ts`

**Interfaces:**
- Produces: `interface ParentSeason { id: string; name: string; temperature: 'warm' | 'cool'; tones: string[]; sourced: true; sources: string[] }`, `interface SubSeason { id: string; name: string; parent: string; dominantTone: string; sourced: false }`, `validateSeasonRules(data, toneAbbrs: Set<string>, sourceIds: Set<string>)`, `classifySeason(rules, reading): SeasonId` (kept), `parentOf(rules, subId): ParentSeason`.

- [ ] **Step 1: Write the failing test** — every parent has `sourced: true` and ≥1 source id that resolves; every sub-season has `sourced: false`, a `parent` that exists, and a `dominantTone` that exists in `pccs-tones.json`; the four parents are exactly spring/summer/autumn/winter; there are exactly twelve sub-seasons; `classifySeason` maps all 27 readings to a real sub-season (keep the existing exhaustive test); `parentOf` resolves for every sub-season.
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Write `data/curated/season-rules.json`** — the four parents from the spec's table, the twelve existing sub-season names mapped to parent + dominant tone, and the warm/cool hue split with a one-line reason for each of the eight straddling hues.
- [ ] **Step 4: Rewrite `src/core/seasons.ts`** — drop `colorIds` from the type; keep `classifySeason` scoring but derive undertone from the parent's `temperature` and depth/chroma from the dominant tone's bands.
- [ ] **Step 5: Run tests, expect pass. Delete `scripts/seed-seasons.ts`** and its `package.json` script — it seeds a file that no longer exists.
- [ ] **Step 6: Commit** — `feat(data): season rules, four sourced parents and twelve marked sub-seasons`.

---

### Task 5: Membership, fit, and the join table

**Files:**
- Create: `src/color/seasonFit.ts`
- Create: `scripts/build-season-colors.ts`
- Create: `data/processed/season-colors.json`
- Create: `tests/seasonFit.test.ts`, `tests/seasonColors.test.ts`

**Interfaces:**
- Consumes: `labToPccs`, `toneOf` (Task 3); `ParentSeason`, `SubSeason` (Task 4).
- Produces: `type FitBand = 'very close' | 'close' | 'roughly' | 'not close'`, `fitBand(deltaE: number): FitBand`, `seasonMembers(...): { colorId: number; deltaE: number; band: FitBand }[]`.

- [ ] **Step 1: Write the failing test** — `fitBand(4)` is `'very close'`, `fitBand(9)` `'close'`, `fitBand(19)` `'roughly'`, `fitBand(20)` `'not close'` (boundary at exactly 5/10/20 goes to the wider band); a warm vivid colour is a member of Spring and not of Summer; every season yields ≥1 member.
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Implement `src/color/seasonFit.ts`** — membership = hue in the parent's temperature half AND tone in the parent's tone set; fit = ΔE to the nearest `pccs-grid` cell belonging to that season, via the existing distance seam.
- [ ] **Step 4: Run tests, expect pass.**
- [ ] **Step 5: Write `scripts/build-season-colors.ts`**, run it, commit `data/processed/season-colors.json`.
- [ ] **Step 6: Write `tests/seasonColors.test.ts`** — regenerate in-memory and assert byte-identical to the committed file; every `colorId` resolves; every `seasonId` resolves.
- [ ] **Step 7: Commit** — `feat(color): season membership and fit scoring`.

---

### Task 6: Load and validate

**Files:**
- Modify: `src/data.ts`
- Modify: `CLAUDE.md` (the "exactly two data files" rule)
- Modify: `tests/core-purity.test.ts` if it enumerates data files

- [ ] **Step 1: Write the failing test** — `tests/data.test.ts` asserts each new export is present and non-empty, and that a malformed fixture throws with the file name in the message.
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Extend `src/data.ts`** — import and validate all six new files, exporting `sources`, `pccsHues`, `pccsTones`, `pccsGrid`, `seasonRules`, `seasonColors`.
- [ ] **Step 4: Run `make test`, expect pass.**
- [ ] **Step 5: Amend `CLAUDE.md`** — seven data files, `src/data.ts` still the only importer, and why the count grew. Amend the `seasons.json` paragraph, which now describes a deleted file.
- [ ] **Step 6: Commit** — `feat(data): load and validate the six PCCS datasets`.

---

### Task 7: The two-level season display

**Files:**
- Modify: `src/components/you/YouView.tsx`, `src/components/you/PaletteTabs.tsx`
- Modify: `src/styles/app.css`
- Create: `tests/browser/seasonFit.spec.ts`

- [ ] **Step 1: Write the failing browser test** — after a season is chosen, the result shows the parent season name, the sub-season name, a marker distinguishing them, at least one `ideal → closest` pair, and the sentence containing "nearest matches in the book".
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Implement the display** — parent + sub-season with the ⓘ explaining which is sourced; the ideal-vs-closest column with fit bands; the closing caveat sentence.
- [ ] **Step 4: Run `make test-browser`, expect pass.** This task touches CSS and layout, so the browser suite is mandatory.
- [ ] **Step 5: Commit** — `feat(you): show the sourced parent season, our sub-season, and the fit`.

---

### Task 8: Provenance and the documentation contract

**Files:**
- Create: `docs/color-analysis-sources.md`
- Modify: `README.md`, `CHANGELOG.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`
- Modify: `src/components/AboutPanel.tsx`

- [ ] **Step 1: Write `docs/color-analysis-sources.md`** — the Wada → Japan Standard Color Association (1927) → Japan Color Research Institute → PCCS (1964) → Korean 퍼스널컬러 chain, the exact `go.jp` quote, every verified link, a plain table of what is sourced and what is ours, and the Lab→PCCS conversion with its reasoning.
- [ ] **Step 2: Update `README.md`** — a datasets section for a non-JS reader: what each file is, where it came from, that they are usable on their own.
- [ ] **Step 3: Update `CHANGELOG.md`** — a release entry pairing the change with the owner's guiding prompts, quoted verbatim, keeping the human-guided framing.
- [ ] **Step 4: Update `PROMPTS.md`** — this session's prompts verbatim, including the "blind leading the blind" redirection that moved the design from examples to rules.
- [ ] **Step 5: Update `TODO.md`** (lens dropdown deferred) and `TODO-completed.md` (this work, with its commit hash).
- [ ] **Step 6: Add a link from `AboutPanel.tsx`** to the provenance doc so a visitor can reach it.
- [ ] **Step 7: Run `make test && make build && make lint`, then commit** — `docs: PCCS provenance and the documentation contract`.

---

## Self-Review

**Spec coverage:** sources registry → T1; PCCS hues/tones → T2; grid + Lab↔PCCS judgement → T3; season rules with sourced/ours split → T4; membership, fit bands, join table → T5; loading + the `CLAUDE.md` amendment → T6; two-level display + caveat sentence → T7; provenance doc + documentation contract → T8. The measured-scarcity argument (11 muted colours) is not a code change; it is the justification for T7's caveat and is recorded in the spec and T8's doc. No gaps.

**Placeholder scan:** every data table is given in full; every threshold is a number; the one known source conflict has a stated resolution and a test that guards it.

**Type consistency:** `PccsTone.abbr` is referenced by `SubSeason.dominantTone` and `ParentSeason.tones` (T2→T4) and by `toneOf` (T3). `Source.id` is referenced by every dataset's `sources` array. `FitBand` is produced in T5 and rendered in T7. `classifySeason` keeps its existing name and signature shape so the You tab's call site is unchanged.
