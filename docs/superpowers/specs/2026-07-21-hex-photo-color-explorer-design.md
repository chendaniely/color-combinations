# Hex / Photo Color Explorer — design

**Status:** approved (owner brainstorm, 2026-07-21)
**Feature:** Give the user a color — by pasting a **hex code**, **uploading a
photo** and eyedropping a region, or the existing **live camera** — and explore
the book colors nearest to it, then jump into Match or Browse.

## User story

> I want to paste NYC orange (`#F26522`) or NYC blue (`#236192`) — or upload a
> photo and eyedrop a region — and see which book colors are close enough to
> build a palette from.

## Goal

Turn the existing camera-only "find a color from the real world" flow into a
**single, source-agnostic color sampler**: three ways to name a color (camera,
uploaded photo, hex), one shared result that shows the nearest book colors and
hands off to Match/Browse. Works on desktop (where there's no camera).

## Decisions (resolved during brainstorm)

1. **Scope:** hex input **and** image-file upload (not hex alone). The live
   camera stays.
2. **Entry point:** one always-visible **"Sample a color"** button (replaces
   the camera-only icon, which is hidden on cameraless devices) opens a modal
   whose first screen is a **source picker**.
3. **Upload behaves like the camera:** the uploaded image is shown and the user
   **taps/eyedrops a region** to sample an averaged color — same interaction as
   tapping the frozen camera frame.
4. **Result = explore grid (unified):** all three sources converge on **one**
   result screen — a grid of the nearest book colors with closeness labels.
   This **replaces** the camera's current single-hero result; the camera adopts
   the grid too. One result component, one behavior. (Owner: "I'd rather have a
   single unified interface. Makes things simpler overall.")

## Architecture

### Flow

```
"Sample a color" button (in SearchBox, always visible)
        │  opens
        ▼
  ColorSampler modal
        │  first screen: source picker
        ├── 📷 Camera   (only if cameraSupported())  → ColorCapture ─┐
        ├── 🖼 Upload    → ImagePicker (load → tap region)          ├─→ RGB
        └── #  Hex       → HexPicker  (text → parseHex → swatch)    ─┘
                                                                     │
                                                                     ▼
                                          ColorMatches (explore grid)
                                    nearestColors(dataset, rgb, 12)
                                    tap swatch → Color/Shade/Family
                                                                     │
                                              ┌──────────────────────┤
                                              ▼                      ▼
                                    onMatch → seedPalette   onBrowse → setBrowseFilter + setView
```

### Where code lives (honors the architecture rules in CLAUDE.md)

- **Pure core (`src/core/`):**
  - `parseHex(input: string): RGB | null` — new, in `core/colorMath.ts`
    (next to `hexToRgb`/`RGB`). Validates and normalizes; no browser globals.
  - `averagePatch(...)` in `core/sampling.ts` — **already exists and is pure**;
    reused unchanged by both the camera and the upload paths.
- **Portable color logic (`src/color/`):** `nearestColors` + the `colorDistance`
  seam + `closenessLabel` — **reused unchanged**. (culori stays confined here.)
- **Component layer (`src/components/`):** all browser bits — the modal
  orchestrator, source picker, hex field, image upload/canvas/eyedrop, and the
  result grid. No camera/canvas/File code leaks into core.
- **No new dependencies.** File, FileReader/`createObjectURL`, and Canvas are
  browser built-ins.

### Components

New/changed, with one clear responsibility each:

- **`SearchBox` (modify):** replace the `cameraSupported()`-gated camera button
  with an always-visible **"Sample a color"** eyedropper button that opens the
  sampler. (The name-search input is untouched.)
- **`ColorSampler` (generalize today's `CameraSearch`):** the modal
  orchestrator. Holds `source: null | 'camera' | 'upload' | 'hex'` and
  `rgb: RGB | null`. Renders the source picker → the chosen source component →
  the result grid. Owns the Match/Browse dispatch wiring (moved verbatim from
  `CameraSearch`: `seedPalette`, and `setBrowseFilter` + `setView` via the
  existing `browseFor(level, key)` mapper).
- **Source picker (screen within `ColorSampler`):** lists the available
  sources. The **camera row is shown only when `cameraSupported()`**; upload and
  hex are always shown. Provides a Back affordance to return here from a source.
- **`ColorCapture` (reuse, unchanged):** the live-camera capture. Already emits
  `onSample(rgb)`.
- **`ImagePicker` (new):** file input → draw the image to a canvas (downscaled
  to a max dimension for performance) → **tap/eyedrop** a region → averaged RGB
  via `averagePatch`, with a sampled-color swatch + "use this color" and re-tap
  before commit. No "freeze" step (a still image is already frozen). Shares the
  canvas-tap→RGB mapping with the camera (see below).
- **`HexPicker` (new):** a text field. Live swatch preview via `parseHex`;
  **Explore disabled until the value parses**; quiet inline hint on invalid.
  On submit → `onSample(rgb)`.
- **`ColorMatches` (refactor of `CaptureResult`):** the unified result grid —
  12 nearest colors with closeness labels, a selectable swatch, the
  Color/Shade/Family selector, and Match/Browse. Renamed from `CaptureResult`
  because it is no longer camera-specific (its `captureResult.test.tsx` follows).

### Shared canvas sampling

Both camera and upload map a pointer tap on a displayed canvas back to a source
pixel and average a small patch. The camera's `sampleAt` already does this
(cover-fit inverse mapping + `averagePatch`, `PATCH_RADIUS = 6`). Factor that
into a shared helper, e.g. `sampleCanvasAt(canvas, clientX, clientY, radius,
fit)`, in the component layer, so `ImagePicker` and `ColorCapture` use one
implementation. `averagePatch` (the pure math) is unchanged.

## Details

### Result grid (`ColorMatches`)

- **12** nearest book colors (`nearestColors(dataset, rgb, 12)`), responsive
  grid, each labeled with the existing `closenessLabel(distance)`
  (`very close` → `close` → `roughly` → …). Closest is pre-selected.
- Selecting a swatch drives the existing **Color / Shade / Family** selector and
  the **Match / Browse** buttons — identical handoff to today's result.
- A "You gave `#hex`" line echoes the sampled color with a swatch.

### Hex input (`parseHex`)

`parseHex(input: string): RGB | null`

- Accepts `#236192`, `236192`, `#fff`, `fff`; case-insensitive; `#` optional;
  3- or 6-hex-digit only.
- Trims surrounding whitespace. Expands 3-digit shorthand (`f80` → `ff8800`).
- Returns `null` for anything else (wrong length, non-hex chars, empty).
- Pure; no throw.

### Image upload + eyedrop (`ImagePicker`)

- Accept an image file (`accept="image/*"`). Load via `createObjectURL` →
  `Image` → draw to a canvas scaled so the longest side ≤ a max (e.g. 1600px).
- Tap/click a region → `sampleCanvasAt(...)` → averaged RGB; show a swatch +
  "use this color"; allow re-tapping before commit.

### Errors & empty states

- **No camera:** the picker omits the camera row (upload + hex remain).
- **Non-image / unreadable file:** inline message; never crashes.
- **Invalid hex:** Explore disabled + quiet hint (above).
- **Grid:** always ≥ 12 book colors exist, so there is no empty result state.

### Privacy

The uploaded image is read, drawn, and sampled **entirely in the browser** —
never uploaded, stored, or transmitted, matching the camera's privacy stance
(and its "stays on this device" copy). Covered by a test in the spirit of
`camera-privacy.test.ts`.

## Testing

- **Pure unit (`core`):** `parseHex` — `#236192`/`236192`/`#fff`/`fff` → RGB;
  bad length, non-hex chars, empty, whitespace → `null`; 3-digit expansion.
- **Pure unit (`core`):** `averagePatch` is already tested (`sampling.test.ts`);
  add a case only if the shared helper introduces new math (it should not).
- **Component (jsdom + Testing Library):**
  - `HexPicker`: typing `#236192` enables Explore and yields a grid led by
    **Helvetia Blue `#0057ba`**; invalid input keeps Explore disabled.
  - Source picker: camera row present only when `cameraSupported()` is mocked
    true; upload + hex always present.
  - `ColorMatches`: renders 12 swatches; selecting one and pressing Match/Browse
    fires the callback with the expected `(level, key)`.
- **Smoke (`renderToString`):** the source picker and `ColorMatches` render
  without crashing.
- **Owner browser checklist:** live-camera capture and real image-upload eyedrop
  (interactions that resist unit testing).

## Dependency budget

**No new dependencies.** Reuses `nearestColors`, `colorDistance`,
`closenessLabel`, `averagePatch`, and the existing Match/Browse dispatch wiring.

## Out of scope (YAGNI / deferred)

- **Color-wheel / RGB sliders** — nice, explicitly deferred to a later pass
  (logged in `TODO.md`). Hex text is enough for v1.
- **Multi-color palette extraction** from a photo (one eyedrop at a time).
- **Saved-color history.**

## Docs contract

Updated in the same commits as the work: `README.md` (a "Sample a color"
section replacing/expanding the camera note), `PROMPTS.md` (this brainstorm +
prompts), `TODO.md` / `TODO-completed.md`, and `CLAUDE.md` if any architecture
note is warranted (e.g. the `parseHex` core addition).
