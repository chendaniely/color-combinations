// The measured palette: score every colour in the book against the visitor's
// own numbers, by four stated rules.
//
// Each kept colour carries the sentences the page prints beside it. That
// traceability is the whole reason this method was chosen over the season
// lists — every colour can be explained from the visitor's face, and if a
// result looks wrong the constant responsible can be pointed at.
//
// Lives in src/color (not the pure core kernel) because it needs Lab.
import type { ColorRecord, ContrastBand, SkinReading } from '../core/types'
import { labOf } from './skinMetrics'

// Constants from the spec. Every one is a dial.
const WARM_AXIS = 60          // Lab hue angle of the warm pole
const TEMPERATURE_SLACK = 0.15
const MIN_SEPARATION = 15     // L* between a colour and the skin
const CHROMA_BAND: Record<ContrastBand, [number, number]> = {
  high: [22, 75],
  medium: [14, 55],
  low: [6, 38],
}
const SALLOW_HUE: [number, number] = [70, 100]
const SALLOW_CHROMA = 25
const MAUVE_HUE: [number, number] = [300, 340]
const MAUVE_CHROMA = 15

export interface Scored {
  color: ColorRecord
  keep: boolean
  reasons: string[]
  fails: string[]
}

/**
 * How warm a colour reads, from +1 (fully warm) to -1 (fully cool).
 *
 * Extracted so the scorer and the warm/cool COUNT the site quotes at visitors
 * share one implementation. They did not: the UI, the About panel and the README
 * all said "109 of its 157 colours read warm against 48 cool", and this rule
 * gives 110 and 47. Nothing computed the 109 — it was a number in prose, drifting
 * quietly. See `warmCool` in src/data.ts.
 */
export function temperatureOf(color: ColorRecord): number {
  const { h } = labOf(color.rgb)
  return Math.cos(((h - WARM_AXIS) * Math.PI) / 180)
}

/** Whether a colour sits on the warm half of the axis the scorer uses. */
export function isWarm(color: ColorRecord): boolean {
  return temperatureOf(color) > 0
}

function describeChroma(C: number): string {
  if (C > 45) return 'vivid'
  if (C < 20) return 'quiet'
  return 'moderate'
}

export function scorePalette(reading: SkinReading, colors: ColorRecord[]): Scored[] {
  const [chromaLo, chromaHi] = CHROMA_BAND[reading.contrast]
  const wantsWarm = reading.undertone === 'warm'
  const neutral = reading.undertone === 'neutral'

  return colors.map((color) => {
    const { L, C, h } = labOf(color.rgb)
    const reasons: string[] = []
    const fails: string[] = []

    // 1. Undertone agreement. +1 fully warm, -1 fully cool.
    const temperature = temperatureOf(color)
    if (neutral) {
      reasons.push('your undertone is balanced, so any temperature works')
    } else if (wantsWarm && temperature >= -TEMPERATURE_SLACK) {
      reasons.push('leans warm, the way your skin does')
    } else if (!wantsWarm && temperature <= TEMPERATURE_SLACK) {
      reasons.push('leans cool, the way your skin does')
    } else {
      fails.push('pulls the opposite temperature to your skin')
    }

    // 2. Separation from the skin, so the face never melts into the garment.
    const separation = Math.abs(L - reading.skinL)
    if (separation >= MIN_SEPARATION) {
      const direction = L < reading.skinL ? 'deeper' : 'lighter'
      reasons.push(`${direction} than your skin by ${Math.round(separation)} — your face stays distinct`)
    } else {
      fails.push(`only ${Math.round(separation)} apart from your skin — your face would melt into it`)
    }

    // 3. Chroma matched to the visitor's own contrast.
    if (C >= chromaLo && C <= chromaHi) {
      reasons.push(`${describeChroma(C)} enough for ${reading.contrast}-contrast colouring`)
    } else {
      fails.push(C > chromaHi ? 'too vivid for your colouring' : 'too washed-out for your colouring')
    }

    // 4. The sallow band — rejected for everyone, not just this visitor.
    const isSallow = (h >= SALLOW_HUE[0] && h <= SALLOW_HUE[1] && C < SALLOW_CHROMA)
      || (h >= MAUVE_HUE[0] && h <= MAUVE_HUE[1] && C < MAUVE_CHROMA)
    if (isSallow) fails.push('sits in the band that makes almost any skin look tired')

    return { color, keep: fails.length === 0, reasons, fails }
  })
}

export function measuredPalette(reading: SkinReading, colors: ColorRecord[]): ColorRecord[] {
  return scorePalette(reading, colors).filter((s) => s.keep).map((s) => s.color)
}
