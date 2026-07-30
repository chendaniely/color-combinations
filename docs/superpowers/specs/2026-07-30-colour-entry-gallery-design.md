# The colour-entry gallery — design

**Date:** 2026-07-30
**Status:** shipped in v1.9.0 (2026-07-30), as designed. The one thing to know
that this document could not: the header button needed a layout fix after the
fact — sized for a bare glyph, it clipped the new label to "SAMP" — and the
inline gallery needed two columns rather than one. Neither is visible to a test.

## The problem

**Match > Colors is a dead end.** Levels 1 and 2 render a `ShadePicker` — a real
way in. Level 0 renders a sentence:

> "Search a color name above, or snap a color with the camera — exact colors land
> here."

It points at affordances somewhere else. The owner:

> it only really populates after i come from the you page > browse a color. but
> on its own there's no way to get to a similar page. which is why i opted to
> fill it with some cards of other ways to get in a color

**And the best way in is hidden behind a pencil.** The header button that opens
the sampler carries a pencil glyph, which means *edit*. Its accessible name is
already "Sample a color from a photo or hex", so the icon contradicts the label.
The owner:

> i think people will better grivitate to a camera knowing it's for a picture …
> the options under the pencil aren't that visable to the user and i want more
> ways to show that there is a camera option avaiable

## What already exists

Worth stating, because most of this is wiring rather than new UI.

- `ColorSampler` is a state machine: a **card list** (Camera / Upload / Pick) →
  the chosen capture UI → `ColorMatches`.
- `ColorMatches` is the **hub**: nearest book colours, then Color / Shade /
  Family, then Match or Browse.

The cards and the hub are both right. They are simply trapped inside an overlay
behind one bad icon.

## The design

### One gallery component, used in more than one place

`src/components/sample/ColorEntry.tsx` — the card list, extracted from
`ColorSampler` and made presentational. Props: `onPick(source)`, and which
sources to offer. `ColorSampler` renders it inside its overlay exactly as now;
Match > Colors renders it inline.

Four cards, same order and icons everywhere:

| Card | What it does |
| --- | --- |
| 🔍 **Search by name** | Focuses the header search box |
| 📷 **Camera** | Opens `ColorCapture` |
| 🖼 **Upload a photo** | Opens `ImagePicker` |
| 🎨 **Pick a colour** | Opens `ColorPicker` (wheel, hex, RGB, CMYK) |

The camera therefore appears in two places instead of hiding in one.

**Search focuses the header input rather than duplicating it.** A second search
box would be two things to keep in step, and pointing at the permanent one
teaches where it lives. It is the only card that does not open an overlay, and
that asymmetry is deliberate.

### Match > Colors renders the gallery

Replaces the sentence. Picking a card opens `ColorSampler` already set to that
source, so the flow is identical to the header route and lands in the same hub.
`ColorSampler` gains an optional `initialSource`.

### The icon becomes a camera, with a visible label

The pencil is replaced by a camera glyph **and a visible text label**. A bare
icon is undiscoverable whatever the glyph — the label does most of the work, and
the camera is then an honest hint at the most eye-catching option rather than a
promise the menu breaks.

## What this design does NOT do, and why

- **The default Match level stays Shades.** Colors has 157 options against 23;
  Shades has a working picker and is a better first choice in a builder that
  narrows. The dead end was the problem, not the default. Changing it was
  considered and rejected.
- **No "By season" card yet.** It belongs in this gallery eventually, but
  `ColorMatches` takes a single sampled RGB, not a palette, so a season card
  would bypass the hub and feed Browse's palette filter directly. That is a
  different path and belongs with the Browse season-filter work, not here.
- **Browse's empty state does not get the gallery yet.** The component is built
  to allow it; putting it in one place first keeps this change reviewable.

## Testing

- `tests/colorEntry.test.tsx` — the gallery renders every card it is given,
  reports the pick, and omits Camera where the device has none.
- `tests/browser/colourEntry.spec.ts` — Match > Colors is no longer a dead end:
  every card is reachable and each opens the right screen; the header button
  carries a visible label; the camera is present in both places.
- Existing suites must stay green, particularly the a11y audit (Match with a
  palette is an audited screen and this changes its empty state) and the
  phone-width sweep.

## Documentation

`CLAUDE.md` gains the rule that ways-in live in one component; `README.md`
describes the gallery; `CHANGELOG.md`, `PROMPTS.md`, `TODO.md` and
`TODO-completed.md` as usual.
