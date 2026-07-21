# Camera color capture — design

**Status:** approved (design + interactive mockup), ready for planning.
**Date:** 2026-07-20 (Session 6)
**Mockup (flow + result screen, real Sanzo Wada values):**
https://claude.ai/code/artifact/fd8d1b03-21ca-4258-a671-793ebd365fee

## Motivation — the mobile fashion persona

Someone standing in front of their closet (or a shop rail) wants to point their
phone at a garment, learn what color it is in the book, and immediately either
**build a matching outfit** (Match) or **see the combinations the book already
pairs it with** (Browse). Typing a color name works when you know the name;
a camera works when all you have is the object.

This ships first inside the existing **"find a color"** search affordance. It is
explicitly designed so the *same* capture experience can later be mounted on the
Match and Browse tabs with no rework — only a different result-callback.

## User-facing flow

1. **Doorway.** A small camera icon sits inside the search field. The field's
   placeholder becomes **"Find a color…"** (drops the `(indigo, olive)` examples,
   which clutter next to an icon). Tapping the icon opens the capture overlay.
   On a phone this uses the rear camera; on desktop, the webcam.
2. **Live → freeze → tap.** A live viewfinder with a soft center target. Tap the
   shutter to **freeze** the frame. Then **tap the exact spot** on the garment
   (not a shadow or the background). Re-tap to move the sample point; **Retake**
   returns to live.
3. **Resolve.** The tapped point is sampled (a small averaged patch, not one
   noisy pixel) and matched **perceptually** to the closest colors in the book.
4. **Result screen.**
   - The **raw sampled swatch + hex** is always shown ("Your camera saw #7c7b3f")
     so a bad read is obvious and one **Retake** away.
   - A **hero** image of the closest book color with its name, code, and a
     plain-language closeness cue ("very close" / "close" / "roughly").
   - A **scrollable list of near matches** (cap ~6). Tapping one **promotes it to
     the hero**; its shade/family flow into the selector automatically.
   - A **level selector — Color · Shade · Family** — with **Shade preselected**.
   - Two actions, **Match** and **Browse**, re-labelled to the chosen level
     (e.g. "Match Olives" / "Browse Olives").
5. **Hand-off.** Match seeds a palette at the chosen level; Browse switches to the
   Browse tab filtered at that level.

## Privacy — a hard requirement

The camera is the first feature that sees the user's surroundings. The design
guarantees, and the build **mechanically enforces**, that imagery never leaves
the device and is never persisted.

**Guarantees**
- **No upload, ever.** No frame, pixel, or derived value is sent anywhere. This
  is consistent with the project's standing rule "no runtime data fetching" —
  there is no network layer to leak into.
- **No persistence.** Nothing is written to `localStorage`, `sessionStorage`,
  `IndexedDB`, cookies, or downloads. The live stream and any frozen frame exist
  only in memory (a `<canvas>` / `ImageData`) and are dropped when the overlay
  closes.
- **Camera released promptly.** When the overlay closes or the component
  unmounts, every `MediaStreamTrack` is `.stop()`ed, so the OS camera indicator
  turns off — the strongest visible trust signal.
- **Only a color escapes the overlay.** The capture component's sole output is a
  3-number `RGB`. The photo is not part of any app state, prop, or event beyond
  the pixels needed to compute that RGB.

**Mechanical enforcement (this is the "let's check for this")**
- **`tests/camera-privacy.test.ts`** — modeled on the existing
  `tests/core-purity.test.ts`: it reads the source of `src/components/camera/*`
  and **fails the build** if it finds any of `fetch`, `XMLHttpRequest`,
  `sendBeacon`, `WebSocket`, `EventSource`, `localStorage`, `sessionStorage`,
  `indexedDB`, `document.cookie`, `toDataURL`, `toBlob`, `createObjectURL`, or
  `<a download`. (The one legitimate need — `canvas.getImageData` to read pixels
  locally — is allowed.)
- **Track-stop test** — with a mocked `getUserMedia` returning a fake
  `MediaStream`, closing/unmounting the capture calls `stop()` on all tracks.

**Reassurance in the UI**
- A persistent line in the capture overlay: **"Your photo stays on this device —
  nothing is uploaded or saved."**
- A short note in the README's feature description saying the same, plus browser
  requirements (a secure context — HTTPS or localhost — and camera permission).

## Architecture

The work is five layers, each independently shippable and testable, ordered so
each builds on the last. The project's contracts hold throughout: `src/core/`
stays a pure kernel (guarded by `core-purity.test.ts`); the app reads only
`data/processed/colors-data.json`; all style values come from
`src/styles/tokens.css`; **no new dependencies** (native `getUserMedia` +
`<canvas>`; OKLab is hand-written math).

### The reusable boundary

Three decoupled units, so mounting capture on Match/Browse later is a new
callback, not a refactor:

- **`ColorCapture`** (component) — owns the camera; emits one `RGB`; knows nothing
  about matching or destinations.
- **`nearestColors()`** (pure core) — `RGB → ranked book colors + shade/family`.
- **`CaptureResult`** (component) — hero + list + level selector; calls back
  `onMatch(level, key)` / `onBrowse(level, key)` supplied by the doorway.

### Layer 1 — perceptual matching (core)

- **`src/core/colorMath.ts`** (extend): `srgbToLinear`, `rgbToOklab(rgb): [L,a,b]`,
  `oklabDistance(a, b): number` (Euclidean in OKLab — a modern, perceptually
  uniform space; simpler and more robust to implement correctly than ΔE2000, and
  good enough to beat naive RGB distance under colored lighting).
- **`src/core/nearestColor.ts`** (new):
  - `nearestColors(ix, rgb, count): { color: ColorRecord; distance: number }[]` —
    converts every book color to OKLab, ranks by distance, returns the top
    `count`. An exact book hex returns that color at distance 0.
  - `closenessLabel(distance): 'very close' | 'close' | 'roughly'` — thresholds
    tuned to OKLab distance (asserted in tests at representative values).
- **`src/core/sampling.ts`** (new): `averagePatch(data, width, height, cx, cy,
  radius): RGB` — averages an `ImageData`-style `Uint8ClampedArray` over a small
  square clamped to bounds. Pure; the trickiest sampling math, unit-tested.

### Layer 2 — level plumbing (core + state)

- **`src/core/state.ts`**
  - `MatchLevel` becomes `0 | 1 | 2` (Color / Shade / Family).
  - `seedPalette` accepts level `0`; a Color-level key is `c{colorId}`.
  - Lift Browse filters out of `BrowseView`'s local state into `AppState`:
    `browse: { family: string; shade: string; colorId: string }` (all `''` = off).
  - New action `setBrowseFilter` carrying the whole `browse` object. The
    dropdowns and the dismissible chip send a one-field change (other fields
    unchanged); the camera doorway sends a scoped filter — the one field for the
    chosen `(level, key)` set, the other two blank — so a capture replaces any
    prior filter rather than stacking on it.
- **`src/core/matching.ts`**
  - `combosForSet` / `suggestPartners` already accept `GranularityLevel` 0–3 —
    confirm level-0 behavior with a test.
  - `remapKeysToLevel` extended to move among 0/1/2 (to Color: cannot uniquely
    pick, returns `[]`, mirroring today's "to Shade from Family" rule; to
    coarser: derive the ancestor key).

### Layer 3 — Match & Browse learn the new levels (UI)

- **`src/components/MatchPage.tsx`** — add a **Colors** option to the level
  radiogroup. Because the camera/search seed the Color level directly, the
  *empty* Colors state does **not** render 157 swatches; `MatchPage` renders a
  short inline prompt ("Search or snap a color to start"). `ShadePicker` is
  unchanged (it keeps serving the Shade and Family empty states).
- **`src/components/BrowseView.tsx`** — read `family` / `colorId` from
  `state.browse` instead of local state; add **shade** filtering
  (`ancestorAtLevel(id, 1) === shade`); render a **dismissible chip** for an
  active shade filter (e.g. "Olives ✕") rather than adding a permanent third
  dropdown — capability without clutter.

### Layer 4 — `ColorCapture` component

- **`src/components/camera/ColorCapture.tsx`** — `getUserMedia({ video:
  { facingMode: 'environment' } })` → live `<video>` → shutter → freeze frame to
  an offscreen `<canvas>` → tap (mapped to canvas coords) → `averagePatch` →
  `onSample(rgb)`. Re-tap moves the point; **Retake** restarts the stream.
  Stops all tracks on close/unmount. Renders the privacy line.
- **Feature detection / errors.** If `navigator.mediaDevices?.getUserMedia` is
  missing or the context is insecure, the **camera icon never renders** (no dead
  button). Permission-denied / no-device shows a friendly overlay message with a
  "type a color instead" escape — never a crash.

### Layer 5 — `CaptureResult` + the doorway

- **`src/components/camera/CaptureResult.tsx`** — takes an `RGB`; renders the
  sampled chip, hero, scrollable near-matches (tap to promote), the
  Color/Shade/Family selector (Shade default; plain-words closeness), and the
  Match/Browse buttons; calls `onMatch(level, key)` / `onBrowse(level, key)`.
- **Doorway container** (e.g. `src/components/camera/CameraSearch.tsx`, opened by
  `SearchBox`) — mounts `ColorCapture`, then `CaptureResult`; supplies the
  callbacks: Match → `seedPalette({ level, key })`; Browse → apply the scoped
  Browse filter + `setView('browse')`; both close the overlay.
- **`src/components/SearchBox.tsx`** — add the feature-detected camera icon;
  change the placeholder to "Find a color…".

## Data flow

```
frozen frame ──tap──▶ averagePatch ──▶ RGB ──▶ nearestColors ──▶ hero + near list
                                                                      │
                                            pick a near match (promote)│  pick level (Color/Shade/Family)
                                                                      ▼
                                         Match: seedPalette(level, key)   Browse: setBrowseFilter(level→key) + setView('browse')
```

## Error handling

- **Unsupported / insecure context:** camera icon hidden (feature-detected).
- **Permission denied / no device:** friendly overlay message + "type a color
  instead"; app never crashes; camera tracks (if any) stopped.
- **Mis-sampled point (shadow/background):** self-correcting — the "camera saw"
  chip shows the raw color; user re-taps or hits Retake.
- **Far-from-any-book color:** `nearestColors` always returns something; the
  closeness cue reads "roughly," setting honest expectations.

## Testing

**Core unit tests (`tests/`):**
- `rgbToOklab` against reference values; `oklabDistance` symmetry and zero on
  identical inputs.
- `nearestColors`: an exact book hex ranks itself first at distance 0; ranking
  order on a hand-picked example (olive garment → Olives shade neighbors).
- `closenessLabel` thresholds at representative distances.
- `averagePatch`: averages a synthetic pixel array; clamps at edges.
- Reducer: `seedPalette` at level 0; `setBrowseFilter` set/clear; `remapKeysToLevel`
  across 0/1/2. Browse shade filtering via a dataset query test.

**Privacy tests:**
- `tests/camera-privacy.test.ts` — source scan of `src/components/camera/*` fails
  on any forbidden network/storage/persistence API (allow-list: `getImageData`).
- Track-stop test with a mocked `MediaStream`.

**UI:**
- `renderToString` smoke: `CaptureResult` given a fixed `RGB` renders the hero
  color's name and the three level options.
- **Owner browser checklist** (not asserted): camera opens on phone + desktop;
  permission prompt; freeze/tap/re-tap/Retake; privacy line visible and the
  **camera light turns off on close**; each Level × (Match/Browse) navigates
  correctly; placeholder reads "Find a color…"; icon absent on an insecure
  context.

**Per task:** `npx tsc --noEmit` and `make test` pass; `core-purity.test.ts` and
`camera-privacy.test.ts` stay green.

## Aesthetic

Overlay and result screen use only `tokens.css`: warm paper grounds, ink text,
hairlines; **orange** (`--accent`) for the aiming reticle and the active level
(its established "active/hover" role); **blue** (`--link`) for the primary Match
action — orange and blue together, per brand. Names in EB Garamond, UI in
Atkinson Hyperlegible, codes in the mono face.

## Dependency budget

**No new dependencies.** Camera via native `getUserMedia`; pixel read via
`<canvas>`; OKLab via hand-written pure functions in `colorMath.ts`.

## Out of scope / deferred

- **Camera doorways on the Match and Browse tabs.** The reusable boundary is
  built now; wiring those two extra entry points is a fast follow (a different
  callback), deferred to keep v1 focused. Logged in `TODO.md`.
- Live continuous "eyedropper" sampling (we chose freeze-then-tap for accuracy).
- Multi-point / region-average or pattern (multi-color) detection.
- Any capture **history / saved colors** — deliberately excluded for privacy.
- ΔE2000 / other color-difference metrics — OKLab distance is sufficient for v1.
