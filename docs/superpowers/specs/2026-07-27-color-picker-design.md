# Pick a color — wheel + HEX / RGB / CMYK entry

**Date:** 2026-07-27
**Status:** approved, ready for implementation plan
**Mockup:** `docs/superpowers/specs/2026-07-27-color-picker-disc-mockup.html`
**Supersedes:** the `HexPicker` source added in
`docs/superpowers/specs/2026-07-21-hex-photo-color-explorer-design.md`

## Why

The hex field shipped in v1.3.0 assumes you already know the color's hex. The
owner asked to reopen the source deferred in that same session:

> i like that ability to pick hex. but now i like the idea you gave before about
> using the color wheel selector where users can find a color, provide a hex,
> RGB, or CYMK color. this all makes it easier to use for the end user to
> explore a color

Two audiences it unblocks: people who have a color in a *different* notation
(an RGB triplet from a screen spec, a CMYK build from a printer), and people who
have no notation at all and just want to point at "somewhere in the dusty
blues."

## What changes

`ColorSampler`'s third tile becomes **"🎨 Pick a color"** in place of
**"# Paste a hex"**. Camera and Upload are untouched. The new screen produces one
`RGB` and hands it to the existing `ColorMatches` 12-nearest grid, which already
dispatches into Match and Browse.

**Nothing downstream changes.** No new fields in `src/core/state.ts`, no new
wiring in `App.tsx`, no change to matching or the result grid. This feature is
one new *source* on an existing pipeline.

## The screen

A plain HSV disc — hue as angle clockwise from 12 o'clock, saturation as radius,
so the rim is vivid and the center is white. Under it a brightness slider, then
the three notations stacked and editable in the same order and with the same
labels the color detail page already uses (HEX, RGB, CMYK), then the swatch and
**Explore this color**.

Drag anywhere on the disc; past the rim the pin clamps to the edge rather than
wrapping. Touch uses the `touch-action: none` plus pointer-capture pattern the
mobile chord wheel adopted in v1.3.1, so dragging the disc never scrolls the
page.

The screen opens seeded on NYC blue `#236192`, so the disc, slider and all three
fields are populated on arrival and the control explains itself before it is
touched.

**Explore is always enabled**, unlike `HexPicker` where it was disabled until the
text parsed. The picker's state is an `HSV` that is valid by construction — the
disc always denotes some color — so there is no invalid state to guard. An
unparseable *draft* in one field is a per-field condition, not a screen-level
one, and does not disable Explore; the color that gets explored is the one shown
under the pin.

### Decided against: plotting the book's colors on the disc

The brainstorm mocked up four discs live against the real 157 colors: no
overlay, dots in their own color, hairline rings, and a brightness-slice
overlay. **The plain disc won.** On a control whose entire job is aiming at a
color, the dots compete with the target rather than helping you hit it.

This was a reversal — the overlay was chosen in the abstract and rejected on
sight, which is the whole reason the mockup round existed. Do not add the
overlay back to the picker.

The plot itself was liked, and moves to the Browse page as a separate feature
(see Deferred). The mockup preserves all four discs as that feature's starting
point.

### Brightness slider runs the full 0–100

Not floored. The book contains a literal **Black** at V = 0, so any floor makes
one of the 157 colors unreachable by the picker. The comparison discs in the
mockup floor at 12% only because they are swatches, not controls.

## Architecture

### New pure core

Two modules, both dependency-free kernel code under the existing
`tests/core-purity.test.ts` guard.

**`src/core/colorMath.ts`** gains two types and six functions, joining
`parseHex`:

```ts
export type CMYK = [number, number, number, number]
export type HSV = { h: number; s: number; v: number }

rgbToHsv(rgb: RGB): HSV          // h in [0,360), s and v in [0,1]
hsvToRgb(hsv: HSV): RGB
rgbToCmyk(rgb: RGB): CMYK        // integer percentages, 0–100
cmykToRgb(cmyk: CMYK): RGB
parseRgb(input: string): RGB | null
parseCmyk(input: string): CMYK | null
```

`rgbToHsv` returns an object to match the existing `rgbToHsl`. The parsers
mirror `parseHex`'s contract exactly: tuple or `null`, never a throw. Both
tolerate whitespace, `,` `/` or space separators, and an optional `rgb(…)` /
`cmyk(…)` wrapper. Non-finite, out-of-range, or wrong-arity input returns
`null`; in-range floats round to integers.

**`src/core/discGeometry.ts`** (new file) holds the disc's pointer math as pure
functions:

```ts
discPointToHueSat(dx: number, dy: number, radius: number): { h: number; s: number }
hueSatToDiscPoint(h: number, s: number, radius: number): { dx: number; dy: number }
```

Separated from the component deliberately: jsdom has no layout, so geometry
living inside `ColorDisc.tsx` would be untestable. As pure functions with an
explicit radius they are fully unit-tested, and `ColorDisc.tsx` stays thin.

### Components

Three files in `src/components/sample/`:

| File | Responsibility |
| --- | --- |
| `ColorPicker.tsx` | The screen. Owns the HSV state, renders disc + fields, emits `RGB` on Explore. |
| `ColorDisc.tsx` | Disc + brightness slider. Pointer and keyboard input in, `HSV` out. No knowledge of notations. |
| `ColorFields.tsx` | The three synced inputs. `HSV` in, parsed `RGB` out. No knowledge of the disc. |

`HexPicker.tsx` is deleted; its capability is absorbed by `ColorFields`.

### Two state decisions that the obvious approach gets wrong

**HSV is the source of truth, not RGB.** Hue is undefined when saturation is
zero, so storing RGB and re-deriving the pin makes it snap to 0° every time you
slide toward white or black — the pin visibly jumps while the user is dragging
the *brightness*, which reads as a bug. Storing `HSV` and deriving
RGB/HEX/CMYK for display keeps the pin where it was put. `ColorPicker` holds one
`HSV`; every displayed notation is derived.

**Each field keeps its own draft text.** A field renders its draft while it has
focus and the derived value otherwise. Without this, typing `#2` into HEX is
clobbered on the next keystroke by a re-render from state — the same reason
today's `HexPicker` holds raw `text` rather than a parsed value. A draft that
does not parse sets `aria-invalid` and leaves the shared HSV untouched; it does
not reset the field or move the disc. On blur the field re-renders from state,
discarding an unparseable draft.

### Styling

New `.pick-*` classes in `src/styles/app.css`, reusing existing tokens.

One deliberate exception to the no-hard-coded-colors rule: the disc's
`conic-gradient` hue stops (`#f00`, `#ff0`, `#0f0`, `#0ff`, `#00f`, `#f0f`) and
its white `radial-gradient` are not design tokens — they are the color space
itself, the same category as the exemption CLAUDE.md already grants Sanzo
Wada's data colors. They live in `app.css` with a comment saying so, not inline
in the component.

Brightness is applied as `filter: brightness(V)` on the disc face. That filter
is exactly multiplicative on RGB, which is precisely the definition of HSV's V —
so the disc *is* the color space rather than an approximation of it, and the
color under the pin always equals the color in the fields.

## What the data says

Three facts established during the brainstorm, each worth pinning with a test:

1. **CMYK here is exact, not approximate.** Converting each color's stored CMYK
   back to RGB with the plain formula reproduces the stored RGB on every channel
   for 156 of 157 colors. The lone exception, **Dull Violet Black**, has a
   malformed `M = 106%` in the source data. So CMYK entry lands dead-on a book
   color, and needs no soft-proofing caveat in the UI. (Related: the 2026-07-21
   accessibility spec ruled out true CMYK soft-proofing for the print lens; that
   remains ruled out. This is notation conversion, not color management.)
2. **HSV round-trips exactly.** All 157 colors survive RGB→HSV→RGB with zero
   error on every channel, so pin placement and the readout are exact.
3. **Saturation-as-radius spreads the book well.** Only 7 of 157 colors fall
   within the innermost 21% of the radius, so the muted colors do not pile up at
   the hub regardless of the disc's rendered size.

Note the consequence of (1) plus the range check: `parseCmyk` rejects values
above 100, so Dull Violet Black's own stored CMYK string cannot be typed back
into the field. Accepted — the data is malformed, and loosening the parser to
admit it would let genuine typos through.

## Testing

**`tests/colorMath.test.ts`** — extend:

- RGB→HSV→RGB round-trips exactly for all 157 book colors.
- Grays: `rgbToHsv([128,128,128])` gives `s === 0`; hue is not asserted to be
  meaningful.
- All 157 stored CMYK values convert to their stored RGB, asserting **exactly
  one** known outlier by name. If ingest ever fixes or adds malformed data, this
  test says so instead of silently passing.
- `parseRgb` / `parseCmyk` accept and reject tables: separators, wrappers,
  arity, range bounds, float rounding, garbage.

**`tests/discGeometry.test.ts`** — new: hue at each cardinal angle, saturation
at center and rim, clamping past the rim, and round-trip
`hueSatToDiscPoint` → `discPointToHueSat`.

**`tests/colorPicker.test.tsx`** — new, jsdom + testing-library:

- Typing a hex updates the RGB and CMYK fields.
- Typing a CMYK updates the HEX field.
- An unparseable draft sets `aria-invalid` and does not change the other fields.
- Explore calls `onSample` with the RGB under the pin — including while one
  field holds an unparseable draft, which must not block it.

**Retired:** `tests/hexPicker.test.tsx`.

**Inherited unchanged:** `tests/core-purity.test.ts` covers both new core
modules; `tests/sample-privacy.test.ts` covers the new components' directory.
Neither is weakened.

## Accessibility

The brightness control is a native `<input type="range">` and the three fields
are native labelled inputs, so a complete keyboard path to any color exists
without touching the disc.

The disc additionally takes `tabIndex={0}` with an `aria-label`, and arrow keys
adjust hue (←/→, ±2°) and saturation (↑/↓, ±0.02), with Shift multiplying the
step by 5 — so the primary control is not mouse-only.

Out of scope, and already tracked: the `.cam-overlay` dialogs across the sampler
lack `aria-modal`, Escape-to-close, and a focus trap. That existing TODO item is
updated to name `ColorPicker` in place of `HexPicker` rather than being expanded
here.

## Docs contract

Per CLAUDE.md, in the same commits as the code:

- **README.md** — the sampler's source list gains the picker in place of the hex
  field.
- **PROMPTS.md** — this session's prompts verbatim, including the overlay
  reversal after seeing it live.
- **TODO.md** — remove the color-wheel item; add the Browse-page map (below);
  record the picker overlay as considered-and-rejected with its reason;
  re-point the overlay-a11y item at `ColorPicker`.
- **TODO-completed.md** — the color-wheel item with its commit hash.
- **CHANGELOG.md** — a release entry pairing the change with the owner's quoted
  prompts.

## Deferred

**Map of the book on the Browse page.** The mockup's B and D discs — all 157
colors plotted by hue and saturation, with a brightness slider that slices the
collection to the colors at that lightness. The owner:

> fwiw i did like seeing the colors pointed on the circle. i liked how you can
> plot all the points and then also points in same brightness. that would be a
> cool thing to add to the color explorer page when you're looking at all the
> raw individual colors

Sequenced as its own spec because it is a different component on a different
page with its own open questions: whether clicking a dot filters Browse, how it
interacts with the accessibility goggles, and what it does on a phone. It can
reuse `rgbToHsv` and `discGeometry` from this work.

## Non-goals

No `EyeDropper` API. No named-color lookup ("NYC orange"). No picker history or
recently-used colors. No book-color overlay on the picker disc. No new
dependencies — this is CSS gradients plus pure math, with no D3 and nothing
added to `src/viz/`.
