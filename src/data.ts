// Loads the bundled processed dataset. The ONLY module that touches the
// data file; everything else goes through core queries on `dataset`.
import curatedSeasons from '../data/curated/seasons.json'
import processed from '../data/processed/colors-data.json'
import { accessibilityProfile, allowedComboIds } from './color/accessibility'
import { index, type Indexed } from './core/dataset'
import { validateSeasons, type Season } from './core/seasons'
import type { AccessLensId } from './core/types'
import { validateDataset } from './core/validate'

export const dataset: Indexed = index(validateDataset(processed))

// The hand-curated season palettes, validated against the colours that ACTUALLY
// exist — so a bad hand-edit fails loudly here and in the test suite rather than
// rendering a broken palette. `data/processed/` is generated and must never be
// hand-edited; `data/curated/` is authored by hand and never generated.
export const seasons: Season[] = validateSeasons(
  curatedSeasons,
  new Set(dataset.data.colors.map((c) => c.id)),
)

// Which accessibility lenses each combination passes — computed once at load.
export const accessProfile = accessibilityProfile(dataset)

// The combo ids passing ALL active lenses, or undefined for "no filter" (empty
// selection). One place, so every view filters identically.
export function allowedFor(access: AccessLensId[]): ReadonlySet<number> | undefined {
  return access.length ? allowedComboIds(accessProfile, access) : undefined
}
