# Where the season colours come from

*Written 2026-07-29. Every link below was verified with `make check-links`
on that date.*

This site's season palettes used to be invented. This document explains
what replaced them, what is now sourced, and what is still ours — because
the difference matters and is easy to lose.

## The short version

There is **no official set of season colours**. There is a **published
ruleset**, and it turns out to descend from the same man who made this
book.

## The chain

**1883–1967 — Sanzo Wada.** Painter, colour researcher, film art
director. Won the 1954 Academy Award for Best Costume Design for *Gate
of Hell*.

**1927 — He founds the Japan Standard Color Association.** From the
Agency for Cultural Affairs' artist record, quoted exactly:

> "In 1927 Wada established the Japan Standard Color Association
> (present-day Japan Color Research Institute)"

**1933–34 — He publishes the colour combinations.** Reprinted by
Seigensha in 2010 as *A Dictionary of Color Combinations*. This is the
book the whole site is built on: 157 colours, 348 combinations.

**1964 — The institute publishes PCCS.** The Practical Color
Co-ordinate System: 24 hues, 12 tones, each tone a defined region of
lightness × saturation. Its lightness scale is Munsell value, from the
1943 Newhall–Judd–Nickerson renotation.

**Today — Korean personal colour analysis (퍼스널컬러) runs on PCCS.**
Not on the Western swatch decks. A season is a temperature half of the
PCCS hue circle plus a set of PCCS tones.

So the ruleset and the corpus share an ancestor. That is why this site
uses PCCS rather than Munsell directly or an American swatch book: PCCS
is the system descended from the same work as the data.

## What we looked for first, and did not find

The obvious approach was to find official season colours and match them
to the book. They do not exist.

Every colour-analysis school sells its own swatch book — House of
Colour, 12 Blueprints, Chrysalis, PrismXII, and the commercial packs
sold online. Their hex values disagree with each other. None publish the
recipe. A page titled *"The Expanded Winter Colour Season Munsell
Matrix"* contained no numbers at all: qualitative prose, a placeholder
where the matrix should be, and no cited source.

The Western twelve-season vocabulary comes from Kathryn Kalisz's Sci\ART,
codified around 2000–01 while she worked at the Munsell Institute. She
framed the seasons in Munsell hue/value/chroma terms. That framing is
public; the swatch lists built on it are products.

## What is sourced, and what is ours

| Thing | Where it comes from |
| --- | --- |
| The 24-hue PCCS circle | **Sourced** — Japan Color Research Institute |
| The 12 PCCS tones and their lightness/saturation bands | **Sourced** — same |
| The four parent seasons (temperature half + tone set) | **Sourced** — Korean personal-colour practice |
| Closing the gaps between published tone bands | **Ours** |
| Each tone's canonical position (`representative`) | **Ours** |
| The twelve sub-seasons | **Ours** |
| The warm/cool split of the hue circle | **Ours** |
| The Lab ↔ PCCS conversion | **Ours** |
| Which of Wada's colours land in a season | **Computed** from the above |

The site shows both levels and marks which is which. `season-rules.json`
carries `sourced: true` on every parent and `sourced: false` on every
sub-season, and the validator rejects the file if either flips.

## The conversion, and why it is a judgement

PCCS was defined on physical paper chips measured under illuminant C.
Wada's colours reach us as sRGB hex on a screen. Nothing published maps
one onto the other, so `src/color/pccsMap.ts` chooses a mapping. Three
decisions:

**Lightness.** PCCS lightness is Munsell value, and Munsell value tracks
CIE L\* closely enough that `V ≈ L*/10` is the standard working
approximation. Clamped into the published 1.5–9.5 range.

**Saturation.** PCCS saturation is *not* raw chroma — `9s` means "the
pure colour", the most saturated version available at that lightness and
hue. So it is normalised against the gamut maximum. Without this a pale
pink could never read as anything but dull, and the Pale and Light tones
would be unreachable, quietly emptying half the seasons.

**Hue.** The PCCS circle is spaced perceptually, not evenly in Lab. Even
spacing was tried first and put yellow on step 6 instead of the published
step 8 — the red-to-yellow arc spans six PCCS steps but only about 63° of
Lab. So the mapping interpolates between the four psychological primaries
the circle is built from: red 2, yellow 8, green 12, blue 17. Those
primaries are properly the *unique hues*, which the sRGB primaries only
approximate; using sRGB keeps the mapping recomputable from the file
alone, at some cost in the blue-green region. That is the weakest of the
three decisions and the first thing to revisit.

## Why the site says "nearest matches, not season colours"

Because it is true, and measurably so. Measured against the book on
2026-07-29:

- Median chroma **C\* 52.7**; **83 of 157** colours above C\* 50.
- Only **13** colours below C\* 20 — and two are pure white and black.
  **Eleven usable muted colours.**
- Warm 105, cool 52. The blue sector (hue 180–270°) holds **9 of 157**.

Wada's is a saturated pigment book from 1933. Four of the twelve seasons
are *defined* by mutedness and are sharing those eleven colours.
Nearest-neighbour always returns something, so a season the book cannot
serve would otherwise look exactly as confident as one it serves well.
Clear Winter gets **1** very-close match against **25** not-close.

Showing the gap is better than hiding it, and it is the more interesting
fact anyway: this is a site about what a 1933 pigment book can and cannot
tell you about your face.

## The datasets

All under `data/`, each schema-versioned, self-describing and citing
`sources.json` by id. Usable on their own — none of them need this site.

| File | What it is |
| --- | --- |
| `reference/sources.json` | The citation registry everything else points into |
| `reference/pccs-hues.json` | The 24-hue circle, with Japanese and English names |
| `reference/pccs-tones.json` | The 12 chromatic + 5 achromatic tones and their bands |
| `reference/pccs-grid.json` | 24 × 12 = 288 colours as hex — **our rendering**, not JCRI chip values |
| `curated/season-rules.json` | The rules: 4 sourced parents, 12 sub-seasons marked ours |
| `processed/season-colors.json` | Season → colour → fit. Generated; a test fails if it drifts |

`pccs-grid.json` is worth knowing about on its own: a PCCS hue/tone grid
as hex is hard to find. It is computed from the published band
definitions through the mapping above, so expect it to be close to a real
PCCS colour card rather than identical.

## Sources

Verified 2026-07-29. Two are marked as rejecting automated readers —
they open fine in a browser.

- [WADA Sanzō — Dictionary of Artists in Japan](https://artplatform.go.jp/artists/A2089) · Agency for Cultural Affairs — the 1927 founding
- [Sanzo Wada](https://en.wikipedia.org/wiki/Sanzo_Wada) · Wikipedia — biography, book dates
- [Japan Color Research Institute](https://www.jcri.jp/) and its [history page](https://www.jcri.jp/history/)
- [What is PCCS (Hue Circle, Tone Diagram)](https://en.shikisai101.com/color-basic/What-is-PCCS-color-circle-tone-conceptual-diagram/) · Shikisai 101
- [PCCS](https://ja.wikipedia.org/wiki/PCCS) · Japanese Wikipedia — the 24 hues and 12 tones
- [Korean Color Analysis (퍼스널컬러)](https://whatcolorssuitme.com/guides/korean-color-analysis/)
- [Personal Color Analysis: The Korean Movement and the Western 12-Season Grid](https://colorme.style/personal-color-analysis/)
- [How Korean 12-Season Color Analysis Works](https://personalcolorai.com/blog/korean-personal-color-analysis-12-seasons)
- [PCCS·KS 톤에 대한 색채 인식 비교 연구](https://www.dbpia.co.kr/journal/articleDetail?nodeId=NODE12537491) · Journal of the Korean Society of Design Culture
- [Munsell Renotation Data](https://www.rit.edu/science/munsell-color-science-lab-educational-resources) · RIT Munsell Color Science Laboratory
- [The Sci\ART™ System](https://chromology.co.uk/the-sciart-system/) · Chromology *(rejects robots)*
- [Sci\ART: A Brief Introduction](https://stylesyntax.com/blog/color-diy/why-sciartintroduction/) · Style Syntax
- [Practical Color Coordinate System](https://grokipedia.com/page/practical_color_coordinate_system) · Grokipedia *(rejects robots)*

## A correction worth recording

`data/curated/seasons.json`, deleted by this change, said of its own
palettes:

> "These twelve palettes have NO published source. They were seeded from
> hue/lightness/chroma regions we invented … Correcting them against a
> real source is a welcome change and needs no code."

That invitation is what this document answers. The old file was honest
about being invented; it was still invented. Keeping the admission
quoted here rather than deleting it with the file is the point of the
provenance rule in `CLAUDE.md`.
