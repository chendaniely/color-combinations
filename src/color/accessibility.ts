// The accessibility SEAM — the ONLY place that decides whether a combination
// passes each accessibility "lens". Uses culori: wcagContrast for luminance
// contrast (Web text-ready / Print & B&W safe) and OKLab distance under CVD
// simulation for Color-blind safe. Lives in src/color (not the pure core
// kernel) because it imports culori. The three thresholds below are the tuning
// knobs — change them here and nothing downstream changes.
import {
  differenceEuclidean,
  filterDeficiencyDeuter,
  filterDeficiencyProt,
  wcagContrast,
} from 'culori'
import { displayableCombinations, type Indexed } from '../core/dataset'
import type { AccessLensId } from '../core/types'

export const WCAG_AA_TEXT = 4.5   // AA normal-text contrast ratio
export const WCAG_NONTEXT = 3     // non-text / graphical contrast ratio
export const CVD_THRESHOLD = 0.10 // min OKLab distance under CVD simulation

const oklab = differenceEuclidean('oklab')
const simProt = filterDeficiencyProt(1)
const simDeuter = filterDeficiencyDeuter(1)

function pairs(hexes: string[]): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) out.push([hexes[i], hexes[j]])
  }
  return out
}

// At least one pair reads as text-on-background (max pairwise contrast).
function webTextReady(hexes: string[]): boolean {
  return pairs(hexes).some(([a, b]) => wcagContrast(a, b) >= WCAG_AA_TEXT)
}

// Every pair stays apart in grayscale = survives a B&W photocopy (min pair).
function printBwSafe(hexes: string[]): boolean {
  return pairs(hexes).every(([a, b]) => wcagContrast(a, b) >= WCAG_NONTEXT)
}

// Every pair stays perceptually apart under protanopia AND deuteranopia.
function colorBlindSafe(hexes: string[]): boolean {
  return pairs(hexes).every(([a, b]) =>
    oklab(simProt(a), simProt(b)) >= CVD_THRESHOLD &&
    oklab(simDeuter(a), simDeuter(b)) >= CVD_THRESHOLD)
}

export interface Lens {
  id: AccessLensId
  label: string
  description: string
  passes: (hexes: string[]) => boolean
}

export const LENSES: Lens[] = [
  {
    id: 'web-text', label: 'Web text-ready',
    description: 'At least one pair works as readable text on a background (WCAG AA, 4.5:1).',
    passes: webTextReady,
  },
  {
    id: 'print-bw', label: 'Print & B&W safe',
    description: 'Every color stays tellable apart in grayscale or a photocopy (3:1).',
    passes: printBwSafe,
  },
  {
    id: 'colorblind', label: 'Color-blind safe',
    description: 'Colors stay distinct for red-green color blindness.',
    passes: colorBlindSafe,
  },
]

// Which lenses each displayable combination passes — computed ONCE from the
// loaded dataset (see src/data.ts). Downstream filtering is O(1) lookups.
export function accessibilityProfile(ix: Indexed): Map<number, Set<AccessLensId>> {
  const profile = new Map<number, Set<AccessLensId>>()
  for (const combo of displayableCombinations(ix)) {
    const hexes = combo.colorIds.map((id) => ix.colorById.get(id)!.hex)
    const passed = new Set<AccessLensId>()
    for (const lens of LENSES) if (lens.passes(hexes)) passed.add(lens.id)
    profile.set(combo.id, passed)
  }
  return profile
}

// AND semantics: the combo ids passing EVERY active lens. Callers pass a
// NON-empty `active`; an empty selection means "no filter" and is handled by
// the caller (see allowedFor in src/data.ts) — do not call this with [].
export function allowedComboIds(
  profile: Map<number, Set<AccessLensId>>,
  active: AccessLensId[],
): Set<number> {
  const out = new Set<number>()
  for (const [comboId, passed] of profile) {
    if (active.every((id) => passed.has(id))) out.add(comboId)
  }
  return out
}
