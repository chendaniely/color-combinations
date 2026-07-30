# PCCS season datasets — design

**Date:** 2026-07-29
**Status:** implemented in v1.7.0

## Correction, 2026-07-29 (after shipping)

**The fit-band thresholds below are in the wrong units.** The scoring section
says "Fit bands: `very close` ΔE < 5, `close` < 10, `roughly` < 20, `not
close` >= 20".

The implementation reuses the project's existing colour-difference seam,
`src/color/colorDistance.ts`, which measures Euclidean distance in OKLab — so
the real thresholds are **0.05 / 0.10 / 0.25**, not 5 / 10 / 20. That was the
right call and the spec should have said so: inventing a second notion of
"close" alongside the one the colour sampler already used would have been a
defect the moment the two drifted. `closenessLabel` keeps its three bands for
the sampler; `fitBand` adds a fourth for seasons, from the same constants.

**Also corrected after shipping:** the fit panel originally deduplicated its
rows by book colour, which hid the gap it existed to show. It now renders one
row per ideal and reports how many DISTINCT colours serve them, because across
all twelve seasons only one ideal of 142 lacks a close match — the real limit is
crowding, not absence. See `src/color/seasonFit.ts`.

## The problem

The twelve seasons on the You tab are invented. `scripts/seed-seasons.ts`
says so in its own header: the regions are Lab boxes
(`hue: [15, 95], L: [15, 58], C: [20, 70]`) with no published source, and
`data/curated/seasons.json` repeats the admission and invites correction.

Two things are wrong with that, and only one of them is "we made it up".

1. **It cannot be audited.** Nobody — not the owner, not a future agent,
   not a colour professional — can look at `L: [15, 58]` and say whether
   it is right. There is no shared vocabulary to disagree in.
2. **It overclaims by omission.** The site presents twelve seasons with
   the same confidence it presents Wada's colours, which are real.

The owner asked whether official season colours exist that we could map
onto the book instead.

## What the research found

**There is no official set of season colours.** Every colour-analysis
school sells its own swatch book; they disagree with each other; none
publish the recipe. A page titled "The Expanded Winter Colour Season
Munsell Matrix" turned out to contain no numbers at all.

**But there is a published ruleset, and it is the right one for this
book.** Korean personal-colour analysis (퍼스널컬러) is not built on the
Western swatch decks. It is built on **PCCS** — the Practical Color
Co-ordinate System, published by the **Japan Color Research Institute**
in 1964.

And the Japan Color Research Institute was founded by Sanzo Wada.

> "In 1927 Wada established the Japan Standard Color Association
> (present-day Japan Color Research Institute)"
> — Art Platform Japan (Agency for Cultural Affairs), artist record for
> 和田三造

Wada founded the association in 1927 and published *A Dictionary of Color
Combinations* in 1933–34. The institute he founded published PCCS in
1964. Korean analysts use PCCS today.

So the ruleset and the book share an ancestor. PCCS is not merely an
available system to borrow — it is the system descended from the same
work as the data this site is built on. That is the justification for
choosing it over Munsell or any American swatch deck.

## What we are building

Six datasets and one scoring rule. The seasons stop being hand-listed
colour IDs and become **computed from published rules**.

### Principle: separate, self-describing, cited

The owner's requirement, verbatim:

> "save whatever color data you have as separate datasets in the data
> folder that the site uses. this way the data in the site can be used
> and worked with independently and there is a citation / reference on
> what it is. i'd love for this to become a larger resource."

So each dataset is its own file, carries `schemaVersion`, a prose
`description`, and a `sources` array of citation IDs. None of them
require the app to be useful — someone can clone the repo and use
`pccs-tones.json` for something entirely unrelated to seasons.

This amends a standing rule in `CLAUDE.md`: *"The app reads exactly two
data files."* It will read seven — `colors-data.json` plus the six below.
The load-bearing part of that rule is unchanged and must stay unchanged:
**`src/data.ts` remains the only module allowed to `import` a data
file**, and every file is schema-versioned and validated at load.

Every dataset below carries `schemaVersion`, a prose `description`, and a
`sources` array of citation IDs. The JSON snippets show one representative
entry each, not the whole file.

### Dataset 1 — `data/reference/sources.json`

The citation registry. Every other dataset cites into it by ID, so a
source is described once.

```json
{
  "schemaVersion": 1,
  "description": "Citation registry. Other datasets reference these by id.",
  "sources": [
    {
      "id": "artplatform-wada",
      "title": "WADA Sanzō (和田三造) — Dictionary of Artists in Japan",
      "publisher": "Art Platform Japan, Agency for Cultural Affairs",
      "url": "https://artplatform.go.jp/artists/A2089",
      "accessed": "2026-07-29",
      "supports": "Wada founded the Japan Standard Color Association in 1927, today the Japan Color Research Institute."
    }
  ]
}
```

Every URL in this file must return a status a human can navigate to.
`tests/sources.test.ts` asserts the shape offline; a separate opt-in
check (`make check-links`) actually requests them, because a link that
rots must not break `make test` or CI.

Initial entries, all verified 200 on 2026-07-29:

| id | what it supports | url |
| --- | --- | --- |
| `artplatform-wada` | Wada founded the JSCA/JCRI, 1927 | `artplatform.go.jp/artists/A2089` |
| `wikipedia-wada` | Wada biography, book dates | `en.wikipedia.org/wiki/Sanzo_Wada` |
| `jcri` | the institute today | `www.jcri.jp/` |
| `jcri-history` | institute history | `www.jcri.jp/history/` |
| `shikisai101-pccs` | PCCS hue circle and tone diagram | `en.shikisai101.com/color-basic/What-is-PCCS-color-circle-tone-conceptual-diagram/` |
| `wikipedia-ja-pccs` | PCCS 24 hues, 12 tones, lightness/saturation scales | `ja.wikipedia.org/wiki/PCCS` |
| `whatcolorssuitme-korean` | Korean 퍼스널컬러 practice | `whatcolorssuitme.com/guides/korean-color-analysis/` |
| `colorme-korean` | Korean movement vs Western grid | `colorme.style/personal-color-analysis/` |
| `personalcolorai-korean-12` | Korean 12-season practice | `personalcolorai.com/blog/korean-personal-color-analysis-12-seasons` |
| `dbpia-pccs-ks` | academic PCCS/KS tone comparison | `dbpia.co.kr/journal/articleDetail?nodeId=NODE12537491` |
| `rit-munsell` | Munsell renotation (PCCS scale ancestry) | `rit.edu/science/munsell-color-science-lab-educational-resources` |
| `chromology-sciart` | Sci\ART history, the Western 12 | `chromology.co.uk/the-sciart-system/` |

Two further pages (Grokipedia's PCCS article, korochin.site) return 200 in
a browser but reject automated readers. They are usable by a human and may
be cited, with `botBlocked: true` recorded so nobody wastes time
re-testing them.

### Dataset 2 — `data/reference/pccs-hues.json`

The 24-hue circle. Sourced, no judgement.

```json
{ "n": 2, "abbr": "R", "ja": "赤", "en": "Red" }
```

All 24 entries from `wikipedia-ja-pccs`. Note that entries 14/15 and
17/18 carry repeated abbreviations in that source; the ingest script must
fail loudly rather than silently deduplicate, and the resolution gets
recorded in the file's `notes`.

### Dataset 3 — `data/reference/pccs-tones.json`

The twelve chromatic tones plus five achromatic. Each tone is a band of
lightness × saturation.

PCCS lightness runs 1.5–9.5 in 0.5 steps; saturation runs 1s–9s (0s
achromatic). Published bands: lightness low 1.5–4.0, mid 4.5–6.5, high
7.0–9.5; saturation low 1s–3s, mid 4s–6s, high 7s–8s, vivid 9s.

```json
{ "abbr": "dp", "ja": "ディープ", "en": "Deep",
  "lightness": [1.5, 4.0], "saturation": [7, 8] }
```

The twelve, laid out on the tone diagram:

| saturation | high lightness | mid lightness | low lightness |
| --- | --- | --- | --- |
| 9s | — | **v** vivid | — |
| 7–8s | **b** bright | **s** strong | **dp** deep |
| 4–6s | **lt** light | **d** dull | **dk** dark |
| 1–3s | **p** pale, **ltg** light grayish | **sf** soft, **g** grayish | **dkg** dark grayish |

**Known conflict, to be resolved during implementation.** The ja.wikipedia
extraction gives `d` (dull) and `g` (grayish) identical coordinates
(mid/4–6s), which cannot be right, and places `sf` (soft) at mid/1–3s
where the tone diagram puts it between `lt` and `d`. The structure above
is the standard tone-diagram layout and is what we implement. The ingest
script **must fail if any two tones occupy the same band**, so this class
of error cannot ship silently. Where sources genuinely disagree, the
disagreement is recorded in the file's `notes` rather than smoothed over.

### Dataset 4 — `data/reference/pccs-grid.json` (generated)

24 hues × 12 tones = 288 representative colours as hex, computed from
datasets 2 and 3.

This is **our rendering of the PCCS structure, not JCRI's chip values.**
PCCS is defined on physical paper chips; we are placing a colour at the
centre of each tone's band and converting to sRGB. The file says so in
its `description`. It exists because it is independently useful — a PCCS
hue/tone grid as hex is a thing people want and cannot easily find — and
because the season display needs a representative swatch per season.

### Dataset 5 — `data/curated/season-rules.json`

Replaces `data/curated/seasons.json`, which is deleted. This is where the
sourced part and our part are separated explicitly.

```json
{
  "parents": [
    { "id": "spring", "name": "Spring", "temperature": "warm",
      "tones": ["p", "lt", "b", "v"],
      "sourced": true, "sources": ["whatcolorssuitme-korean", "colorme-korean"] }
  ],
  "subSeasons": [
    { "id": "light-spring", "name": "Light Spring", "parent": "spring",
      "dominantTone": "lt", "sourced": false }
  ]
}
```

**The four parents are sourced.** From Korean practice:

| season | temperature | tones |
| --- | --- | --- |
| Spring | warm | p, lt, b, v |
| Summer | cool | lt, p, sf, d |
| Autumn | warm | ltg, sf, s, d, g, dp, dk, dkg |
| Winter | cool | b, v, dp, dk, dkg |

**The twelve sub-seasons are ours**, each `sourced: false`. They are the
existing twelve names, re-expressed as parent + dominant tone so they at
least sit inside the sourced structure instead of floating free.

**Warm/cool is a documented split, not a source.** Hues 3:yR–10:YG are
warm, 14:BG–21:bP are cool. The remaining eight (1:pR, 2:R, 11:yG, 12:G,
13:bG, 22:P, 23:rP, 24:RP) straddle and are assigned in the file with a
one-line reason each. This is judgement and is flagged as such.

### Dataset 6 — `data/processed/season-colors.json` (generated)

The join table the owner asked for: season → Wada colour → fit.

```json
{ "seasonId": "deep-autumn", "colorId": 82, "deltaE": 4.1, "band": "close" }
```

Generated by a script and committed, exactly as `colors-data.json` is
today. `tests/seasonColors.test.ts` regenerates it and fails on any diff,
so it cannot drift from the rules.

## The scoring rule

For each Wada colour and each season:

1. Convert the colour to Lab (culori, already a dependency).
2. Derive PCCS-equivalent lightness and saturation. **This is the one
   remaining modelling judgement** and gets documented in
   `docs/color-analysis-sources.md`: PCCS lightness is Munsell value,
   which maps to Lab L\*; PCCS saturation maps to Lab chroma, scaled so
   that 9s lands at the maximum chroma achievable at that lightness.
3. A colour is a **member** of a season if its hue falls in the season's
   temperature half and its tone is in the season's tone set.
4. Its **fit** is ΔE to the nearest cell of `pccs-grid.json` belonging to
   that season, using the existing distance seam in `src/color/`.

Fit bands: `very close` ΔE < 5, `close` < 10, `roughly` < 20, `not close`
≥ 20. These thresholds are ours; they are named in the file so they can
be argued with.

## What the visitor sees

```
Your season

  Autumn                       ← from the published rule
  └ Deep Autumn                ← our subdivision  ⓘ

  ideal          closest in Wada's book
  ██  →  ██  Mummy Brown        very close
  ██  →  ██  Olive Ocher        close
  ██  →  ██  Garnet Brown       roughly
  ██  →  ██  Dark Citrine       not close

  Wada's book has 17 colours near Deep Autumn. These are the
  nearest matches in the book, not exact season colours.
```

Both levels are shown: the sourced parent season and our sub-season, the
latter marked. The ⓘ explains which is which.

The closing sentence is required, not decorative. It is the honest
framing the owner asked for:

> "we should also be clear that this is doing the closet match to the
> color pallets in the book, so things will not map 100% and is the
> closst color for a given season. i think that's fair."

### Why the caveat is load-bearing

Measured on 2026-07-29 against the real book: median chroma C\* 52.7, with
83 of 157 colours above C\* 50. Only **13 colours** fall below C\* 20, and
two of those are pure white and black — so **eleven usable muted colours**
for the four seasons that are *defined* by mutedness.

The current shipped data already fails on this. `soft-autumn` is labelled
`chroma: low` and has median C\* 36.8; `light-spring` is labelled low and
has median C\* 39.3. Neither palette is muted. A visitor told they are a
Soft Autumn is currently handed mid-chroma colours under a "muted"
heading.

Better matching does not fix this — it makes it *visible*. Nearest-
neighbour always returns something; for Soft Summer it returns the
least-vivid vivid colours in the book. Showing the fit is what turns that
from a silent lie into the interesting part.

## Provenance document

New file `docs/color-analysis-sources.md`: the Wada → Japan Standard
Color Association (1927) → Japan Color Research Institute → PCCS (1964) →
Korean 퍼스널컬러 chain, with the verified links, the exact `go.jp` quote,
and a plain statement of which parts of our system are sourced and which
are ours. The owner's reason for wanting it:

> "i'd love for this to become a larger resource... this has me wanting
> to do more research into PCCS and that entire chain of work."

## Testing

- `tests/pccsTones.test.ts` — no two tones share a band; every tone's
  ranges lie inside the published scales.
- `tests/pccsHues.test.ts` — 24 hues, numbering 1–24, no gaps.
- `tests/seasonRules.test.ts` — every parent cites a source; every
  sub-season has `sourced: false`; every tone referenced exists; every
  sub-season's parent exists.
- `tests/seasonColors.test.ts` — regenerating the join table produces no
  diff; every season has at least one member; every colour ID resolves.
- `tests/sources.test.ts` — every `sources` ID referenced by any dataset
  exists in the registry; every entry has a URL, publisher and `supports`
  line. Offline.
- `make check-links` — opt-in, hits the network, not part of `make test`
  or CI.
- Existing `tests/core-purity.test.ts` must stay green: the scoring rule
  uses culori and therefore belongs in `src/color/`, not `src/core/`.

## Documentation the contract requires

`CLAUDE.md`'s documentation contract makes these part of the same commit,
not follow-up work:

- **`CLAUDE.md`** — amend "exactly two data files" to seven, keeping the
  `src/data.ts`-only-importer rule intact and stating why the count grew.
  Amend the `seasons.json` paragraph, which describes a file this design
  deletes. Record that the season palettes are now derived, not curated.
- **`README.md`** — a section on the datasets, written for a non-JS
  reader: what each file is, where it came from, and that they are usable
  on their own.
- **`CHANGELOG.md`** — a release entry paired with the owner's guiding
  prompts, per the standing framing rule.
- **`PROMPTS.md`** — the owner's prompts from this session, verbatim,
  including the "blind leading the blind" exchange that redirected the
  design from examples to rules. That redirection is the reason the
  design is any good and belongs in the record.
- **`TODO.md`** — the lens dropdown, deferred here.
- **`docs/color-analysis-sources.md`** — new, described above.

## Explicitly out of scope

- **The lens dropdown.** The owner chose "dataset + fit, lens-ready".
  Schemas are designed so a site-wide season filter can be added later
  without a rewrite; it is not built here.
- **Swapping the corpus.** Wada's combinations stay. The owner:
  *"i do agree we don't want to swap out the combinations for the site.
  it's the combinations that make this dataset + website unique."*
- **Vendoring the Munsell renotation data.** PCCS gives us what we need;
  `rit-munsell` is cited for the scale ancestry only. Revisit if the
  lightness/saturation conversion turns out to need real chip data.
