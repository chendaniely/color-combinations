# Shareable Deep Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every screen linkable by serialising the one app-state object into `location.hash` and reading it back on load.

**Architecture:** A pure encoder/decoder in the kernel (`src/core/urlState.ts`) holds all the interesting logic and is testable without a browser. A thin browser layer (`src/urlSync.ts`) owns `location`, `history` and the push-vs-replace decision, and sanitises decoded ids against the dataset — which the kernel cannot see.

**Tech Stack:** TypeScript, React, no new dependencies. `history.pushState`/`replaceState` and `popstate` directly; no router library, per CLAUDE.md.

## Global Constraints

- `src/core/urlState.ts` must import nothing outside `src/core` — no `location`, `window` or `history`. `tests/core-purity.test.ts` must stay green and must never be weakened.
- **A `SkinReading` never enters a URL.** Not `skin`, `hair`, `ita`, `skinL`, `skinHue`, `contrastGap` or `whiteBalanced`. Owner decision, enforced by `tests/urlPrivacy.test.ts`.
- Panels (`selection`) `pushState`; every other state change `replaceState`.
- The default state writes NO hash — not `#` and not `#/`.
- Defaults are omitted from the query string.
- A link naming something the book has not got must never crash: bad ids are dropped or explained.
- Verify with `make check` (full log, real exit code) and `make test-browser` for anything touching CSS, layout or an overlay.

---

### Task 1: The pure encoder and decoder

**Files:**
- Create: `src/core/urlState.ts`
- Test: `tests/urlState.test.ts`

**Interfaces:**
- Consumes: `AppState`, `Selection`, `initialState` from `src/core/state.ts`; `GranularityLevel`, `SizeBucket`, `AccessLensId` from `src/core/types.ts`.
- Produces: `encodeState(state: AppState): string` returning e.g. `#/browse?family=reds` or `''`; `decodeState(hash: string): Partial<AppState>`.

- [ ] **Step 1: Write the failing test** — `tests/urlState.test.ts` asserting: `encodeState(initialState) === ''`; a view round-trips; `g`, `sizes`, `open`, browse filters, `level`/`keys`, `lens`, `season`/`floor`, `about` each round-trip; defaults are absent from the string; `decodeState('')` is `{}`; garbage (`'#/nonsense?g=99&open=color:abc&sizes=9'`) yields no invalid values; an unknown view is omitted so the merge keeps `wheel`; all four `Selection` kinds round-trip including `ribbon` with its `sizes`.
- [ ] **Step 2: Run it, expect failure** — `npx vitest run tests/urlState.test.ts`, fails because the module does not exist.
- [ ] **Step 3: Implement `src/core/urlState.ts`.** Build the query with `URLSearchParams`, omitting any value equal to the `initialState` default. Parse defensively: every field is validated for shape and range, and anything unrecognised is left out of the returned partial rather than defaulted in place.
- [ ] **Step 4: Run tests, expect pass.**
- [ ] **Step 5: Commit** — `feat(core): pure URL state encoder and decoder`.

---

### Task 2: The privacy guard

**Files:**
- Create: `tests/urlPrivacy.test.ts`

**Interfaces:**
- Consumes: `encodeState` from Task 1.

This is the enforcement of the owner's decision. It gets its own task because it must be possible to point at it.

- [ ] **Step 1: Write the test.** For a state carrying a full `SkinReading` (with distinctive values — `skin: '#a1673f'`, `hair: '#1a1110'`, `skinL: 49.4`, `skinHue: 57.1`, `ita: -1`, `contrastGap: 43.5`), assert the encoded string contains none of: the field names, the hex values with and without `#`, and the numbers. Checking values as well as names is the point — a rename must not slip past.
- [ ] **Step 2: Also assert what a You link DOES carry** — `season` and `floor` — so the test cannot pass by encoding nothing at all.
- [ ] **Step 3: Run it.** It should pass immediately if Task 1 was written correctly; if it fails, Task 1 leaked and must be fixed rather than the test loosened.
- [ ] **Step 4: Prove it can fail** — temporarily make `encodeState` emit `skin`, confirm the test fails naming the field, then revert.
- [ ] **Step 5: Commit** — `test: a skin reading may never enter a URL`.

---

### Task 3: The browser sync layer

**Files:**
- Create: `src/urlSync.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/PaletteTray.tsx`, `src/components/SuggestionList.tsx` (`keyName` → `keyLabel`)
- Test: `tests/urlSync.test.ts`

**Interfaces:**
- Consumes: `encodeState`, `decodeState` (Task 1); `dataset` from `src/data.ts`.
- Produces: `initialStateFromUrl(): AppState` and `useUrlSync(state: AppState): void`; `sanitise(partial: Partial<AppState>, ids: KnownIds): Partial<AppState>`.

- [ ] **Step 1: Write the failing test** — `tests/urlSync.test.ts` (jsdom) asserting: `sanitise` drops a `palette.keys` entry the dataset lacks and keeps the rest; drops a `browse.family`/`shade`/`colorId` the dataset lacks; leaves `selection` alone (MissingPanel explains those); `initialStateFromUrl` merges a hash over `initialState`; a hash naming an unknown palette key produces a state Match can render.
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Implement `src/urlSync.ts`.** `initialStateFromUrl` reads `location.hash` once, decodes, sanitises, merges. `useUrlSync` writes on change: `pushState` when `selection` changed and the new one is non-null, `replaceState` otherwise; clears the fragment entirely when `encodeState` returns `''`. A `popstate` listener re-decodes and dispatches. Guard against writing the hash we just read, which would otherwise loop.
- [ ] **Step 4: Switch `PaletteTray` and `SuggestionList` to `keyLabel`** so a key that slips past sanitising renders as itself instead of throwing.
- [ ] **Step 5: Wire into `App.tsx`** — seed `useReducer` from `initialStateFromUrl()` and call `useUrlSync(state)`.
- [ ] **Step 6: Run `make check`, expect pass.**
- [ ] **Step 7: Commit** — `feat: sync app state to the URL, and stop two components throwing on a bad key`.

---

### Task 4: The You tab with a season and no reading

**Files:**
- Modify: `src/components/you/YouView.tsx`, `src/components/you/PaletteTabs.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/paletteTabs.test.tsx`

**Interfaces:**
- Consumes: `SeasonData` and the season rules already loaded by `useSeasonData`.
- Produces: `PaletteTabs` accepting `reading: SkinReading | null`.

- [ ] **Step 1: Write the failing test** — render `PaletteTabs` with `reading={null}` and `season="deep-autumn"`: it shows the parent and sub-season names, the season swatches with fit bands, the fit panel, a "shared link" note inviting the visitor to take their own photo, and NO tab strip and no "Measured for you".
- [ ] **Step 2: Run it, expect failure** (the prop is required today).
- [ ] **Step 3: Make `reading` optional in `PaletteTabs`.** With no reading: skip `scorePalette`/`measuredPalette`, force the season view, render no `role="tablist"`, and render the shared-link note. Keep every hook unconditional — compute then branch in the returned JSX, as `PaletteTabsReady` already does.
- [ ] **Step 4: Add the `season && !reading` branch to `YouView`** so a link lands on the season palette instead of the capture prompt.
- [ ] **Step 5: Style the note** in `app.css`, reusing `.you-note`.
- [ ] **Step 6: Run `make check` and `make test-browser`.** The browser suite is mandatory: this changes what an audited screen renders.
- [ ] **Step 7: Commit** — `feat(you): a shared season link works without a reading`.

---

### Task 5: The Share button

**Files:**
- Create: `src/components/ShareLink.tsx`
- Modify: `src/components/CombinationDetail.tsx`, `src/components/you/PaletteTabs.tsx`, `src/components/MatchPage.tsx`
- Modify: `src/styles/app.css`
- Test: `tests/shareLink.test.tsx`

**Interfaces:**
- Consumes: `copyText` from `src/copy.ts`.
- Produces: `<ShareLink label?: string />` — copies `location.href` and shows "Link copied" briefly.

- [ ] **Step 1: Write the failing test** — clicking it calls the clipboard with the current `location.href`; it shows confirmation text afterwards; it falls back without throwing when the clipboard is denied (the pattern `tests/browser/takeaways.spec.ts` already establishes for copy).
- [ ] **Step 2: Run it, expect failure.**
- [ ] **Step 3: Implement `ShareLink`**, following `CopyField`'s existing feedback pattern rather than inventing a second one.
- [ ] **Step 4: Place it** in combination detail beside Copy CSS, on the You tab result, and above the Match palette.
- [ ] **Step 5: Run `make check` and `make test-browser`.**
- [ ] **Step 6: Commit** — `feat: a Share button, because mobile hides the address bar`.

---

### Task 6: Browser tests for the whole loop

**Files:**
- Create: `tests/browser/deepLinks.spec.ts`

- [ ] **Step 1: Write the tests** — the address bar updates when the view, a filter and a panel change; a pasted link restores view + filters + open panel; Back closes a panel and leaves the view intact; three granularity changes then Back leaves the site; `open=color:999999` shows the not-in-this-book panel rather than crashing; `keys=not-a-shade` renders Match without the bad key; a You link with a season and no reading shows the season palette; the URL for a You link contains no skin or hair value.
- [ ] **Step 2: Run `make test-browser`, expect pass.**
- [ ] **Step 3: Prove the Back test can fail** — temporarily make panels `replaceState`, confirm the Back test fails, revert.
- [ ] **Step 4: Commit** — `test(browser): deep links end to end`.

---

### Task 7: Documentation

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `PROMPTS.md`, `TODO.md`, `TODO-completed.md`, `package.json`

- [ ] **Step 1: `README.md`** — a shareable-links section for a non-JS reader: what a link contains, what it deliberately does not (and why), and that the default page has no hash.
- [ ] **Step 2: `CLAUDE.md`** — the URL-state seam (pure encoder in core, browser sync outside, sanitise where the dataset is visible) and the rule that a reading never enters a URL.
- [ ] **Step 3: `CHANGELOG.md`** — a v1.8.0 entry paired with the owner's prompts, including the privacy decision in their words.
- [ ] **Step 4: `PROMPTS.md`** — this session verbatim, with both owner decisions and anything Claude got wrong.
- [ ] **Step 5: `TODO.md` / `TODO-completed.md`** — move the deep-links half of the top item across with hashes; leave "save / name / export a palette" noting that a share link is now most of it; record the Open Graph ceiling.
- [ ] **Step 6: Bump to 1.8.0** — a feature, so a minor release.
- [ ] **Step 7: Run `make check`, `make test-browser`, then commit.**

---

## Self-Review

**Spec coverage:** URL format → T1; privacy decision → T2; architecture split → T1/T3; the `keyName` crash → T3; sanitising → T3; You-tab branch → T4; Share buttons → T5; browser tests → T6; docs → T7. The Open Graph ceiling is recorded in the spec and T7 step 5, and is explicitly not built. No gaps.

**Placeholder scan:** every param is named in the spec's table; every test lists its actual assertions; the two "prove it can fail" steps name what to break and what to expect.

**Type consistency:** `encodeState`/`decodeState` names are used identically in T1, T2 and T3. `sanitise` is introduced and consumed in T3 only. `PaletteTabs`'s `reading` becomes `SkinReading | null` in T4 and is passed as such by `YouView`. `ShareLink` takes an optional `label` in T5 and nothing else relies on its internals.
