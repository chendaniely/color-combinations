// Loads the bundled datasets. The ONLY module that touches a data file;
// everything else goes through core queries on what is exported here.
//
// This used to read two files. It now reads seven, which is a deliberate
// amendment to the rule in CLAUDE.md rather than drift — the colour-analysis
// data was split into separate, self-describing, individually cited files so
// each one is usable on its own by someone who does not care about this site.
// The load-bearing half of the rule is unchanged: this is still the only
// module allowed to `import` a data file, and every file is schema-versioned
// and validated here, so a bad edit fails loudly at load rather than
// rendering something wrong.
import colorsRaw from '../data/processed/colors-data.json'
import sourcesRaw from '../data/reference/sources.json'
import { accessibilityProfile, allowedComboIds } from './color/accessibility'
import { fitBand } from './color/colorDistance'
import { index, type Indexed } from './core/dataset'
import {
  validatePccsGrid,
  validatePccsHues,
  validatePccsTones,
  type PccsCell,
  type PccsHue,
  type PccsTone,
} from './core/pccs'
import { validateSeasonColors, type SeasonColor } from './core/seasonColors'
import { validateSeasonRules, type SeasonRules, type ToneBands } from './core/seasons'
import { sourceIds, validateSources, type Source } from './core/sources'
import type { AccessLensId } from './core/types'
import { validateDataset } from './core/validate'

export const dataset: Indexed = index(validateDataset(colorsRaw))

/** Where every factual claim in the colour-analysis data points back to. */
export const sources: Source[] = validateSources(sourcesRaw)
const knownSourceIds = sourceIds(sources)

export interface SeasonData {
  pccsHues: PccsHue[]
  pccsTones: PccsTone[]
  pccsGrid: PccsCell[]
  seasonRules: SeasonRules
  seasonColors: SeasonColor[]
  /** Each tone's canonical position, for classifying a reading into a season. */
  toneBands: Map<string, ToneBands>
}

let pending: Promise<SeasonData> | null = null

/**
 * The colour-analysis datasets, loaded on demand.
 *
 * These are ~98 kB of JSON and ONLY the You tab uses them, so they are behind
 * a dynamic import rather than bundled into the main chunk. That is
 * `CLAUDE.md`'s fourth dependency rule — weight is paid by the feature that
 * incurs it — and it is not theoretical: importing them statically grew the
 * main bundle from 444 kB to 531 kB and pushed the browse accessibility audit
 * past its timeout, on a screen that has nothing to do with seasons.
 *
 * The dynamic `import()` stays HERE rather than in the You tab so that
 * src/data.ts remains the only module that touches a data file.
 *
 * Cached: the promise is created once, so entering the You tab twice does not
 * re-fetch or re-validate.
 */
export function loadSeasonData(): Promise<SeasonData> {
  pending ??= (async () => {
    const [gridRaw, huesRaw, tonesRaw, rulesRaw, seasonColorsRaw] = await Promise.all([
      import('../data/reference/pccs-grid.json'),
      import('../data/reference/pccs-hues.json'),
      import('../data/reference/pccs-tones.json'),
      import('../data/curated/season-rules.json'),
      import('../data/processed/season-colors.json'),
    ])

    const pccsHues = validatePccsHues(huesRaw.default, knownSourceIds)
    const pccsTones = validatePccsTones(tonesRaw.default, knownSourceIds)
    const pccsGrid = validatePccsGrid(gridRaw.default, knownSourceIds, pccsHues, pccsTones)

    // Validated against the tones that actually exist, so a rule naming a tone
    // that was renamed or removed fails here rather than producing an empty
    // palette on screen.
    const seasonRules = validateSeasonRules(
      rulesRaw.default,
      new Set(pccsTones.map((t) => t.abbr)),
      knownSourceIds,
    )

    // `fitBand` is passed in so the file's bands are checked against the same
    // thresholds the UI uses — one copy of those numbers, not two.
    const seasonColors = validateSeasonColors(
      seasonColorsRaw.default,
      new Set(seasonRules.subSeasons.map((s) => s.id)),
      new Set(dataset.data.colors.map((c) => c.id)),
      fitBand,
    )

    const toneBands = new Map<string, ToneBands>(
      pccsTones.filter((t) => t.representative).map((t) => [t.abbr, t.representative!] as const),
    )

    return { pccsHues, pccsTones, pccsGrid, seasonRules, seasonColors, toneBands }
  })()
  return pending
}

// Which accessibility lenses each combination passes — computed once at load.
export const accessProfile = accessibilityProfile(dataset)

// The combo ids passing ALL active lenses, or undefined for "no filter" (empty
// selection). One place, so every view filters identically.
export function allowedFor(access: AccessLensId[]): ReadonlySet<number> | undefined {
  return access.length ? allowedComboIds(accessProfile, access) : undefined
}
