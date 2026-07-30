# UI/UX skill audit — 2026-07-30

**A spike, not a release.** Branch `spike/ui-ux-review`, in a worktree, so it can
be reviewed or thrown away without touching `main`.

The owner installed three design skills (`frontend-design`, `ui-ux-pro-max`,
`taste-skill`) and asked whether they would find improvements to this site. This
records what they found, what was implemented, and — at least as importantly —
**which of their rules were rejected and why**.

## The headline: most of what these skills say does not apply here

They are tuned for **greenfield marketing and landing pages**. `taste-skill`
says so itself: its Section 13 lists "dense product UI" as out of scope. This
site is a reference tool with a documented visual brief, six releases of
accessibility work, and a `CLAUDE.md` that pins the aesthetic.

Their own escape hatches agree. `frontend-design`: *"Where the brief pins down a
visual direction, follow it exactly — the brief's own words always win."*
`taste-skill` §11 distinguishes "redesign — preserve" from "overhaul" and says
preserve mode keeps brand tokens, IA and copy voice.

So this was run as **redesign — preserve**. Design read: *a reference tool for
people choosing colours, with an established japandi/wabi-sabi language, where
the content IS colour and the job is to stop the chrome competing with it.*

### Rules explicitly rejected

| Rule | Why it does not apply |
| --- | --- |
| "Serif is very discouraged as default" (`taste-skill` §4.1) | The brief names EB Garamond. The skill's own override covers a brief that names a serif. |
| "Premium-consumer palette ban: warm cream backgrounds, ochre accents" (§4.2) | The palette is derived from a 1933 Japanese colour book and is the subject, not a default reach. Same override clause. |
| "Zero em-dashes anywhere" (§9.G) | A house-style preference, not a defect. This site's voice uses them throughout, in copy the owner has approved release by release. |
| "No version footers on marketing pages" (§9.F) | The corner version badge was an explicit owner request in v1.8.3. |
| "Use Tailwind v4 / Motion / Phosphor icons" (§3) | Direct conflict with the dependency rules. Four properties in `CLAUDE.md` govern what may be added; none of these clears them, and none is needed. |
| "Every page needs real images" (§4.8) | The images here are 348 colour plates, generated from the data. |
| "Min touch target 44×44" (`ui-ux-pro-max` priority 2) | The site targets WCAG 2.2's 24×24, already enforced in `tests/browser/mobile.spec.ts`. Raising it is a real option but it is a design decision with layout cost, not a defect. |

Left as a **genuine open question**, not implemented: the entry-gallery cards use
emoji as icons (🔍 📷 🖼 🎨), which `ui-ux-pro-max` lists as an anti-pattern
("SVG icons, no emoji"). The alternatives conflict with each other — `taste-skill`
forbids hand-rolled SVG, and an icon library is a new dependency. Worth a decision
rather than a silent change.

## What was implemented

### 1. Browse on a phone was more than half chrome

**The finding.** At 390×844 the first colour plate landed at **y=471** — past the
halfway line. The cause was precise: `.browse-filters` carried an unconditional
`padding-right: 10rem` to clear the floating accessibility goggles. At 390px wide
that reserve is **41% of the screen**, so each `<select>` wrapped onto a row of
its own and the filter bar stood **157.75px** tall.

**The fix.** Reserve the width only where there is width to spare. On a phone,
break the line after the size pills instead: the pills are narrow enough to sit
beside the goggles, and the selects get a clean full-width row underneath.

**Measured:** filter bar 157.75px → **97px**; first plate y=471 → **y=410**, now
in the top half of the screen. Three plates visible on load instead of one and a
half.

**A wrong turn worth recording.** The first attempt simply dropped the reserve at
phone width. The bar halved exactly as intended — and the goggles came down on
top of the family select. It passed every test I had written, because those
tests measured *height* and *padding*. A screenshot found it in seconds. The
overlap check that now exists runs at **both** widths.

`tests/browser/browseDensity.spec.ts` pins all of it, and each assertion was
verified to fail against the original CSS.

### 2. The You tab had six ways of saying "note", and they all looked the same

**The finding.** Six differently-named classes draw the same device — a 2px
coloured rule down the left of small muted prose: `.you-privacy`, `.you-note`,
`.shared-season`, `.you-provenance`, `.fit-caveat`, and the goggles note. Three
of them stack consecutively near the top of the You tab. When every block is
emphasised, the emphasis stops meaning anything.

**The fix.** One block is not a notice at all. `.you-provenance` is a **source
citation**, and sources are set apart by a rule *above* and quiet type, not by an
alert stripe down the side. It now reads as a citation, which leaves the left
rule to the two blocks that really are notices — the privacy promise and the
shared-link explainer — and gives the device its meaning back.

Nothing was deleted. Every word still renders; `CLAUDE.md` is explicit that the
provenance is never hidden behind a disclosure.

### 3. The heading levels ran h1 → h4 → h2

**The finding.** "What the book has for *Deep Autumn*" was an `<h4>` sitting
between an `<h1>` and an `<h2>`. That skips two levels going down and jumps back
up, so a screen reader hears a sub-sub-section where a peer section is.

The nine-screen axe audit never caught it because `heading-order` is one of axe's
**best-practice** rules and `a11y.spec.ts` is scoped to WCAG 2.1 A/AA. That
scoping is a deliberate, documented choice, so the gap is real rather than a bug
in the suite.

**The fix.** It is an `<h2>`, styled to match `.you-combos h2`. The fit panel and
"Combinations" **are** peers — two top-level things the page says about a palette
— and they now read as peers.

## Found, not implemented

Each is a design decision rather than a defect, so each is the owner's call.

1. **Match > Shades under-uses colour.** On a 1440px screen, each shade occupies
   a 690px-wide row in which the colour itself is a **56×20px** chip. The rest is
   empty. On a site where the colour is the content, the content is the smallest
   thing in the row. This is the biggest single visual opportunity found.
2. **The wheel has no orientation.** A first-time visitor meets an abstract chord
   diagram; the only explanation is a 0.75rem italic line at the *bottom* of the
   page, the smallest text on screen. The wheel itself is genuinely the site's
   signature and needs no defending — the copy around it does.
3. **The You page is a 3054px single column in a 1440px window**, two-thirds of
   which is empty. Its two long lists are candidates for a two-column desktop
   layout.
4. **Plate caption baselines are ragged** wherever a colour name wraps to two
   lines, because the `No.` label and the name are set on different baselines.
5. **The accessibility goggles overlap the You tab heading at phone width.**
   Already in `TODO.md` next to the existing note about that control.

## Verification

`npx oxlint` clean, **875** unit tests, **110** browser tests, all passing, plus
the four new ones. Every new assertion was checked against the original CSS to
confirm it fails there — the guards guard something.
