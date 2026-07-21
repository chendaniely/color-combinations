// Loads the bundled processed dataset. The ONLY module that touches the
// data file; everything else goes through core queries on `dataset`.
import processed from '../data/processed/colors-data.json'
import { accessibilityProfile, allowedComboIds } from './color/accessibility'
import { index, type Indexed } from './core/dataset'
import type { AccessLensId } from './core/types'
import { validateDataset } from './core/validate'

export const dataset: Indexed = index(validateDataset(processed))

// Which accessibility lenses each combination passes — computed once at load.
export const accessProfile = accessibilityProfile(dataset)

// The combo ids passing ALL active lenses, or undefined for "no filter" (empty
// selection). One place, so every view filters identically.
export function allowedFor(access: AccessLensId[]): ReadonlySet<number> | undefined {
  return access.length ? allowedComboIds(accessProfile, access) : undefined
}
