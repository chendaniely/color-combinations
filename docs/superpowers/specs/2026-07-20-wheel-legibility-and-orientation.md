# Chord-wheel legibility & orientation — design

**Status:** approved (design + data-driven prototype), ready for planning.
**Date:** 2026-07-20 (Session 5)
**Prototype (before/after, real data):**
https://claude.ai/code/artifact/06e012f8-559e-4663-bdbd-a62f048822f6

## Motivation

Two independent readability problems on the main chord wheel, raised by the
owner while using it:

1. **Highlighted links to rare partners are invisible.** Ribbon *width* is set
   by `d3.chord` in proportion to how often a pair co-occurs. Hovering a color
   only changes *opacity* (`.ribbon.hot { opacity: .9 }`), never thickness, so a
   pair that appears in one combination stays a bright hairline. The owner also
   noted a real constraint: a permanently thicker line would get in the way of
   hovering the *next adjacent* color.
2. **The wheel re-orients as you slide granularity.** The three group levels
   (Shades/Families/Groups) are ordered by curated family sequence and are
   already mutually consistent, but the Colors level is ordered by pure hue, and
   the anchor at 12 o'clock is inconsistent — Families and Shades open on a pink,
   while Colors and Groups open on red. There is no stable landmark, so the wheel
   appears to re-orient as you slide granularity.

## Change A — hover legibility

Give highlighted ribbons a **stroke floor**, applied only while hovering, so the
resting layout the owner aims at never changes:

- Every ribbon carries a `stroke` equal to its own fill (source-node color),
  `stroke-width: 0` at rest.
- **Single-link (ribbon) hover:** the hovered ribbon gets a *moderate*
  stroke-width; its two endpoint arcs stay bright (unchanged behavior).
- **Color (arc / outer-rim) hover:** the hovered arc and all its ribbons get a
  *bolder* stroke-width, **and the partner arcs brighten too** (not just the
  connecting links). Boldness is safe here because the owner has already
  committed to the color — precision-aiming at a neighbor is over.

Because stroking a filled ribbon adds ~2×stroke-width to a hairline but only a
sliver to a wide ribbon, this yields **proportional width with a floor**:
frequent combos still read heavier, rare ones stop vanishing. No layout change,
no distortion, nothing gets in the way of aiming at rest.

- Arc-hover vs ribbon-hover weight is distinguished by a container state class
  (e.g. `hover-arc` / `hover-ribbon` on the wheel `<g>`), not new geometry.
- Exact stroke-width values are tuned in the browser (owner checklist), not
  asserted in tests — this is presentation.

## Change B — orientation & consistency

Decision: **family order at every level, rotated so red is at 12 o'clock.**
Rationale in the comparison below; the app is a *family*-matching tool, so
keeping the Earthy/Brown family clustered is worth more than a textbook-pure
spectrum, and the group levels are inherently a family view rather than a hue
wheel. "Red at top, spectrum clockwise" is the recognized digital standard
(CSS `conic-gradient` default, most on-screen hue rings); black-at-top — the
owner's first instinct — is not a standard and was set aside.

Two mechanics:

1. **Consistent ordering.** Re-sort the **Colors** level from pure hue to family
   order (fine-family array order, then hue within family). Neutrals are the
   last fine families, so they stay last automatically. The three group levels
   already use family order and are unchanged. Result: a color keeps its sector
   as you slide granularity (browns no longer jump from the orange sector to the
   purple-adjacent block).
2. **Rotation anchor — red to 12 o'clock.**
   - **Colors / Shades / Families:** rotate so the **Red broad-family block's
     angular center** is at top.
   - **Groups (super):** there is no Red node — red lives inside *Warm* — so
     rotate so the **reddest member's slice within the Warm arc** is at top
     (Warm members are drawn hue-sorted; the reddest is Spectrum Red, #f20000).
   The rotation is a single offset folded into the wheel group's existing
   `rotate(TILT_DEG)` transform. `d3.pointer` reads the group's full CTM, so the
   hover/snap angle math (which works in the group's local, pre-transform frame)
   stays exact — the same property the −4° wabi-sabi tilt already relies on.

### Before / after (the note)

Rendered from real data in the prototype above. Orange ▲ = 12 o'clock. The
levels that *visibly rotate* are Families and Shades (a pink currently sits at
top; red replaces it). Colors and Groups already open on red today — their
change is elsewhere (Colors re-sorts; Groups only gets the anchor pinned).

| Level | Before (top) | After (top) | What actually changes |
|---|---|---|---|
| Groups | Spectrum Red (Warm opens on red) | **Red** (reddest in Warm) | Negligible — the anchor pins what is already there (Warm is node 0; its first hue-sorted member is Spectrum Red). |
| Families | Pink | **Red** | Rotation — the Pink family moves off top so Red leads. |
| Shades | Blush Pinks | **Red** | Rotation — Blush Pinks moves off top so Red leads. |
| Colors | Spectrum Red (already red) | **Red** | Re-sort: browns leave the orange sector to join the family block; the anchor keeps red pinned. |

Neutrals were already last at every level, so the neutral block does not move.

## Architecture

Keeps the core-purity contract: layout math and ordering stay testable in the
kernel; only the rotation *application* and stroke rendering are in the viz.

- **`src/core/chord.ts`**
  - `wheelNodes(ix, 0)`: sort by `(fineFamilyIndex, hue)` instead of
    `(isNeutral, hue)`. (Removes the now-unused `isNeutral` import if nothing
    else uses it.)
  - New pure `redAnchorAngle(ix, level, groups, nodes)`: takes the laid-out
    group angles as plain `{startAngle, endAngle, index}[]` (no D3 types), returns
    the arc-angle (radians) to bring to top. Levels 0–2: Red-block center.
    Level 3: reddest-member slice within Warm.
- **`src/viz/chordRender.ts`**
  - After `d3.chord()`, call `redAnchorAngle(...)` with `layout.groups`; set the
    group transform to `rotate(TILT_DEG − anchorDeg)`.
  - Give ribbons a `stroke` = source color; on arc-hover add partner arcs to the
    hot set and mark the container `hover-arc`; on ribbon-hover mark
    `hover-ribbon`.
- **`src/styles/app.css`**
  - `.ribbon` default `stroke-width: 0`; `.hover-ribbon .ribbon.hot` moderate
    width; `.hover-arc .ribbon.hot` bolder width. Partner-arc brightening falls
    out of the enlarged hot set (no new rule needed beyond the existing
    `dimming .arc:not(.hot)`).

## Testing

- **Core unit tests (`tests/chord.test.ts`):**
  - Colors-level ordering: neutrals last, fine families in array order, hue
    ascending within a family.
  - `redAnchorAngle`: with synthetic equal-angle groups over the real dataset,
    the returned angle lands inside the Red block (levels 0–2) and inside the
    Warm arc at the reddest-member slice (level 3).
- **Owner browser checklist** (visual, not asserted): rare-partner links become
  visible on color-hover; arc-hover links are bolder than single-link hover;
  partner arcs brighten on color-hover; red sits at 12 o'clock at all four
  levels; browns cluster at the Colors level; no return of the hover flicker.
- `npx tsc --noEmit` and `make test` pass per task; existing tests stay green.

## Out of scope / deferred

Per the owner ("we can always go back to the rotation, color order, and
orientation at a later time"):

- Revisiting the anchor/ordering (e.g. RYB primary-triangle wheel, or a
  pure-hue Colors level with browns in the orange sector).
- Any change to the ribbon *resting* widths or the granularity crossfade.
- Gradient-colored highlight strokes (source→target); v1 of this uses the
  source color only.
